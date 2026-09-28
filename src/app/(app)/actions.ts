'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/lib/auth'
import { getPlanHistory, getProfile } from '@/lib/data'
import { isValidISODate, isValidTimeZone, todayIn } from '@/lib/dates'
import { GOALS, REST, getSplit, targetFor, type Goal, type Split, type WeightUnit } from '@/lib/splits'
import { createClient } from '@/lib/supabase/server'
import { planFor, scheduledDay, trackingStart, type Plan } from '@/lib/training'
import { toKg } from '@/lib/units'

// Every action re-checks the session and validates its input: server actions
// are public endpoints, whatever the UI allows. Row level security backs this up.

export type ActionResult = { error?: string }

const SIGNED_OUT: ActionResult = { error: 'Your session has expired. Please sign in again.' }
const FAILED: ActionResult = { error: 'Something went wrong. Please try again.' }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Supabase = Awaited<ReturnType<typeof createClient>>

function isGoal(value: unknown): value is Goal {
  return GOALS.some((goal) => goal.id === value)
}

function isUnit(value: unknown): value is WeightUnit {
  return value === 'kg' || value === 'lbs'
}

/** Throws on a Supabase error so each action can bail out in one place. */
function must<T extends { error: unknown }>(result: T): T {
  if (result.error) throw result.error
  return result
}

function done(): ActionResult {
  revalidatePath('/', 'layout')
  return {}
}

/** The signed-in user with their profile and split history, or null. */
async function loadContext() {
  const user = await getCurrentUser()
  if (!user) return null
  const [profile, history] = await Promise.all([getProfile(user.id), getPlanHistory(user.id)])
  if (!profile || history.timeline.length === 0) return null
  const today = todayIn(profile.timezone)
  return { userId: user.id, profile, history, today, current: planFor(history, today)!, supabase: await createClient() }
}

type Context = NonNullable<Awaited<ReturnType<typeof loadContext>>>

/** Days can be recorded from the day the user started up to today. */
function isRecordableDate(context: Context, date: unknown): date is string {
  return isValidISODate(date) && date >= trackingStart(context.history)! && date <= context.today
}

// ---------------------------------------------------------------------------
// Building splits
// ---------------------------------------------------------------------------

/** Finds or creates the user's exercises by name. Returns name → id. */
async function ensureExercises(supabase: Supabase, userId: string, names: string[]) {
  const unique = [...new Set(names)]
  must(
    await supabase
      .from('exercises')
      .upsert(
        unique.map((name) => ({ user_id: userId, name })),
        { onConflict: 'user_id,name', ignoreDuplicates: true }
      )
  )
  const { data } = must(await supabase.from('exercises').select('id, name').eq('user_id', userId).in('name', unique))
  return new Map((data ?? []).map((exercise) => [exercise.name as string, exercise.id as string]))
}

/** Copies a built-in split into the user's tables. It isn't active until activateSplit runs. */
async function createSplitFromTemplate(supabase: Supabase, userId: string, template: Split, goal: Goal) {
  const exerciseIds = await ensureExercises(
    supabase,
    userId,
    template.workouts.flatMap((workout) => workout.exercises.map((exercise) => exercise.name))
  )
  const { data: split } = must(
    await supabase
      .from('splits')
      .insert({ user_id: userId, name: template.name, template_key: template.id })
      .select('id')
      .single()
  )
  const { data: days } = must(
    await supabase
      .from('split_days')
      .insert(template.workouts.map((workout, position) => ({ split_id: split!.id, name: workout.name, position })))
      .select('id, position')
  )
  const dayIds = new Map(
    template.workouts.map((workout, position) => [workout.key, days!.find((day) => day.position === position)!.id])
  )

  must(
    await supabase.from('split_day_exercises').insert(
      template.workouts.flatMap((workout) =>
        workout.exercises.map((exercise, position) => {
          const target = targetFor(exercise, workout, goal)
          return {
            split_day_id: dayIds.get(workout.key),
            exercise_id: exerciseIds.get(exercise.name),
            position,
            target_sets: target.sets,
            target_reps: target.reps,
          }
        })
      )
    )
  )
  // Templates list the week Monday first; split_day_schedule uses 0 = Sunday.
  must(
    await supabase.from('split_day_schedule').insert(
      template.schedule.flatMap((key, mondayIndex) =>
        key === REST ? [] : [{ split_day_id: dayIds.get(key), weekday: (mondayIndex + 1) % 7 }]
      )
    )
  )
  return split!.id as string
}

/** Copies a split with a new weekly schedule. `schedule[weekday]` is a day id or null for rest. */
async function copySplit(supabase: Supabase, userId: string, plan: Plan, schedule: (string | null)[]) {
  const { data: split } = must(
    await supabase
      .from('splits')
      .insert({ user_id: userId, name: plan.name, template_key: plan.templateKey })
      .select('id')
      .single()
  )
  const { data: days } = must(
    await supabase
      .from('split_days')
      .insert(plan.days.map((day) => ({ split_id: split!.id, name: day.name, position: day.position })))
      .select('id, position')
  )
  const newIds = new Map(plan.days.map((day) => [day.id, days!.find((copy) => copy.position === day.position)!.id]))

  const exercises = plan.days.flatMap((day) =>
    day.exercises.map((exercise) => ({
      split_day_id: newIds.get(day.id),
      exercise_id: exercise.exerciseId,
      position: exercise.position,
      target_sets: exercise.targetSets,
      target_reps: exercise.targetReps,
    }))
  )
  if (exercises.length > 0) must(await supabase.from('split_day_exercises').insert(exercises))
  must(
    await supabase
      .from('split_day_schedule')
      .insert(schedule.flatMap((dayId, weekday) => (dayId ? [{ split_day_id: newIds.get(dayId), weekday }] : [])))
  )
  return split!.id as string
}

/**
 * Makes a split take effect today. Earlier days keep the split they had. A
 * split that also started today is replaced outright.
 */
async function activateSplit(context: Pick<Context, 'supabase' | 'userId' | 'today'> & { current?: Plan }, splitId: string) {
  const { supabase, userId, today, current } = context
  must(await supabase.from('splits').update({ active_from: today }).eq('id', splitId))
  if (current && current.activeFrom === today && current.id !== splitId) {
    must(await supabase.from('splits').update({ active_from: null }).eq('id', current.id))
  }
  must(await supabase.from('profiles').update({ active_split_id: splitId }).eq('id', userId))
}

/** Target sets and reps for a split built from a template, for the given goal. */
function targetRows(plan: Plan, goal: Goal) {
  const template = getSplit(plan.templateKey)
  if (!template) return []
  return plan.days.flatMap((day) => {
    const workout = template.workouts[day.position]
    if (!workout || workout.name !== day.name) return []
    return day.exercises.flatMap((exercise) => {
      const match = workout.exercises.find((candidate) => candidate.name === exercise.name)
      if (!match) return []
      const target = targetFor(match, workout, goal)
      return [
        {
          split_day_id: day.id,
          exercise_id: exercise.exerciseId,
          position: exercise.position,
          target_sets: target.sets,
          target_reps: target.reps,
        },
      ]
    })
  })
}

// ---------------------------------------------------------------------------
// Onboarding and settings
// ---------------------------------------------------------------------------

export async function completeOnboarding(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const name = String(formData.get('name') ?? '').trim()
  const template = getSplit(String(formData.get('split') ?? ''))
  const goal = formData.get('goal')
  const unit = formData.get('unit')
  if (!name || name.length > 60) return { error: 'Enter a name of up to 60 characters.' }
  if (!template) return { error: 'Choose a split to get started.' }
  if (!isGoal(goal) || !isUnit(unit)) return FAILED

  const requestedZone = formData.get('timezone')
  const timezone = isValidTimeZone(requestedZone) ? requestedZone : 'UTC'
  const today = todayIn(timezone)

  try {
    const supabase = await createClient()
    must(
      await supabase.from('profiles').upsert(
        {
          id: user.id,
          display_name: name,
          goal,
          unit_preference: unit,
          timezone,
          // Weeks start on Sunday in the Americas and Monday almost everywhere else.
          week_starts_on: timezone.startsWith('America/') ? 0 : 1,
        },
        { onConflict: 'id' }
      )
    )
    const splitId = await createSplitFromTemplate(supabase, user.id, template, goal)
    await activateSplit({ supabase, userId: user.id, today }, splitId)
  } catch {
    return FAILED
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function updateSplit(templateId: string): Promise<ActionResult> {
  const context = await loadContext()
  if (!context) return SIGNED_OUT
  const template = getSplit(templateId)
  if (!template) return FAILED
  if (context.current.templateKey === template.id) return {}

  try {
    const splitId = await createSplitFromTemplate(context.supabase, context.userId, template, context.profile.goal)
    await activateSplit(context, splitId)
  } catch {
    return FAILED
  }
  return done()
}

/** `schedule[weekday]` (0 = Sunday) is a workout id from the current split, or null for rest. */
export async function updateSchedule(schedule: (string | null)[]): Promise<ActionResult> {
  const context = await loadContext()
  if (!context) return SIGNED_OUT
  const { current, supabase, userId, today } = context

  const dayIds = new Set(current.days.map((day) => day.id))
  const valid =
    Array.isArray(schedule) &&
    schedule.length === 7 &&
    schedule.every((dayId) => dayId === null || (typeof dayId === 'string' && dayIds.has(dayId)))
  if (!valid) return FAILED
  if (schedule.every((dayId) => dayId === null)) return { error: 'Keep at least one training day in your week.' }

  try {
    if (current.activeFrom !== today) {
      // Earlier days must keep the old schedule, so the change goes into a copy starting today.
      const splitId = await copySplit(supabase, userId, current, schedule)
      await activateSplit(context, splitId)
    } else {
      // The split started today, so it can be edited in place. Add before removing so no
      // weekday is briefly left empty.
      const existing = current.days.flatMap((day) => day.weekdays.map((weekday) => ({ dayId: day.id, weekday })))
      const wanted = schedule.flatMap((dayId, weekday) => (dayId ? [{ dayId, weekday }] : []))
      const same = (a: { dayId: string; weekday: number }, b: typeof a) => a.dayId === b.dayId && a.weekday === b.weekday
      const added = wanted.filter((entry) => !existing.some((other) => same(entry, other)))
      const removed = existing.filter((entry) => !wanted.some((other) => same(entry, other)))
      if (added.length > 0) {
        must(
          await supabase
            .from('split_day_schedule')
            .insert(added.map((entry) => ({ split_day_id: entry.dayId, weekday: entry.weekday })))
        )
      }
      for (const entry of removed) {
        must(
          await supabase
            .from('split_day_schedule')
            .delete()
            .eq('split_day_id', entry.dayId)
            .eq('weekday', entry.weekday)
        )
      }
    }
  } catch {
    return FAILED
  }
  return done()
}

export async function updatePreferences(changes: {
  goal?: Goal
  weightUnit?: WeightUnit
  weekStartsOn?: number
  timezone?: string
  displayName?: string
}): Promise<ActionResult> {
  const context = await loadContext()
  if (!context) return SIGNED_OUT
  if (typeof changes !== 'object' || changes === null) return FAILED

  const update: Record<string, string | number> = {}
  if ('goal' in changes) {
    if (!isGoal(changes.goal)) return FAILED
    update.goal = changes.goal
  }
  if ('weightUnit' in changes) {
    if (!isUnit(changes.weightUnit)) return FAILED
    update.unit_preference = changes.weightUnit
  }
  if ('weekStartsOn' in changes) {
    if (changes.weekStartsOn !== 0 && changes.weekStartsOn !== 1) return FAILED
    update.week_starts_on = changes.weekStartsOn
  }
  if ('timezone' in changes) {
    if (!isValidTimeZone(changes.timezone)) return { error: "That time zone isn't recognized." }
    update.timezone = changes.timezone
  }
  if ('displayName' in changes) {
    const name = typeof changes.displayName === 'string' ? changes.displayName.trim() : ''
    if (!name || name.length > 60) return { error: 'Enter a name of up to 60 characters.' }
    update.display_name = name
  }
  if (Object.keys(update).length === 0) return {}

  try {
    must(await context.supabase.from('profiles').update(update).eq('id', context.userId))
    // A new goal changes the targets in the current split.
    if (update.goal) {
      const rows = targetRows(context.current, update.goal as Goal)
      if (rows.length > 0) {
        must(await context.supabase.from('split_day_exercises').upsert(rows, { onConflict: 'split_day_id,exercise_id' }))
      }
    }
  } catch {
    return FAILED
  }
  return done()
}

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

/** Finds the session for a day, creating it if needed, and marks it completed. */
async function completedSession(context: Context, date: string, dayId: string) {
  const { supabase, userId } = context
  const { data: session } = must(
    await supabase
      .from('workout_sessions')
      .select('id, completed_at')
      .eq('user_id', userId)
      .eq('date', date)
      .maybeSingle()
  )
  const fields = { status: 'completed', split_day_id: dayId, completed_at: session?.completed_at ?? new Date().toISOString() }
  if (session) {
    must(await supabase.from('workout_sessions').update(fields).eq('id', session.id))
    return session.id as string
  }
  const { data: created } = must(
    await supabase.from('workout_sessions').insert({ user_id: userId, date, ...fields }).select('id').single()
  )
  return created!.id as string
}

export async function logSet(input: {
  date: string
  dayId: string
  exercise: { id?: string; name: string }
  weight: number
  reps: number
}): Promise<ActionResult> {
  const context = await loadContext()
  if (!context) return SIGNED_OUT
  if (!isRecordableDate(context, input?.date)) return { error: "Sets can't be logged for that day." }

  const found = typeof input.dayId === 'string' ? context.history.days.get(input.dayId) : undefined
  if (!found) return FAILED

  const name = typeof input.exercise?.name === 'string' ? input.exercise.name.trim().replace(/\s+/g, ' ') : ''
  if (!name || name.length > 80) return { error: 'Exercise names can be up to 80 characters.' }

  const weight = Number(input.weight)
  if (!Number.isFinite(weight) || weight < 0 || weight > 9999) {
    return { error: 'Enter a weight between 0 and 9,999.' }
  }
  const reps = Number(input.reps)
  if (!Number.isInteger(reps) || reps < 1 || reps > 999) return { error: 'Enter between 1 and 999 reps.' }

  const weightKg = toKg(weight, context.profile.unit_preference)
  if (weightKg > 9999.99) return { error: 'That weight is too heavy to record.' }

  try {
    const { supabase, userId } = context
    // Exercises from the workout already have ids; ones the user added are found or created by name.
    const planned = found.day.exercises.find((exercise) => exercise.exerciseId === input.exercise.id)
    const exerciseId = planned
      ? planned.exerciseId
      : (await ensureExercises(supabase, userId, [name])).get(name)
    if (!exerciseId) return FAILED

    const sessionId = await completedSession(context, input.date, input.dayId)
    const { data: previous } = must(
      await supabase
        .from('set_logs')
        .select('set_number')
        .eq('session_id', sessionId)
        .eq('exercise_id', exerciseId)
        .order('set_number', { ascending: false })
        .limit(1)
        .maybeSingle()
    )
    must(
      await supabase.from('set_logs').insert({
        session_id: sessionId,
        exercise_id: exerciseId,
        set_number: (previous?.set_number ?? 0) + 1,
        weight_kg: weightKg,
        reps,
      })
    )
  } catch {
    return FAILED
  }
  return done()
}

export async function deleteSet(id: string): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return SIGNED_OUT
  if (typeof id !== 'string' || !UUID.test(id)) return FAILED

  try {
    const supabase = await createClient()
    const { data: deleted } = must(
      await supabase.from('set_logs').delete().eq('id', id).select('session_id').maybeSingle()
    )
    // A session with no sets left is no longer a workout.
    if (deleted) {
      const { count } = must(
        await supabase
          .from('set_logs')
          .select('id', { count: 'exact', head: true })
          .eq('session_id', deleted.session_id)
      )
      if (count === 0) {
        must(
          await supabase
            .from('workout_sessions')
            .delete()
            .eq('id', deleted.session_id)
            .eq('user_id', user.id)
            .eq('status', 'completed')
        )
      }
    }
  } catch {
    return FAILED
  }
  return done()
}

/** Marks a day as a break or skipped, or clears the mark with `null`. */
export async function setDayStatus(date: string, status: 'break' | 'skipped' | null): Promise<ActionResult> {
  const context = await loadContext()
  if (!context) return SIGNED_OUT
  if (!isRecordableDate(context, date)) return FAILED
  if (status !== null && status !== 'break' && status !== 'skipped') return FAILED

  try {
    const { supabase, userId, history } = context
    const { data: session } = must(
      await supabase.from('workout_sessions').select('id').eq('user_id', userId).eq('date', date).maybeSingle()
    )
    if (session) {
      const { count } = must(
        await supabase.from('set_logs').select('id', { count: 'exact', head: true }).eq('session_id', session.id)
      )
      if (count) return { error: 'Delete the sets you logged for this day first.' }
    }

    if (status === null) {
      if (session) must(await supabase.from('workout_sessions').delete().eq('id', session.id))
      return done()
    }

    const fields = { status, split_day_id: scheduledDay(planFor(history, date), date)?.id ?? null, completed_at: null }
    if (session) must(await supabase.from('workout_sessions').update(fields).eq('id', session.id))
    else must(await supabase.from('workout_sessions').insert({ user_id: userId, date, ...fields }))
  } catch {
    return FAILED
  }
  return done()
}
