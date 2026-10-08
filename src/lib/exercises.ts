// Common exercises offered when adding one to a workout, with the muscle
// group stored in exercises.muscle_group. Compound lifts get heavier targets.

/** Muscle groups the analysis counts sets for, in display order. */
export const MUSCLES = {
  chest: 'Chest',
  back: 'Back',
  frontDelts: 'Front delts',
  sideDelts: 'Side delts',
  rearDelts: 'Rear delts',
  traps: 'Traps',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  abs: 'Abs',
  lowerBack: 'Lower back',
  glutes: 'Glutes',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  adductors: 'Adductors',
  calves: 'Calves',
} as const

export type Muscle = keyof typeof MUSCLES

/**
 * `muscles` is how much one set works each muscle: 1 for a prime mover, 0.5
 * for a strong synergist, 0.25 for a minor or mostly isometric one. "back" is
 * the lats and mid back; spinal erectors are "lowerBack". Squats leave out the
 * hamstrings, which barely change length in a squat and don't grow from it.
 */
export type CatalogExercise = {
  name: string
  muscle: string
  compound?: boolean
  muscles: Partial<Record<Muscle, number>>
}

export const EXERCISES: CatalogExercise[] = [
  // Chest
  { name: 'Bench Press', muscle: 'Chest', compound: true, muscles: { chest: 1, frontDelts: 0.5, triceps: 0.5 } },
  { name: 'Incline Bench Press', muscle: 'Chest', compound: true, muscles: { chest: 1, frontDelts: 0.75, triceps: 0.5 } },
  { name: 'Decline Bench Press', muscle: 'Chest', compound: true, muscles: { chest: 1, triceps: 0.5, frontDelts: 0.25 } },
  { name: 'Dumbbell Bench Press', muscle: 'Chest', compound: true, muscles: { chest: 1, frontDelts: 0.5, triceps: 0.5 } },
  { name: 'Incline Dumbbell Press', muscle: 'Chest', compound: true, muscles: { chest: 1, frontDelts: 0.75, triceps: 0.5 } },
  { name: 'Machine Chest Press', muscle: 'Chest', muscles: { chest: 1, frontDelts: 0.5, triceps: 0.5 } },
  { name: 'Dumbbell Fly', muscle: 'Chest', muscles: { chest: 1, frontDelts: 0.25 } },
  { name: 'Cable Fly', muscle: 'Chest', muscles: { chest: 1, frontDelts: 0.25 } },
  { name: 'Low-to-High Cable Fly', muscle: 'Chest', muscles: { chest: 1, frontDelts: 0.5 } },
  { name: 'Pec Deck', muscle: 'Chest', muscles: { chest: 1, frontDelts: 0.25 } },
  { name: 'Chest Dip', muscle: 'Chest', compound: true, muscles: { chest: 1, triceps: 0.75, frontDelts: 0.5 } },
  { name: 'Push-up', muscle: 'Chest', muscles: { chest: 1, triceps: 0.5, frontDelts: 0.5, abs: 0.25 } },
  { name: 'Dumbbell Pullover', muscle: 'Chest', muscles: { chest: 0.75, back: 0.75, triceps: 0.25 } },
  // Back
  { name: 'Deadlift', muscle: 'Back', compound: true, muscles: { glutes: 1, lowerBack: 1, hamstrings: 0.75, quads: 0.5, adductors: 0.5, traps: 0.5, back: 0.25, forearms: 0.25 } },
  { name: 'Barbell Row', muscle: 'Back', compound: true, muscles: { back: 1, rearDelts: 0.5, biceps: 0.5, lowerBack: 0.5, forearms: 0.25 } },
  { name: 'Pendlay Row', muscle: 'Back', compound: true, muscles: { back: 1, rearDelts: 0.5, biceps: 0.5, lowerBack: 0.5, forearms: 0.25 } },
  { name: 'Dumbbell Row', muscle: 'Back', muscles: { back: 1, rearDelts: 0.5, biceps: 0.5, forearms: 0.25 } },
  { name: 'T-Bar Row', muscle: 'Back', compound: true, muscles: { back: 1, rearDelts: 0.5, biceps: 0.5, lowerBack: 0.5, forearms: 0.25 } },
  { name: 'Chest-Supported Row', muscle: 'Back', muscles: { back: 1, rearDelts: 0.5, biceps: 0.5 } },
  { name: 'Seated Cable Row', muscle: 'Back', muscles: { back: 1, rearDelts: 0.5, biceps: 0.5 } },
  { name: 'Single-Arm Cable Row', muscle: 'Back', muscles: { back: 1, biceps: 0.5, rearDelts: 0.25 } },
  { name: 'Pull-up', muscle: 'Back', compound: true, muscles: { back: 1, biceps: 0.5, rearDelts: 0.25, forearms: 0.25 } },
  { name: 'Chin-up', muscle: 'Back', compound: true, muscles: { back: 1, biceps: 0.75, forearms: 0.25 } },
  { name: 'Weighted Pull-up', muscle: 'Back', compound: true, muscles: { back: 1, biceps: 0.5, rearDelts: 0.25, forearms: 0.25 } },
  { name: 'Lat Pulldown', muscle: 'Back', muscles: { back: 1, biceps: 0.5, rearDelts: 0.25 } },
  { name: 'Close-Grip Lat Pulldown', muscle: 'Back', muscles: { back: 1, biceps: 0.5 } },
  { name: 'Straight-Arm Pulldown', muscle: 'Back', muscles: { back: 1, triceps: 0.25 } },
  { name: 'Inverted Row', muscle: 'Back', muscles: { back: 1, rearDelts: 0.5, biceps: 0.5 } },
  { name: 'Back Extension', muscle: 'Back', muscles: { lowerBack: 1, glutes: 0.75, hamstrings: 0.75 } },
  { name: 'Rack Pull', muscle: 'Back', compound: true, muscles: { lowerBack: 1, traps: 0.75, back: 0.5, glutes: 0.5, hamstrings: 0.25, forearms: 0.5 } },
  // Shoulders
  { name: 'Overhead Press', muscle: 'Shoulders', compound: true, muscles: { frontDelts: 1, sideDelts: 0.5, triceps: 0.5, traps: 0.25, abs: 0.25 } },
  { name: 'Push Press', muscle: 'Shoulders', compound: true, muscles: { frontDelts: 1, sideDelts: 0.5, triceps: 0.5, traps: 0.25, quads: 0.25 } },
  { name: 'Dumbbell Shoulder Press', muscle: 'Shoulders', compound: true, muscles: { frontDelts: 1, sideDelts: 0.5, triceps: 0.5 } },
  { name: 'Machine Shoulder Press', muscle: 'Shoulders', muscles: { frontDelts: 1, sideDelts: 0.5, triceps: 0.5 } },
  { name: 'Arnold Press', muscle: 'Shoulders', muscles: { frontDelts: 1, sideDelts: 0.5, triceps: 0.5 } },
  { name: 'Landmine Press', muscle: 'Shoulders', muscles: { frontDelts: 1, chest: 0.5, triceps: 0.5 } },
  { name: 'Lateral Raise', muscle: 'Shoulders', muscles: { sideDelts: 1, traps: 0.25 } },
  { name: 'Cable Lateral Raise', muscle: 'Shoulders', muscles: { sideDelts: 1, traps: 0.25 } },
  { name: 'Front Raise', muscle: 'Shoulders', muscles: { frontDelts: 1, sideDelts: 0.25 } },
  { name: 'Rear Delt Fly', muscle: 'Shoulders', muscles: { rearDelts: 1, back: 0.25 } },
  { name: 'Reverse Pec Deck', muscle: 'Shoulders', muscles: { rearDelts: 1, back: 0.25 } },
  { name: 'Face Pull', muscle: 'Shoulders', muscles: { rearDelts: 1, back: 0.25, traps: 0.25 } },
  { name: 'Upright Row', muscle: 'Shoulders', muscles: { sideDelts: 1, traps: 0.75, frontDelts: 0.25, biceps: 0.25 } },
  // Traps
  { name: 'Shrug', muscle: 'Traps', muscles: { traps: 1, forearms: 0.25 } },
  { name: 'Dumbbell Shrug', muscle: 'Traps', muscles: { traps: 1, forearms: 0.25 } },
  { name: "Farmer's Carry", muscle: 'Traps', muscles: { forearms: 1, traps: 1, abs: 0.5 } },
  // Biceps
  { name: 'Barbell Curl', muscle: 'Biceps', muscles: { biceps: 1, forearms: 0.25 } },
  { name: 'EZ-Bar Curl', muscle: 'Biceps', muscles: { biceps: 1, forearms: 0.25 } },
  { name: 'Dumbbell Curl', muscle: 'Biceps', muscles: { biceps: 1, forearms: 0.25 } },
  { name: 'Hammer Curl', muscle: 'Biceps', muscles: { biceps: 1, forearms: 0.5 } },
  { name: 'Incline Dumbbell Curl', muscle: 'Biceps', muscles: { biceps: 1 } },
  { name: 'Preacher Curl', muscle: 'Biceps', muscles: { biceps: 1 } },
  { name: 'Concentration Curl', muscle: 'Biceps', muscles: { biceps: 1 } },
  { name: 'Cable Curl', muscle: 'Biceps', muscles: { biceps: 1 } },
  { name: 'Spider Curl', muscle: 'Biceps', muscles: { biceps: 1 } },
  { name: 'Reverse Curl', muscle: 'Forearms', muscles: { forearms: 1, biceps: 0.5 } },
  { name: 'Wrist Curl', muscle: 'Forearms', muscles: { forearms: 1 } },
  // Triceps
  { name: 'Close-Grip Bench Press', muscle: 'Triceps', compound: true, muscles: { triceps: 1, chest: 0.75, frontDelts: 0.5 } },
  { name: 'Triceps Dip', muscle: 'Triceps', compound: true, muscles: { triceps: 1, chest: 0.5, frontDelts: 0.5 } },
  { name: 'Triceps Pushdown', muscle: 'Triceps', muscles: { triceps: 1 } },
  { name: 'Rope Pushdown', muscle: 'Triceps', muscles: { triceps: 1 } },
  { name: 'Skull Crusher', muscle: 'Triceps', muscles: { triceps: 1 } },
  { name: 'Overhead Triceps Extension', muscle: 'Triceps', muscles: { triceps: 1 } },
  { name: 'Cable Overhead Triceps Extension', muscle: 'Triceps', muscles: { triceps: 1 } },
  { name: 'Dumbbell Kickback', muscle: 'Triceps', muscles: { triceps: 1 } },
  { name: 'Diamond Push-up', muscle: 'Triceps', muscles: { triceps: 1, chest: 0.75, frontDelts: 0.5 } },
  // Quads
  { name: 'Back Squat', muscle: 'Quads', compound: true, muscles: { quads: 1, glutes: 0.75, adductors: 0.5, lowerBack: 0.25 } },
  { name: 'Front Squat', muscle: 'Quads', compound: true, muscles: { quads: 1, glutes: 0.5, adductors: 0.5, abs: 0.25 } },
  { name: 'Goblet Squat', muscle: 'Quads', muscles: { quads: 1, glutes: 0.5, adductors: 0.5 } },
  { name: 'Hack Squat', muscle: 'Quads', compound: true, muscles: { quads: 1, glutes: 0.5, adductors: 0.25 } },
  { name: 'Smith Machine Squat', muscle: 'Quads', compound: true, muscles: { quads: 1, glutes: 0.5, adductors: 0.25 } },
  { name: 'Leg Press', muscle: 'Quads', muscles: { quads: 1, glutes: 0.5, adductors: 0.5 } },
  { name: 'Bulgarian Split Squat', muscle: 'Quads', muscles: { quads: 1, glutes: 0.75, adductors: 0.5 } },
  { name: 'Walking Lunge', muscle: 'Quads', muscles: { quads: 1, glutes: 0.75, adductors: 0.5 } },
  { name: 'Reverse Lunge', muscle: 'Quads', muscles: { quads: 1, glutes: 0.75, adductors: 0.5 } },
  { name: 'Dumbbell Lunge', muscle: 'Quads', muscles: { quads: 1, glutes: 0.75, adductors: 0.5 } },
  { name: 'Step-up', muscle: 'Quads', muscles: { quads: 1, glutes: 0.75 } },
  { name: 'Leg Extension', muscle: 'Quads', muscles: { quads: 1 } },
  // Hamstrings and glutes
  { name: 'Romanian Deadlift', muscle: 'Hamstrings', compound: true, muscles: { hamstrings: 1, glutes: 0.75, lowerBack: 0.5, adductors: 0.5, forearms: 0.25 } },
  { name: 'Stiff-Leg Deadlift', muscle: 'Hamstrings', compound: true, muscles: { hamstrings: 1, lowerBack: 0.75, glutes: 0.5, forearms: 0.25 } },
  { name: 'Sumo Deadlift', muscle: 'Hamstrings', compound: true, muscles: { glutes: 1, quads: 0.75, adductors: 0.75, lowerBack: 0.75, hamstrings: 0.5, traps: 0.5, forearms: 0.25 } },
  { name: 'Trap Bar Deadlift', muscle: 'Hamstrings', compound: true, muscles: { glutes: 1, quads: 0.75, lowerBack: 0.75, hamstrings: 0.5, traps: 0.5, forearms: 0.25 } },
  { name: 'Good Morning', muscle: 'Hamstrings', muscles: { hamstrings: 1, lowerBack: 1, glutes: 0.75 } },
  { name: 'Leg Curl', muscle: 'Hamstrings', muscles: { hamstrings: 1 } },
  { name: 'Seated Leg Curl', muscle: 'Hamstrings', muscles: { hamstrings: 1 } },
  { name: 'Nordic Curl', muscle: 'Hamstrings', muscles: { hamstrings: 1 } },
  { name: 'Hip Thrust', muscle: 'Glutes', compound: true, muscles: { glutes: 1, hamstrings: 0.25, quads: 0.25 } },
  { name: 'Glute Bridge', muscle: 'Glutes', muscles: { glutes: 1, hamstrings: 0.25 } },
  { name: 'Cable Kickback', muscle: 'Glutes', muscles: { glutes: 1, hamstrings: 0.25 } },
  { name: 'Hip Abduction', muscle: 'Glutes', muscles: { glutes: 1 } },
  { name: 'Hip Adduction', muscle: 'Adductors', muscles: { adductors: 1 } },
  { name: 'Kettlebell Swing', muscle: 'Glutes', muscles: { glutes: 1, hamstrings: 0.75, lowerBack: 0.5, abs: 0.25, forearms: 0.25 } },
  // Calves
  { name: 'Standing Calf Raise', muscle: 'Calves', muscles: { calves: 1 } },
  { name: 'Seated Calf Raise', muscle: 'Calves', muscles: { calves: 1 } },
  { name: 'Leg Press Calf Raise', muscle: 'Calves', muscles: { calves: 1 } },
  // Core
  { name: 'Crunch', muscle: 'Core', muscles: { abs: 1 } },
  { name: 'Cable Crunch', muscle: 'Core', muscles: { abs: 1 } },
  { name: 'Hanging Leg Raise', muscle: 'Core', muscles: { abs: 1, forearms: 0.25 } },
  { name: 'Lying Leg Raise', muscle: 'Core', muscles: { abs: 1 } },
  { name: 'Plank', muscle: 'Core', muscles: { abs: 1 } },
  { name: 'Side Plank', muscle: 'Core', muscles: { abs: 1 } },
  { name: 'Russian Twist', muscle: 'Core', muscles: { abs: 1 } },
  { name: 'Ab Wheel Rollout', muscle: 'Core', muscles: { abs: 1, back: 0.25 } },
  { name: 'Dead Bug', muscle: 'Core', muscles: { abs: 1 } },
  { name: 'Pallof Press', muscle: 'Core', muscles: { abs: 1 } },
  { name: 'Sit-up', muscle: 'Core', muscles: { abs: 1 } },
  // Full body
  { name: 'Power Clean', muscle: 'Full body', compound: true, muscles: { glutes: 0.75, traps: 0.75, quads: 0.5, hamstrings: 0.5, lowerBack: 0.5, calves: 0.25 } },
  { name: 'Clean and Press', muscle: 'Full body', compound: true, muscles: { frontDelts: 0.75, traps: 0.75, glutes: 0.5, quads: 0.5, hamstrings: 0.5, triceps: 0.5, lowerBack: 0.5 } },
  { name: 'Thruster', muscle: 'Full body', compound: true, muscles: { quads: 1, frontDelts: 0.75, glutes: 0.75, triceps: 0.5, adductors: 0.25 } },
  { name: 'Burpee', muscle: 'Full body', muscles: { quads: 0.5, chest: 0.5, glutes: 0.25, triceps: 0.25, frontDelts: 0.25, abs: 0.25 } },
  { name: 'Box Jump', muscle: 'Full body', muscles: { quads: 0.5, glutes: 0.5, calves: 0.5 } },
]

const byName = new Map(EXERCISES.map((exercise) => [exercise.name.toLowerCase(), exercise]))

export function findExercise(name: string) {
  return byName.get(name.trim().toLowerCase())
}

// Gym shorthand people type.
const ALIASES: Record<string, string> = {
  db: 'dumbbell',
  bb: 'barbell',
  kb: 'kettlebell',
  ez: 'ez bar',
  ohp: 'overhead press',
  rdl: 'romanian deadlift',
  sldl: 'stiff leg deadlift',
  bss: 'bulgarian split squat',
  cgbp: 'close grip bench press',
  abs: 'core',
}

/** Lowercase letters and digits only, with doubled letters collapsed ("Dumbbell" → "dumbel"). */
function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/(.)\1+/g, '$1')
}

/**
 * Catalog exercises matching what the user typed, best matches first.
 * Every typed word has to appear in the name or muscle group, so typos with
 * doubled letters still match ("dumbell" finds "Dumbbell Curl").
 */
export function searchExercises(query: string, limit = 8) {
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .flatMap((word) => (ALIASES[word] ?? word).split(' '))
    .map(normalize)
    .filter(Boolean)
  if (words.length === 0) return EXERCISES.slice(0, limit)

  const first = words[0]
  return EXERCISES.map((exercise) => {
    const name = normalize(exercise.name)
    const haystack = name + normalize(exercise.muscle)
    if (!words.every((word) => haystack.includes(word))) return null
    const nameWords = exercise.name.toLowerCase().split(/[\s-]+/).map(normalize)
    // Rank: name starts with the query, then a word in the name does, then anything else.
    const rank = name.startsWith(first) ? 0 : nameWords.some((word) => word.startsWith(first)) ? 1 : 2
    return { exercise, rank }
  })
    .filter((match) => match !== null)
    .sort((a, b) => a.rank - b.rank || a.exercise.name.localeCompare(b.exercise.name))
    .slice(0, limit)
    .map((match) => match.exercise)
}
