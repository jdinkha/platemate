import { addDays, eachDay, formatDate } from '@/lib/dates'
import { findExercise, MUSCLES, type Muscle } from '@/lib/exercises'
import type { Goal, WeightUnit } from '@/lib/splits'
import { planFor, trackingStart, type Plan, type PlanHistory } from '@/lib/training'
import { formatNumber, fromKg } from '@/lib/units'

// A deterministic look at the user's training: weekly sets per muscle in the
// plan against what was logged, whether the plan is balanced, and whether
// lifts are still improving. Every threshold is a constant below.

/** Days in each window: four weeks, so every weekday counts the same. */
const WINDOW = 28
/** Below this many days of history, logged sets are too few to judge. */
const MIN_DAYS = 7
/** Fewer weekly sets than this for a major muscle is too little to grow or keep it. */
const MIN_WEEKLY_SETS = 4
/** Doing less than this share of the planned sets is worth a warning. */
const MIN_COMPLETION = 0.8
/** A muscle is being skipped when its share done is this far below the overall share. */
const SKIP_GAP = 0.2
/** How much weaker than last year counts as a regression (best e1RM varies set to set). */
const REGRESSION = 0.02

/** Muscles that need direct work; the rest get enough from compound lifts. */
const MAJOR: Muscle[] = ['chest', 'back', 'sideDelts', 'rearDelts', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves']

/** Sets of `top` per set of `bottom` that a balanced program lands between. */
const RATIOS: { label: string; top: Muscle[]; bottom: Muscle[]; min: number; max: number; why: string }[] = [
  {
    label: 'Back vs chest',
    top: ['back'],
    bottom: ['chest'],
    min: 0.8,
    max: Infinity,
    why: 'Pulling at least as much as you press keeps your shoulders healthy.',
  },
  {
    label: 'Legs vs upper body',
    top: ['quads', 'hamstrings'],
    bottom: ['chest', 'back'],
    min: 0.5,
    max: Infinity,
    why: 'Your legs are half your muscle; most programs give them at least half the work.',
  },
  {
    label: 'Hamstrings vs quads',
    top: ['hamstrings'],
    bottom: ['quads'],
    min: 0.5,
    max: 2,
    why: 'Weak hamstrings next to strong quads are a common cause of knee and hamstring injuries.',
  },
  {
    label: 'Rear vs front delts',
    top: ['rearDelts'],
    bottom: ['frontDelts'],
    min: 0.4,
    max: Infinity,
    why: 'Pressing works the front delts hard; without rear delt work your shoulders roll forward.',
  },
  {
    label: 'Triceps vs biceps',
    top: ['triceps'],
    bottom: ['biceps'],
    min: 0.5,
    max: 2,
    why: 'Arms look and work best with both sides trained.',
  },
]

export type LoggedSet = { date: string; exercise: string; weight_kg: number; reps: number }

export type Issue = { severity: 'high' | 'medium'; title: string; detail: string }

export type LiftTrend = {
  exercise: string
  /** Best estimated one-rep max in kg over the last four weeks; best reps for bodyweight lifts. */
  current: number
  /** The same over the eight weeks before. */
  previous?: number
  /** The same over the same four weeks a year ago. */
  lastYear?: number
  bodyweight: boolean
  status: 'regressed' | 'stalled' | 'progressing' | 'new'
}

export type Analysis = {
  from: string
  to: string
  days: number
  /** Weekly sets per muscle: each set counts by how much the exercise works the muscle. */
  muscles: { muscle: Muscle; planned: number; actual: number; skipped: boolean }[]
  /** Weekly sets, each counted once. */
  plannedSets: number
  actualSets: number
  ratios: { label: string; planned?: number; actual?: number; min: number; max: number }[]
  /** Logged or planned exercises with no muscle data (typed in by the user). */
  unmapped: string[]
  lifts: LiftTrend[]
  issues: Issue[]
}

type Volume = Record<Muscle, number>

const MUSCLE_KEYS = Object.keys(MUSCLES) as Muscle[]

/** The date ranges of logged sets analyze() needs, oldest last. */
export function analysisRanges(today: string) {
  return [
    { from: addDays(today, -WINDOW * 3), to: today },
    { from: addDays(today, -365 - WINDOW), to: addDays(today, -364) },
  ]
}

/**
 * `sets` must cover analysisRanges(today). The window ends today if anything
 * was logged today, else yesterday, so an unfinished day doesn't count as missed.
 */
export function analyze(
  history: PlanHistory,
  sets: LoggedSet[],
  today: string,
  goal: Goal,
  unit: WeightUnit
): Analysis | null {
  const start = trackingStart(history)
  const to = sets.some((set) => set.date === today) ? today : addDays(today, -1)
  const earliest = addDays(to, -(WINDOW - 1))
  const from = start && start > earliest ? start : earliest
  if (!start || from > to) return null

  const dates = eachDay(from, to)
  const weeks = dates.length / 7

  // Weekly sets of each exercise: planned follows whichever split was active each day.
  const planned = new Map<string, number>()
  for (const [plan, active] of Map.groupBy(dates, (date) => planFor(history, date))) {
    if (!plan) continue
    for (const [name, count] of weeklySets(plan)) add(planned, name, (count * active.length) / dates.length)
  }
  const actual = new Map<string, number>()
  for (const set of sets) if (set.date >= from && set.date <= to) add(actual, set.exercise, 1 / weeks)

  const plannedVolume = byMuscle(planned)
  const actualVolume = byMuscle(actual)
  const plannedSets = sum([...planned.values()])
  const actualSets = sum([...actual.values()])
  const enoughData = dates.length >= MIN_DAYS
  const issues: Issue[] = []
  const skipped = new Set<Muscle>()

  // Following the plan, overall and per muscle.
  const completion = plannedSets > 0 ? actualSets / plannedSets : 1
  if (enoughData && completion < MIN_COMPLETION) {
    issues.push({
      severity: completion < 0.5 ? 'high' : 'medium',
      title: `You're doing ${percent(completion)} of your planned sets`,
      detail: `${formatNumber(round(actualSets))} sets a week against ${formatNumber(round(plannedSets))} planned. Missed workouts and unfinished exercises both count.`,
    })
  }
  for (const muscle of MAJOR) {
    const target = plannedVolume[muscle]
    if (!enoughData || target < MIN_WEEKLY_SETS / 2) continue
    const done = actualVolume[muscle] / target
    if (done > Math.min(completion, 1) - SKIP_GAP) continue
    skipped.add(muscle)
    const culprit = mostSkipped(muscle, planned, actual)
    const name = MUSCLES[muscle].toLowerCase()
    issues.push({
      severity: done < completion / 2 ? 'high' : 'medium',
      title: `You're skipping ${name} work`,
      detail:
        `You did ${percent(done)} of your planned ${name} sets, against ${percent(completion)} of everything else.` +
        (culprit
          ? ` Most missed: ${culprit.name}, ${round(culprit.done * weeks)} of ${round(culprit.planned * weeks)} sets.`
          : ''),
    })
  }

  // The plan's coverage and balance, then the same balance in what was logged.
  for (const muscle of MAJOR) {
    const weekly = plannedVolume[muscle]
    if (plannedSets === 0 || weekly >= MIN_WEEKLY_SETS) continue
    const name = MUSCLES[muscle].toLowerCase()
    issues.push({
      severity: 'medium',
      title: weekly < 1 ? `Your plan doesn't train ${name}` : `Your plan barely trains ${name}`,
      detail: `${formatNumber(round(weekly))} sets a week; aim for at least ${MIN_WEEKLY_SETS}. Add an exercise that targets them.`,
    })
  }
  const ratios = RATIOS.map((rule) => {
    const planRatio = ratio(plannedVolume, rule.top, rule.bottom)
    const actualRatio = enoughData ? ratio(actualVolume, rule.top, rule.bottom) : undefined
    const off = (value?: number) => value !== undefined && (value < rule.min || value > rule.max)
    const describe = (volume: Volume, value: number) =>
      `${formatNumber(round(total(volume, rule.top)))} ${names(rule.top)} sets a week for ${formatNumber(
        round(total(volume, rule.bottom))
      )} ${names(rule.bottom)} sets (${formatNumber(round(value))} : 1). Aim for ${range(rule.min, rule.max)}. ${rule.why}`
    if (off(planRatio)) {
      issues.push({ severity: 'medium', title: `Your plan is unbalanced: ${rule.label.toLowerCase()}`, detail: `It has ${describe(plannedVolume, planRatio!)}` })
    } else if (off(actualRatio)) {
      issues.push({ severity: 'medium', title: `Your training is unbalanced: ${rule.label.toLowerCase()}`, detail: `You did ${describe(actualVolume, actualRatio!)}` })
    }
    return { label: rule.label, planned: planRatio, actual: actualRatio, min: rule.min, max: rule.max }
  })

  // Strength over time.
  // Accessories often hold a weight for months, so only compound lifts raise a stall.
  const lifts = liftTrends(sets, to)
  for (const lift of lifts) {
    const compound = findExercise(lift.exercise)?.compound ?? false
    if (lift.status !== 'regressed' && !(lift.status === 'stalled' && compound)) continue
    const severity = goal === 'strength' && compound ? 'high' : 'medium'
    const show = (value: number) =>
      lift.bodyweight ? `${value} reps` : `${formatNumber(fromKg(value, unit))} ${unit}`
    const measure = lift.bodyweight ? 'Best set' : 'Best estimated 1-rep max'
    if (lift.status === 'regressed') {
      const lastYear = formatDate(addDays(to, -365), { month: 'long', year: 'numeric' })
      issues.push({
        severity,
        title: `${lift.exercise} is weaker than a year ago`,
        detail: `${measure}: ${show(lift.current)}, down ${percent(1 - lift.current / lift.lastYear!)} from ${show(lift.lastYear!)} in ${lastYear}.`,
      })
    } else {
      issues.push({
        severity,
        title: `${lift.exercise} has stalled`,
        detail: `${measure} in the last 4 weeks: ${show(lift.current)}, no better than ${show(lift.previous!)} in the 8 weeks before.`,
      })
    }
  }

  const unmapped = [...new Set([...planned.keys(), ...actual.keys()])].filter((name) => !findExercise(name)).sort()

  return {
    from,
    to,
    days: dates.length,
    muscles: MUSCLE_KEYS.map((muscle) => ({
      muscle,
      planned: plannedVolume[muscle],
      actual: actualVolume[muscle],
      skipped: skipped.has(muscle),
    })),
    plannedSets,
    actualSets,
    ratios,
    unmapped,
    lifts,
    issues: issues.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'high' ? -1 : 1)),
  }
}

/** Sets per week of each exercise in a split, following its schedule. */
function weeklySets(plan: Plan) {
  const weekly = new Map<string, number>()
  const days =
    plan.scheduleType === 'loop' && plan.loop.length > 0
      ? plan.loop.flatMap((day) => (day ? [{ day, times: 7 / plan.loop.length }] : []))
      : plan.days.map((day) => ({ day, times: day.weekdays.length }))
  for (const { day, times } of days) {
    for (const exercise of day.exercises) add(weekly, exercise.name, (exercise.targetSets ?? 0) * times)
  }
  return weekly
}

function byMuscle(sets: Map<string, number>) {
  const volume = Object.fromEntries(MUSCLE_KEYS.map((muscle) => [muscle, 0])) as Volume
  for (const [name, count] of sets) {
    for (const [muscle, weight] of Object.entries(findExercise(name)?.muscles ?? {})) {
      volume[muscle as Muscle] += weight * count
    }
  }
  return volume
}

/** The planned exercise working `muscle` (as a prime mover or strong synergist) with the smallest share done. */
function mostSkipped(muscle: Muscle, planned: Map<string, number>, actual: Map<string, number>) {
  let worst: { name: string; planned: number; done: number } | undefined
  for (const [name, count] of planned) {
    if (count === 0 || (findExercise(name)?.muscles[muscle] ?? 0) < 0.5) continue
    const done = actual.get(name) ?? 0
    if (!worst || done / count < worst.done / worst.planned) worst = { name, planned: count, done }
  }
  return worst && worst.done < worst.planned ? worst : undefined
}

/** Best estimated one-rep max (Epley) per exercise now, in the 8 weeks before, and a year ago. */
function liftTrends(sets: LoggedSet[], to: string): LiftTrend[] {
  const windows = {
    current: [addDays(to, -(WINDOW - 1)), to],
    previous: [addDays(to, -(WINDOW * 3 - 1)), addDays(to, -WINDOW)],
    lastYear: [addDays(to, -365 - (WINDOW - 1)), addDays(to, -365)],
  }
  const order = { regressed: 0, stalled: 1, progressing: 2, new: 3 }
  const trends: LiftTrend[] = []
  for (const [exercise, logged] of Map.groupBy(sets, (set) => set.exercise)) {
    const bodyweight = logged.every((set) => set.weight_kg === 0)
    const score = (set: LoggedSet) =>
      bodyweight ? set.reps : set.reps === 1 ? set.weight_kg : set.weight_kg * (1 + set.reps / 30)
    const best = ([from, until]: string[]) => {
      const scores = logged.filter((set) => set.date >= from && set.date <= until).map(score)
      return scores.length > 0 && Math.max(...scores) > 0 ? Math.max(...scores) : undefined
    }
    const current = best(windows.current)
    if (current === undefined) continue
    const previous = best(windows.previous)
    const lastYear = best(windows.lastYear)
    const status =
      lastYear !== undefined && current < lastYear * (1 - REGRESSION)
        ? 'regressed'
        : previous !== undefined && current <= previous
          ? 'stalled'
          : previous !== undefined || lastYear !== undefined
            ? 'progressing'
            : 'new'
    trends.push({ exercise, current, previous, lastYear, bodyweight, status })
  }
  return trends.sort((a, b) => order[a.status] - order[b.status] || a.exercise.localeCompare(b.exercise))
}

function add(map: Map<string, number>, key: string, amount: number) {
  map.set(key, (map.get(key) ?? 0) + amount)
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}

function total(volume: Volume, muscles: Muscle[]) {
  return sum(muscles.map((muscle) => volume[muscle]))
}

/** Sets of `top` per set of `bottom`; undefined if neither is trained. */
function ratio(volume: Volume, top: Muscle[], bottom: Muscle[]) {
  const a = total(volume, top)
  const b = total(volume, bottom)
  return a === 0 && b === 0 ? undefined : a / b
}

function names(muscles: Muscle[]) {
  return muscles.map((muscle) => MUSCLES[muscle].toLowerCase()).join(' and ')
}

function range(min: number, max: number) {
  return max === Infinity ? `at least ${min} : 1` : `${min} : 1 to ${max} : 1`
}

function round(value: number) {
  return Math.round(value * 10) / 10
}

function percent(share: number) {
  return `${Math.round(share * 100)}%`
}
