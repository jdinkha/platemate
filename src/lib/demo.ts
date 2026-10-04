import { dayOfWeek, isValidISODate } from '@/lib/dates'
import { findExercise } from '@/lib/exercises'
import { REST, getSplit, getWorkout, targetFor, targetForName, type Goal } from '@/lib/splits'

// The demo at /demo lets signed-out visitors try today's workout: Push / Pull /
// Legs on its default weekly schedule, in pounds. Nothing reaches the database.
// The day is kept in a cookie that expires at the visitor's midnight, so there's
// no history and every day starts fresh.

export const DEMO_COOKIE = 'platemate-demo'
export const DEMO_SPLIT = getSplit('ppl')!
const DEMO_GOAL: Goal = 'mass'

export type DemoExercise = { name: string; sets: number }

/** A logged set. Exercises are identified by name; weights are in pounds. */
export type DemoSet = { id: number; exercise: string; weight: number; reps: number }

export type DemoState = {
  /** The visitor's date (YYYY-MM-DD) this demo is for. */
  date: string
  /** 0 = Sunday, 1 = Monday, from the visitor's time zone. */
  weekStartsOn: number
  /** The workout key picked for today. Until one is picked, the schedule decides. */
  workout?: string
  /** Each workout's exercises and target sets, by workout key, as the visitor has changed them. */
  workouts: Record<string, DemoExercise[]>
  /** Today's sets in the order they were logged. */
  sets: DemoSet[]
}

/** A new demo with the split's own exercises and targets. */
export function newDemo(date: string, weekStartsOn: number): DemoState {
  return {
    date,
    weekStartsOn,
    workouts: Object.fromEntries(
      DEMO_SPLIT.workouts.map((workout) => [
        workout.key,
        workout.exercises.map((exercise) => ({
          name: exercise.name,
          sets: targetFor(exercise, workout, DEMO_GOAL).sets,
        })),
      ])
    ),
    sets: [],
  }
}

/** The workout the schedule has on `date`, or undefined on a rest day. */
export function scheduledWorkout(date: string) {
  // The split lists its week Monday first; dayOfWeek counts from Sunday.
  const key = DEMO_SPLIT.schedule[(dayOfWeek(date) + 6) % 7]
  return key === REST ? undefined : getWorkout(DEMO_SPLIT, key)
}

/** Reps to aim for. They follow the goal; only the number of sets can be changed. */
export function targetReps(workoutKey: string, exercise: string) {
  return targetForName(exercise, getWorkout(DEMO_SPLIT, workoutKey), DEMO_GOAL).reps
}

// ---------------------------------------------------------------------------
// Changes. Each returns the new state, or an error message to show instead.
// They check their input the way the server actions do.
// ---------------------------------------------------------------------------

const FAILED = 'Something went wrong. Please try again.'

export function logDemoSet(state: DemoState, exercise: string, weight: number, reps: number): DemoState | string {
  const name = typeof exercise === 'string' ? exercise.trim().replace(/\s+/g, ' ') : ''
  if (!name || name.length > 80) return 'Exercise names can be up to 80 characters.'
  if (!Number.isFinite(weight) || weight < 0 || weight > 9999) return 'Enter a weight between 0 and 9,999.'
  if (!Number.isInteger(reps) || reps < 1 || reps > 999) return 'Enter between 1 and 999 reps.'

  const id = Math.max(0, ...state.sets.map((set) => set.id)) + 1
  // Weights are shown to one decimal place, so they're kept that way.
  return { ...state, sets: [...state.sets, { id, exercise: name, weight: Math.round(weight * 10) / 10, reps }] }
}

export function deleteDemoSet(state: DemoState, id: number): DemoState {
  return { ...state, sets: state.sets.filter((set) => set.id !== id) }
}

export function setDemoTargetSets(state: DemoState, workoutKey: string, exercise: string, sets: number): DemoState | string {
  const exercises = state.workouts[workoutKey]
  if (!exercises?.some((candidate) => candidate.name === exercise)) return FAILED
  if (!Number.isInteger(sets) || sets < 1 || sets > 10) return 'Choose between 1 and 10 sets.'
  return {
    ...state,
    workouts: {
      ...state.workouts,
      [workoutKey]: exercises.map((candidate) => (candidate.name === exercise ? { ...candidate, sets } : candidate)),
    },
  }
}

export function addDemoExercise(state: DemoState, workoutKey: string, name: string): DemoState | string {
  const workout = getWorkout(DEMO_SPLIT, workoutKey)
  const exercises = state.workouts[workoutKey]
  if (!workout || !exercises) return FAILED

  const typed = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : ''
  if (!typed || typed.length > 80) return 'Exercise names can be up to 80 characters.'
  // Use the catalog's spelling when it's a known exercise ("dumbbell row" → "Dumbbell Row").
  const exercise = findExercise(typed)?.name ?? typed
  if (exercises.some((candidate) => candidate.name.toLowerCase() === exercise.toLowerCase())) {
    return `${exercise} is already in ${workout.name}.`
  }

  const { sets } = targetForName(exercise, workout, DEMO_GOAL)
  return { ...state, workouts: { ...state.workouts, [workoutKey]: [...exercises, { name: exercise, sets }] } }
}

export function removeDemoExercise(state: DemoState, workoutKey: string, exercise: string): DemoState | string {
  const workout = getWorkout(DEMO_SPLIT, workoutKey)
  const exercises = state.workouts[workoutKey]
  if (!workout || !exercises?.some((candidate) => candidate.name === exercise)) return FAILED
  if (exercises.length <= 1) return `You can't delete ${exercise}. ${workout.name} needs at least one exercise.`
  return {
    ...state,
    workouts: { ...state.workouts, [workoutKey]: exercises.filter((candidate) => candidate.name !== exercise) },
  }
}

// ---------------------------------------------------------------------------
// The cookie. A cookie holds about 4 KB, so the state is stored as compact JSON:
//   { d: date, w: weekStartsOn, c: workout, x: { key: [[name, sets]] }, s: [[id, exercise, weight, reps]] }
// ---------------------------------------------------------------------------

export function encodeDemo(state: DemoState) {
  return JSON.stringify({
    d: state.date,
    w: state.weekStartsOn,
    c: state.workout,
    x: Object.fromEntries(
      Object.entries(state.workouts).map(([key, exercises]) => [key, exercises.map((exercise) => [exercise.name, exercise.sets])])
    ),
    s: state.sets.map((set) => [set.id, set.exercise, set.weight, set.reps]),
  })
}

const isName = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '' && value.length <= 80
const isInteger = (value: unknown, min: number, max: number): value is number =>
  Number.isInteger(value) && (value as number) >= min && (value as number) <= max

/** A demo read back from its cookie, or null if there isn't one or it isn't valid. */
export function decodeDemo(json: string | null | undefined): DemoState | null {
  if (!json) return null
  let data
  try {
    data = JSON.parse(json)
  } catch {
    return null
  }
  if (!isValidISODate(data?.d) || (data.w !== 0 && data.w !== 1)) return null
  if (data.c !== undefined && !getWorkout(DEMO_SPLIT, data.c)) return null

  const workouts: DemoState['workouts'] = {}
  for (const { key } of DEMO_SPLIT.workouts) {
    const exercises: unknown = data.x?.[key]
    const valid =
      Array.isArray(exercises) &&
      exercises.length > 0 &&
      exercises.every((exercise) => Array.isArray(exercise) && isName(exercise[0]) && isInteger(exercise[1], 1, 10))
    if (!valid) return null
    workouts[key] = exercises.map(([name, sets]) => ({ name, sets }))
  }

  const sets: unknown = data.s
  const validSets =
    Array.isArray(sets) &&
    sets.every(
      (set) =>
        Array.isArray(set) &&
        isInteger(set[0], 1, Number.MAX_SAFE_INTEGER) &&
        isName(set[1]) &&
        typeof set[2] === 'number' &&
        set[2] >= 0 &&
        set[2] <= 9999 &&
        isInteger(set[3], 1, 999)
    )
  if (!validSets) return null

  return {
    date: data.d,
    weekStartsOn: data.w,
    workout: data.c,
    workouts,
    sets: sets.map(([id, exercise, weight, reps]) => ({ id, exercise, weight, reps })),
  }
}
