import type { PostgrestError } from '@supabase/supabase-js'
import { cache } from 'react'

import { createClient } from '@/lib/supabase/server'
import {
  buildPlanHistory,
  sortByPosition,
  type Plan,
  type Profile,
  type Session,
  type SetLog,
} from '@/lib/training'

// Row level security limits every query to the signed-in user's rows; the
// user filters below make that explicit and let Postgres use the indexes.

function check(error: PostgrestError | null) {
  if (!error) return
  // 42703: undefined column, 42P01: undefined table, PGRST204/205: not in the schema cache.
  if (['42703', '42P01', 'PGRST204', 'PGRST205'].includes(error.code)) {
    throw new Error(
      `The database schema is out of date (${error.message}). Apply supabase/migrations/20260928193613_workout_tracking.sql with \`npx supabase db push\`.`
    )
  }
  throw new Error(error.message)
}

export const getProfile = cache(async (userId: string) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, goal, unit_preference, week_starts_on, timezone')
    .eq('id', userId)
    .maybeSingle()
  check(error)
  return data as Profile | null
})

type PlanRow = {
  id: string
  name: string | null
  template_key: string | null
  active_from: string | null
  created_at: string
  schedule_type: 'weekly' | 'loop'
  loop_start: number
  split_loop_entries: { position: number; split_day_id: string | null }[]
  split_days: {
    id: string
    name: string | null
    position: number | null
    split_day_schedule: { weekday: number }[]
    split_day_exercises: {
      exercise_id: string
      position: number | null
      target_sets: number | null
      target_reps: number | null
      exercises: { name: string } | null
    }[]
  }[]
}

/** Every split the user has had, with its workouts, exercises and schedule. */
export const getPlanHistory = cache(async (userId: string) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('splits')
    .select(
      `id, name, template_key, active_from, created_at, schedule_type, loop_start,
       split_loop_entries (position, split_day_id),
       split_days (id, name, position,
         split_day_schedule (weekday),
         split_day_exercises (exercise_id, position, target_sets, target_reps, exercises (name)))`
    )
    .eq('user_id', userId)
  check(error)

  // Without generated types supabase-js assumes embeds are arrays; `exercises` is many-to-one, so an object.
  const plans: Plan[] = ((data ?? []) as unknown as PlanRow[]).map((row) => {
    const days = sortByPosition(
      row.split_days.map((day) => ({
        id: day.id,
        name: day.name ?? 'Workout',
        position: day.position ?? 0,
        weekdays: day.split_day_schedule.map((entry) => entry.weekday),
        exercises: sortByPosition(
          day.split_day_exercises.map((entry) => ({
            exerciseId: entry.exercise_id,
            name: entry.exercises?.name ?? 'Exercise',
            position: entry.position ?? 0,
            targetSets: entry.target_sets,
            targetReps: entry.target_reps,
          }))
        ),
      }))
    )
    return {
      id: row.id,
      name: row.name ?? 'Split',
      templateKey: row.template_key,
      activeFrom: row.active_from,
      createdAt: row.created_at,
      days,
      scheduleType: row.schedule_type,
      loop: sortByPosition(row.split_loop_entries).map((entry) =>
        entry.split_day_id ? (days.find((day) => day.id === entry.split_day_id) ?? null) : null
      ),
      loopStart: row.loop_start,
    }
  })
  return buildPlanHistory(plans)
})

export async function getSessions(userId: string, from: string, to: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('id, date, status, split_day_id')
    .eq('user_id', userId)
    .gte('date', from)
    .lte('date', to)
  check(error)
  return (data ?? []) as Session[]
}

type SetRow = Omit<SetLog, 'exercise'> & { exercises: { name: string } | null }

/** The sets logged in the given sessions, in order. */
export async function getSets(sessionIds: string[]) {
  if (sessionIds.length === 0) return []
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('set_logs')
    .select('id, session_id, exercise_id, set_number, weight_kg, reps, exercises (name)')
    .in('session_id', sessionIds)
    .order('set_number')
  check(error)
  return ((data ?? []) as unknown as SetRow[]).map(({ exercises, ...set }) => ({
    ...set,
    weight_kg: Number(set.weight_kg),
    exercise: exercises?.name ?? 'Exercise',
  }))
}

/** For each exercise, the date and sets of the most recent session before `before` that included it. */
export async function getLastSessions(userId: string, exerciseIds: string[], before: string) {
  const last = new Map<string, { date: string; sets: SetLog[] }>()
  if (exerciseIds.length === 0) return last

  const supabase = await createClient()
  const { data: sessions, error } = await supabase
    .from('workout_sessions')
    .select('id, date')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .lt('date', before)
    .order('date', { ascending: false })
    .limit(100)
  check(error)
  if (!sessions?.length) return last

  const dates = new Map(sessions.map((session) => [session.id as string, session.date as string]))
  const { data: sets, error: setsError } = await supabase
    .from('set_logs')
    .select('id, session_id, exercise_id, set_number, weight_kg, reps')
    .in('session_id', [...dates.keys()])
    .in('exercise_id', exerciseIds)
    .order('set_number')
  check(setsError)

  for (const set of (sets ?? []) as Omit<SetLog, 'exercise'>[]) {
    const date = dates.get(set.session_id)!
    const entry = last.get(set.exercise_id)
    const log = { ...set, weight_kg: Number(set.weight_kg), exercise: '' }
    if (!entry || date > entry.date) last.set(set.exercise_id, { date, sets: [log] })
    else if (date === entry.date) entry.sets.push(log)
  }
  return last
}
