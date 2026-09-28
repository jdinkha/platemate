import { addDays, dayOfWeek } from '@/lib/dates'
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
  /** 'weekly' uses each day's weekdays; 'loop' repeats `loop` in order. */
  scheduleType: 'weekly' | 'loop'
  /** The loop in order; null entries are rest days. */
  loop: (PlanDay | null)[]
  /** The loop position on `activeFrom`. */
  loopStart: number
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

export type Calendar = {
  /** What the schedule has planned on `date`: a workout, or no `day` for a rest day. */
  planned(date: string): { plan?: Plan; day?: PlanDay }
  status(date: string, session?: Session): DayStatus
  /** Where a loop is on `date` (0-based), or undefined on a weekly schedule. */
  loopIndex(date: string): number | undefined
}

/**
 * The first date whose sessions are needed to work out days from `from`
 * onwards: a loop's position depends on everything since it started.
 */
export function sessionsNeededFrom(history: PlanHistory, from: string) {
  const plan = planFor(history, from)
  return plan?.scheduleType === 'loop' && plan.activeFrom! < from ? plan.activeFrom! : from
}

/**
 * Resolves the schedule day by day. `sessions` must cover every date asked
 * about, back to sessionsNeededFrom().
 *
 * Loops: rest days always pass. A missed workout, or a break, keeps the same
 * workout next; skipping moves on. Finishing a workout continues the loop
 * from the workout actually done. Days after today assume the plan is followed.
 */
export function buildCalendar(history: PlanHistory, sessions: Session[], today: string): Calendar {
  const sessionsByDate = new Map(sessions.map((session) => [session.date, session]))
  // Per loop split: the furthest date worked out so far and the position on it.
  const progress = new Map<string, { date: string; position: number }>()

  function next(plan: Plan, position: number, date: string) {
    const length = plan.loop.length
    const session = sessionsByDate.get(date)
    if (date > today || (date === today && !session)) return (position + 1) % length

    if (session?.status === 'completed') {
      const done = session.split_day_id ? history.days.get(session.split_day_id)?.day.name : undefined
      for (let offset = 0; done && offset < length; offset++) {
        const index = (position + offset) % length
        if (plan.loop[index]?.name === done) return (index + 1) % length
      }
      return (position + 1) % length
    }
    const isRest = !plan.loop[position]
    return isRest || session?.status === 'skipped' ? (position + 1) % length : position
  }

  function loopPosition(plan: Plan, date: string) {
    let state = progress.get(plan.id)
    if (!state || state.date > date) {
      state = { date: plan.activeFrom!, position: plan.loopStart % plan.loop.length }
    }
    let { date: day, position } = state
    while (day < date) {
      position = next(plan, position, day)
      day = addDays(day, 1)
    }
    progress.set(plan.id, { date: day, position })
    return position
  }

  function planned(date: string) {
    const plan = planFor(history, date)
    if (!plan) return {}
    if (plan.scheduleType === 'loop' && plan.loop.length > 0 && date >= plan.activeFrom!) {
      return { plan, day: plan.loop[loopPosition(plan, date)] ?? undefined }
    }
    return { plan, day: scheduledDay(plan, date) }
  }

  function status(date: string, session?: Session): DayStatus {
    const start = trackingStart(history)
    if (!start || date < start) return 'untracked'
    if (session?.status === 'completed') return 'trained'
    if (session?.status === 'break') return 'break'
    if (session?.status === 'skipped') return 'skipped'
    if (!planned(date).day) return 'rest'
    return date < today ? 'missed' : 'planned'
  }

  function loopIndex(date: string) {
    const plan = planFor(history, date)
    return plan?.scheduleType === 'loop' && plan.loop.length > 0 && date >= plan.activeFrom!
      ? loopPosition(plan, date)
      : undefined
  }

  return { planned, status, loopIndex }
}

/**
 * Which workout to show for a day: an explicit choice (`?workout=`), then
 * whatever was already logged that day, then what the schedule plans.
 */
export function workoutForDay(
  date: string,
  history: PlanHistory,
  calendar: Calendar,
  session: Session | undefined,
  choice: string | undefined
): { plan?: Plan; day?: PlanDay } {
  const planned = calendar.planned(date)
  const chosen = planned.plan?.days.find((day) => day.id === choice)
  if (chosen) return { plan: planned.plan, day: chosen }

  if (session?.status === 'completed' && session.split_day_id) {
    const logged = history.days.get(session.split_day_id)
    if (logged) return logged
  }

  return planned
}

/** Total weight moved (weight × reps), in the user's unit. */
export function volumeOf(sets: Pick<SetLog, 'weight_kg' | 'reps'>[], unit: WeightUnit) {
  return totalFromKg(sets.reduce((sum, set) => sum + set.weight_kg * set.reps, 0), unit)
}

export function sortByPosition<T extends { position: number }>(items: T[]) {
  return [...items].sort((a, b) => a.position - b.position)
}
