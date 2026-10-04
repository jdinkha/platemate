'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/lib/auth'
import { getPlanHistory, getProfile, getSessions } from '@/lib/data'
import { defaultWeekStart, isValidISODate, isValidTimeZone, todayIn } from '@/lib/dates'
import { findExercise } from '@/lib/exercises'
import { GOALS, REST, getSplit, targetFor, targetForName, type Goal, type Split, type WeightUnit } from '@/lib/splits'
import { createClient } from '@/lib/supabase/server'
import { buildCalendar, planFor, retarget, sessionsNeededFrom, templateWorkout, trackingStart, type Plan } from '@/lib/training'
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
        unique.map((name) => ({ user_id: userId, name, muscle_group: findExercise(name)?.muscle ?? null })),
        { onConflict: 'user_id,name', ignoreDuplicates: true }
      )
  )
  const { data } = must(await supabase.from('exercises').select('id, name').eq('user_id', userId).in('name', unique))
  return new Map((data ?? []).map((exercise) => [exercise.name as string, exercise.id as string]))
}

/**
 * How a split's workouts fall on days: a workout id (or null for rest) for each
 * weekday (0 = Sunday), or a loop of them with the position to start on.
 */
type Arrangement =
  | { type: 'weekly'; schedule: (string | null)[] }
  | { type: 'loop'; entries: (string | null)[]; start: number }

async function insertArrangement(supabase: Supabase, splitId: string, arrangement: Arrangement) {
  if (arrangement.type === 'weekly') {
    must(
      await supabase
        .from('split_day_schedule')
        .insert(arrangement.schedule.flatMap((dayId, weekday) => (dayId ? [{ split_day_id: dayId, weekday }] : [])))
    )
  } else {
    must(
      await supabase
        .from('split_loop_entries')
        .insert(arrangement.entries.map((dayId, position) => ({ split_id: splitId, position, split_day_id: dayId })))
    )
  }
}

function splitRow(userId: string, name: string, templateKey: string | null, arrangement: Arrangement) {
  return {
    user_id: userId,
    name,
    template_key: templateKey,
    schedule_type: arrangement.type,
    loop_start: arrangement.type === 'loop' ? arrangement.start : 0,
  }
}

/** Copies a built-in split into the user's tables. It isn't active until activateSplit runs. */
async function createSplitFromTemplate(
  supabase: Supabase,
  userId: string,
  template: Split,
  goal: Goal,
  mode: Arrangement['type']
) {
  const exerciseIds = await ensureExercises(
    supabase,
    userId,
    template.workouts.flatMap((workout) => workout.exercises.map((exercise) => exercise.name))
  )
  const placeholder: Arrangement = mode === 'loop' ? { type: 'loop', entries: [], start: 0 } : { type: 'weekly', schedule: [] }
  const { data: split } = must(
    await supabase
      .from('splits')
      .insert(splitRow(userId, template.name, template.id, placeholder))
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
  const toId = (key: string) => (key === REST ? null : dayIds.get(key)!)
  await insertArrangement(
    supabase,
    split!.id,
    mode === 'loop'
      ? { type: 'loop', entries: template.loop.map(toId), start: 0 }
      : // Templates list the week Monday first; split_day_schedule uses 0 = Sunday.
        { type: 'weekly', schedule: Array.from({ length: 7 }, (_, weekday) => toId(template.schedule[(weekday + 6) % 7])) }
  )
  return split!.id as string
}

/** Copies a split with a new arrangement, which refers to the original split's day ids. */
async function copySplit(supabase: Supabase, userId: string, plan: Plan, arrangement: Arrangement) {
  const { data: split } = must(
    await supabase
      .from('splits')
      .insert(splitRow(userId, plan.name, plan.templateKey, arrangement))
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

  const toNew = (dayId: string | null) => (dayId ? newIds.get(dayId)! : null)
  await insertArrangement(
    supabase,
    split!.id,
    arrangement.type === 'weekly'
      ? { type: 'weekly', schedule: arrangement.schedule.map(toNew) }
      : { type: 'loop', entries: arrangement.entries.map(toNew), start: arrangement.start }
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
          week_starts_on: defaultWeekStart(timezone),
        },
        { onConflict: 'id' }
      )
    )
    const splitId = await createSplitFromTemplate(supabase, user.id, template, goal, 'weekly')
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
    // Keep whichever kind of schedule the user is on.
    const splitId = await createSplitFromTemplate(
      context.supabase,
      context.userId,
      template,
      context.profile.goal,
      context.current.scheduleType
    )
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
    if (current.activeFrom !== today || current.scheduleType === 'loop') {
      // Earlier days must keep the old schedule, so the change goes into a copy starting today.
      const splitId = await copySplit(supabase, userId, current, { type: 'weekly', schedule })
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

/**
 * Switches to (or edits) a loop. `entries` are workout ids from the current
 * split, or null for rest; `start` is the entry for today.
 */
export async function updateLoop(entries: (string | null)[], start: number): Promise<ActionResult> {
  const context = await loadContext()
  if (!context) return SIGNED_OUT
  const { current, supabase, userId } = context

  const dayIds = new Set(current.days.map((day) => day.id))
  const valid =
    Array.isArray(entries) &&
    entries.length >= 1 &&
    entries.length <= 28 &&
    entries.every((dayId) => dayId === null || (typeof dayId === 'string' && dayIds.has(dayId))) &&
    Number.isInteger(start) &&
    start >= 0 &&
    start < entries.length
  if (!valid) return FAILED
  if (entries.every((dayId) => dayId === null)) return { error: 'Add at least one workout to your loop.' }

  // Loops are always saved as a new split starting today, so earlier days keep their schedule.
  try {
    const splitId = await copySplit(supabase, userId, current, { type: 'loop', entries, start })
    await activateSplit(context, splitId)
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
    // A new goal changes the targets in the current split, keeping sets the user chose.
    if (update.goal && update.goal !== context.profile.goal) {
      const rows = retarget(context.current, context.profile.goal, update.goal as Goal)
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
// Exercises in a workout. Only the split in effect today can be edited, and a
// change applies to every day that workout comes up.
// ---------------------------------------------------------------------------

export async function updateTargetSets(dayId: string, exerciseId: string, sets: number): Promise<ActionResult> {
  const context = await loadContext()
  if (!context) return SIGNED_OUT
  const day = context.current.days.find((candidate) => candidate.id === dayId)
  if (!day?.exercises.some((exercise) => exercise.exerciseId === exerciseId)) return FAILED
  if (!Number.isInteger(sets) || sets < 1 || sets > 10) return { error: 'Choose between 1 and 10 sets.' }

  try {
    must(
      await context.supabase
        .from('split_day_exercises')
        .update({ target_sets: sets })
        .eq('split_day_id', dayId)
        .eq('exercise_id', exerciseId)
    )
  } catch {
    return FAILED
  }
  return done()
}

export async function addExerciseToDay(dayId: string, name: string): Promise<ActionResult> {
  const context = await loadContext()
  if (!context) return SIGNED_OUT
  const { current, supabase, userId, profile } = context
  const day = current.days.find((candidate) => candidate.id === dayId)
  if (!day) return FAILED

  const typed = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : ''
  if (!typed || typed.length > 80) return { error: 'Exercise names can be up to 80 characters.' }
  // Use the catalog's spelling when it's a known exercise ("dumbbell row" → "Dumbbell Row").
  const exerciseName = findExercise(typed)?.name ?? typed
  if (day.exercises.some((exercise) => exercise.name.toLowerCase() === exerciseName.toLowerCase())) {
    return { error: `${exerciseName} is already in ${day.name}.` }
  }

  try {
    const exerciseId = (await ensureExercises(supabase, userId, [exerciseName])).get(exerciseName)
    if (!exerciseId) return FAILED
    const target = targetForName(exerciseName, templateWorkout(current, day), profile.goal)
    must(
      await supabase.from('split_day_exercises').insert({
        split_day_id: dayId,
        exercise_id: exerciseId,
        position: Math.max(-1, ...day.exercises.map((exercise) => exercise.position)) + 1,
        target_sets: target.sets,
        target_reps: target.reps,
      })
    )
  } catch {
    return FAILED
  }
  return done()
}

export async function removeExerciseFromDay(dayId: string, exerciseId: string): Promise<ActionResult> {
  const context = await loadContext()
  if (!context) return SIGNED_OUT
  const day = context.current.days.find((candidate) => candidate.id === dayId)
  const exercise = day?.exercises.find((candidate) => candidate.exerciseId === exerciseId)
  if (!day || !exercise) return FAILED
  if (day.exercises.length <= 1) {
    return { error: `You can't delete ${exercise.name}. ${day.name} needs at least one exercise.` }
  }

  try {
    must(
      await context.supabase
        .from('split_day_exercises')
        .delete()
        .eq('split_day_id', dayId)
        .eq('exercise_id', exerciseId)
    )
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
    const { supabase, userId, history, today } = context
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

    // Record the workout that was planned. In a loop that depends on the days before it.
    const sessions = await getSessions(userId, sessionsNeededFrom(history, date), date)
    const planned = buildCalendar(history, sessions, today).planned(date).day
    const fields = { status, split_day_id: planned?.id ?? null, completed_at: null }
    if (session) must(await supabase.from('workout_sessions').update(fields).eq('id', session.id))
    else must(await supabase.from('workout_sessions').insert({ user_id: userId, date, ...fields }))
  } catch {
    return FAILED
  }
  return done()
}
