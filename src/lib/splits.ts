import { findExercise } from '@/lib/exercises'

// These match the goal_enum and unit_enum types in the database.
export type Goal = 'strength' | 'mass' | 'weight_loss'
export type WeightUnit = 'kg' | 'lbs'

type ExerciseKind = 'compound' | 'accessory'

export type ExerciseTemplate = { name: string; kind: ExerciseKind }

export type Workout = {
  key: string
  name: string
  /** Overrides the user's goal for this workout, e.g. PHUL's power days. */
  focus?: Goal
  exercises: ExerciseTemplate[]
}

export type Split = {
  id: string
  name: string
  description: string
  workouts: Workout[]
  /** Default week, Monday to Sunday: a workout key or REST for each day. */
  schedule: string[]
  /** Default loop for loop mode: workout keys and REST, repeated in order. */
  loop: string[]
}

export const REST = 'rest'

const compound = (name: string): ExerciseTemplate => ({ name, kind: 'compound' })
const accessory = (name: string): ExerciseTemplate => ({ name, kind: 'accessory' })

const legs: Workout = {
  key: 'legs',
  name: 'Legs',
  exercises: [
    compound('Back Squat'),
    compound('Romanian Deadlift'),
    accessory('Leg Press'),
    accessory('Leg Curl'),
    accessory('Standing Calf Raise'),
  ],
}

const upperPower: Workout = {
  key: 'upper-power',
  name: 'Upper Power',
  focus: 'strength',
  exercises: [
    compound('Bench Press'),
    compound('Barbell Row'),
    compound('Overhead Press'),
    compound('Pull-up'),
    accessory('Barbell Curl'),
    accessory('Skull Crusher'),
  ],
}

const lowerPower: Workout = {
  key: 'lower-power',
  name: 'Lower Power',
  focus: 'strength',
  exercises: [
    compound('Back Squat'),
    compound('Deadlift'),
    accessory('Leg Press'),
    accessory('Leg Curl'),
    accessory('Standing Calf Raise'),
  ],
}

const lowerHypertrophy: Workout = {
  key: 'lower-hypertrophy',
  name: 'Lower Hypertrophy',
  focus: 'mass',
  exercises: [
    compound('Front Squat'),
    accessory('Walking Lunge'),
    accessory('Leg Extension'),
    accessory('Leg Curl'),
    accessory('Seated Calf Raise'),
  ],
}

export const SPLITS: Split[] = [
  {
    id: 'ppl',
    name: 'Push / Pull / Legs',
    description: 'Each muscle group twice a week, grouped by movement.',
    workouts: [
      {
        key: 'push',
        name: 'Push',
        exercises: [
          compound('Bench Press'),
          compound('Overhead Press'),
          accessory('Incline Dumbbell Press'),
          accessory('Lateral Raise'),
          accessory('Triceps Pushdown'),
        ],
      },
      {
        key: 'pull',
        name: 'Pull',
        exercises: [
          compound('Barbell Row'),
          compound('Pull-up'),
          accessory('Seated Cable Row'),
          accessory('Face Pull'),
          accessory('Hammer Curl'),
        ],
      },
      legs,
    ],
    schedule: ['push', 'pull', 'legs', 'push', 'pull', 'legs', REST],
    loop: ['push', 'pull', 'legs', REST],
  },
  {
    id: 'upper-lower',
    name: 'Upper / Lower',
    description: 'Four balanced days alternating upper and lower body.',
    workouts: [
      {
        key: 'upper',
        name: 'Upper',
        exercises: [
          compound('Bench Press'),
          compound('Barbell Row'),
          compound('Overhead Press'),
          accessory('Lat Pulldown'),
          accessory('Dumbbell Curl'),
          accessory('Triceps Pushdown'),
        ],
      },
      {
        key: 'lower',
        name: 'Lower',
        exercises: [
          compound('Back Squat'),
          compound('Romanian Deadlift'),
          accessory('Walking Lunge'),
          accessory('Leg Curl'),
          accessory('Standing Calf Raise'),
        ],
      },
    ],
    schedule: ['upper', 'lower', REST, 'upper', 'lower', REST, REST],
    loop: ['upper', REST, 'lower', REST],
  },
  {
    id: 'full-body',
    name: 'Full Body',
    description: 'Three efficient sessions that hit everything.',
    workouts: [
      {
        key: 'full-a',
        name: 'Full Body A',
        exercises: [
          compound('Back Squat'),
          compound('Bench Press'),
          compound('Barbell Row'),
          accessory('Lateral Raise'),
          accessory('Barbell Curl'),
        ],
      },
      {
        key: 'full-b',
        name: 'Full Body B',
        exercises: [
          compound('Deadlift'),
          compound('Overhead Press'),
          compound('Pull-up'),
          accessory('Leg Press'),
          accessory('Triceps Dip'),
        ],
      },
    ],
    schedule: ['full-a', REST, 'full-b', REST, 'full-a', REST, REST],
    loop: ['full-a', REST, 'full-b', REST],
  },
  {
    id: 'bro',
    name: 'Bro Split',
    description: 'One muscle group per day for maximum focus.',
    workouts: [
      {
        key: 'chest',
        name: 'Chest',
        exercises: [
          compound('Bench Press'),
          compound('Incline Dumbbell Press'),
          accessory('Cable Fly'),
          accessory('Chest Dip'),
        ],
      },
      {
        key: 'back',
        name: 'Back',
        exercises: [
          compound('Deadlift'),
          compound('Pull-up'),
          compound('Barbell Row'),
          accessory('Lat Pulldown'),
          accessory('Seated Cable Row'),
        ],
      },
      {
        key: 'shoulders',
        name: 'Shoulders',
        exercises: [
          compound('Overhead Press'),
          accessory('Arnold Press'),
          accessory('Lateral Raise'),
          accessory('Rear Delt Fly'),
          accessory('Shrug'),
        ],
      },
      {
        key: 'legs',
        name: 'Legs',
        exercises: [
          compound('Back Squat'),
          compound('Romanian Deadlift'),
          accessory('Leg Press'),
          accessory('Leg Extension'),
          accessory('Leg Curl'),
          accessory('Standing Calf Raise'),
        ],
      },
      {
        key: 'arms',
        name: 'Arms',
        exercises: [
          compound('Close-Grip Bench Press'),
          accessory('Barbell Curl'),
          accessory('Skull Crusher'),
          accessory('Hammer Curl'),
          accessory('Triceps Pushdown'),
        ],
      },
    ],
    schedule: ['chest', 'back', 'shoulders', 'legs', 'arms', REST, REST],
    loop: ['chest', 'back', 'shoulders', 'legs', 'arms', REST],
  },
  {
    id: 'arnold',
    name: 'Arnold Split',
    description: 'Chest with back, shoulders with arms, then legs, twice a week.',
    workouts: [
      {
        key: 'chest-back',
        name: 'Chest & Back',
        exercises: [
          compound('Bench Press'),
          compound('Pull-up'),
          compound('Barbell Row'),
          accessory('Incline Dumbbell Press'),
          accessory('Dumbbell Pullover'),
        ],
      },
      {
        key: 'shoulders-arms',
        name: 'Shoulders & Arms',
        exercises: [
          compound('Overhead Press'),
          accessory('Lateral Raise'),
          accessory('Barbell Curl'),
          accessory('Skull Crusher'),
          accessory('Hammer Curl'),
        ],
      },
      legs,
    ],
    schedule: ['chest-back', 'shoulders-arms', 'legs', 'chest-back', 'shoulders-arms', 'legs', REST],
    loop: ['chest-back', 'shoulders-arms', 'legs', REST],
  },
  {
    id: 'phul',
    name: 'PHUL',
    description: 'Power Hypertrophy Upper Lower: heavy days and volume days.',
    workouts: [
      upperPower,
      lowerPower,
      {
        key: 'upper-hypertrophy',
        name: 'Upper Hypertrophy',
        focus: 'mass',
        exercises: [
          accessory('Incline Dumbbell Press'),
          accessory('Cable Fly'),
          accessory('Seated Cable Row'),
          accessory('Lat Pulldown'),
          accessory('Lateral Raise'),
          accessory('Dumbbell Curl'),
          accessory('Triceps Pushdown'),
        ],
      },
      lowerHypertrophy,
    ],
    schedule: ['upper-power', 'lower-power', REST, 'upper-hypertrophy', 'lower-hypertrophy', REST, REST],
    loop: ['upper-power', 'lower-power', REST, 'upper-hypertrophy', 'lower-hypertrophy', REST],
  },
  {
    id: 'phat',
    name: 'PHAT',
    description: 'Power Hypertrophy Adaptive Training: two power days, three volume days.',
    workouts: [
      upperPower,
      lowerPower,
      {
        key: 'back-shoulders',
        name: 'Back & Shoulders',
        focus: 'mass',
        exercises: [
          compound('Barbell Row'),
          compound('Pull-up'),
          accessory('Seated Cable Row'),
          accessory('Dumbbell Shoulder Press'),
          accessory('Lateral Raise'),
          accessory('Rear Delt Fly'),
        ],
      },
      lowerHypertrophy,
      {
        key: 'chest-arms',
        name: 'Chest & Arms',
        focus: 'mass',
        exercises: [
          compound('Dumbbell Bench Press'),
          accessory('Incline Dumbbell Press'),
          accessory('Cable Fly'),
          accessory('Barbell Curl'),
          accessory('Skull Crusher'),
          accessory('Hammer Curl'),
        ],
      },
    ],
    schedule: ['upper-power', 'lower-power', REST, 'back-shoulders', 'lower-hypertrophy', 'chest-arms', REST],
    loop: ['upper-power', 'lower-power', REST, 'back-shoulders', 'lower-hypertrophy', 'chest-arms', REST],
  },
  {
    id: 'push-pull',
    name: 'Push / Pull',
    description: 'Four days split by movement pattern, legs included.',
    workouts: [
      {
        key: 'push',
        name: 'Push',
        exercises: [
          compound('Back Squat'),
          compound('Bench Press'),
          compound('Overhead Press'),
          accessory('Leg Extension'),
          accessory('Triceps Pushdown'),
        ],
      },
      {
        key: 'pull',
        name: 'Pull',
        exercises: [
          compound('Deadlift'),
          compound('Pull-up'),
          compound('Barbell Row'),
          accessory('Leg Curl'),
          accessory('Barbell Curl'),
        ],
      },
    ],
    schedule: ['push', 'pull', REST, 'push', 'pull', REST, REST],
    loop: ['push', 'pull', REST],
  },
  {
    id: 'torso-limbs',
    name: 'Torso / Limbs',
    description: 'Chest, back and shoulders one day; arms and legs the next.',
    workouts: [
      {
        key: 'torso',
        name: 'Torso',
        exercises: [
          compound('Bench Press'),
          compound('Barbell Row'),
          compound('Overhead Press'),
          accessory('Lat Pulldown'),
          accessory('Cable Fly'),
        ],
      },
      {
        key: 'limbs',
        name: 'Limbs',
        exercises: [
          compound('Back Squat'),
          compound('Romanian Deadlift'),
          accessory('Barbell Curl'),
          accessory('Skull Crusher'),
          accessory('Standing Calf Raise'),
        ],
      },
    ],
    schedule: ['torso', 'limbs', REST, 'torso', 'limbs', REST, REST],
    loop: ['torso', 'limbs', REST],
  },
]

export function getSplit(id: string | null | undefined) {
  return SPLITS.find((split) => split.id === id)
}

export function getWorkout(split: Split | undefined, key: string | null | undefined) {
  return split?.workouts.find((workout) => workout.key === key)
}

export function trainingDaysPerWeek(schedule: string[]) {
  return schedule.filter((day) => day !== REST).length
}

export const GOALS: { id: Goal; label: string; description: string }[] = [
  { id: 'strength', label: 'Strength', description: 'Heavy weights, low reps' },
  { id: 'mass', label: 'Muscle', description: 'Moderate weights, more volume' },
  { id: 'weight_loss', label: 'Weight loss', description: 'Lighter weights, high reps' },
]

const TARGETS: Record<Goal, Record<ExerciseKind, { sets: number; reps: number }>> = {
  strength: { compound: { sets: 5, reps: 5 }, accessory: { sets: 3, reps: 8 } },
  mass: { compound: { sets: 4, reps: 8 }, accessory: { sets: 3, reps: 12 } },
  weight_loss: { compound: { sets: 3, reps: 12 }, accessory: { sets: 3, reps: 15 } },
}

/** Sets and reps to aim for, based on the workout's focus or the user's goal. */
export function targetFor(exercise: ExerciseTemplate, workout: Workout, goal: Goal) {
  return TARGETS[workout.focus ?? goal][exercise.kind]
}

/**
 * Targets for any exercise by name: its kind in the built-in workout if it's
 * listed there, else the catalog's, else treated as an accessory.
 */
export function targetForName(name: string, workout: Workout | undefined, goal: Goal) {
  const listed = workout?.exercises.find((exercise) => exercise.name === name)
  const kind = listed?.kind ?? (findExercise(name)?.compound ? 'compound' : 'accessory')
  return TARGETS[workout?.focus ?? goal][kind]
}
