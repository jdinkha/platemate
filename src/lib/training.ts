import { dayOfWeek } from '@/lib/dates'
import type { Goal, WeightUnit } from '@/lib/splits'
import { totalFromKg } from '@/lib/units'

export type Profile = {
  id: string
  display_name: string
  goal: Goal
  unit_preference: WeightUnit
  week_starts_on: number
  timezone: string
}

export type PlanExercise = {
  exerciseId: string
  name: string
  position: number
  targetSets: number | null
  targetReps: number | null
}

/** A workout in a split (a row in split_days). */
export type PlanDay = {
  id: string
  name: string
  position: number
  /** 0 = Sunday … 6 = Saturday */
  weekdays: number[]
  exercises: PlanExercise[]
}

/** One of the user's splits (a row in `splits`) with its workouts. */
export type Plan = {
  id: string
  name: string
  /** The built-in split it was created from, e.g. 'ppl'. */
  templateKey: string | null
  /** When it took effect; null if it never did or was replaced the same day. */
  activeFrom: string | null
  createdAt: string
  days: PlanDay[]
}

export type PlanHistory = {
  /** Splits that took effect, oldest first. */
  timeline: Plan[]
  /** Every workout of every split the user has had, by split_days.id. */
  days: Map<string, { plan: Plan; day: PlanDay }>
}

export type Session = {
  id: string
  date: string
  status: 'completed' | 'skipped' | 'break'
  split_day_id: string | null
}

export type SetLog = {
  id: string
  session_id: string
  exercise_id: string
  exercise: string
  set_number: number
  weight_kg: number
  reps: number
}

/**
 * trained   – sets were logged
 * break     – the user chose to take the day off (doesn't count as missed)
 * skipped   – the user marked the workout as skipped
 * missed    – a past training day with nothing recorded
 * rest      – a rest day in the split
 * planned   – today or a future training day
 * untracked – before the user started using PlateMate
 */
export type DayStatus = 'trained' | 'break' | 'skipped' | 'missed' | 'rest' | 'planned' | 'untracked'

export function buildPlanHistory(plans: Plan[]): PlanHistory {
  const timeline = plans
    .filter((plan) => plan.activeFrom)
    .sort((a, b) => a.activeFrom!.localeCompare(b.activeFrom!) || a.createdAt.localeCompare(b.createdAt))
  const days = new Map(plans.flatMap((plan) => plan.days.map((day) => [day.id, { plan, day }] as const)))
  return { timeline, days }
}

/** The date the user started tracking: when their first split took effect. */
export function trackingStart(history: PlanHistory) {
  return history.timeline[0]?.activeFrom ?? undefined
}

/** The split in effect on `date`. */
export function planFor(history: PlanHistory, date: string) {
  let current: Plan | undefined
  for (const plan of history.timeline) {
    if (plan.activeFrom! > date) break
    current = plan
  }
  return current ?? history.timeline[0]
}

/** The workout the split schedules on `date`, or undefined on a rest day. */
export function scheduledDay(plan: Plan | undefined, date: string) {
  const weekday = dayOfWeek(date)
  return plan?.days.find((day) => day.weekdays.includes(weekday))
}

export function dayStatus(date: string, today: string, history: PlanHistory, session?: Session): DayStatus {
  const start = trackingStart(history)
  if (!start || date < start) return 'untracked'
  if (session?.status === 'completed') return 'trained'
  if (session?.status === 'break') return 'break'
  if (session?.status === 'skipped') return 'skipped'
  if (!scheduledDay(planFor(history, date), date)) return 'rest'
  return date < today ? 'missed' : 'planned'
}

/**
 * Which workout to show for a day: an explicit choice (`?workout=`), then
 * whatever was already logged that day, then what the split schedules.
 */
export function workoutForDay(
  date: string,
  history: PlanHistory,
  session: Session | undefined,
  choice: string | undefined
): { plan?: Plan; day?: PlanDay } {
  const plan = planFor(history, date)
  const chosen = plan?.days.find((day) => day.id === choice)
  if (chosen) return { plan, day: chosen }

  if (session?.status === 'completed' && session.split_day_id) {
    const logged = history.days.get(session.split_day_id)
    if (logged) return logged
  }

  return { plan, day: scheduledDay(plan, date) }
}

/** Total weight moved (weight × reps), in the user's unit. */
export function volumeOf(sets: Pick<SetLog, 'weight_kg' | 'reps'>[], unit: WeightUnit) {
  return totalFromKg(sets.reduce((sum, set) => sum + set.weight_kg * set.reps, 0), unit)
}

export function sortByPosition<T extends { position: number }>(items: T[]) {
  return [...items].sort((a, b) => a.position - b.position)
}
