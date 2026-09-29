// Common exercises offered when adding one to a workout, with the muscle
// group stored in exercises.muscle_group. Compound lifts get heavier targets.

export type CatalogExercise = { name: string; muscle: string; compound?: boolean }

export const EXERCISES: CatalogExercise[] = [
  // Chest
  { name: 'Bench Press', muscle: 'Chest', compound: true },
  { name: 'Incline Bench Press', muscle: 'Chest', compound: true },
  { name: 'Decline Bench Press', muscle: 'Chest', compound: true },
  { name: 'Dumbbell Bench Press', muscle: 'Chest', compound: true },
  { name: 'Incline Dumbbell Press', muscle: 'Chest', compound: true },
  { name: 'Machine Chest Press', muscle: 'Chest' },
  { name: 'Dumbbell Fly', muscle: 'Chest' },
  { name: 'Cable Fly', muscle: 'Chest' },
  { name: 'Low-to-High Cable Fly', muscle: 'Chest' },
  { name: 'Pec Deck', muscle: 'Chest' },
  { name: 'Chest Dip', muscle: 'Chest', compound: true },
  { name: 'Push-up', muscle: 'Chest' },
  { name: 'Dumbbell Pullover', muscle: 'Chest' },
  // Back
  { name: 'Deadlift', muscle: 'Back', compound: true },
  { name: 'Barbell Row', muscle: 'Back', compound: true },
  { name: 'Pendlay Row', muscle: 'Back', compound: true },
  { name: 'Dumbbell Row', muscle: 'Back' },
  { name: 'T-Bar Row', muscle: 'Back', compound: true },
  { name: 'Chest-Supported Row', muscle: 'Back' },
  { name: 'Seated Cable Row', muscle: 'Back' },
  { name: 'Single-Arm Cable Row', muscle: 'Back' },
  { name: 'Pull-up', muscle: 'Back', compound: true },
  { name: 'Chin-up', muscle: 'Back', compound: true },
  { name: 'Weighted Pull-up', muscle: 'Back', compound: true },
  { name: 'Lat Pulldown', muscle: 'Back' },
  { name: 'Close-Grip Lat Pulldown', muscle: 'Back' },
  { name: 'Straight-Arm Pulldown', muscle: 'Back' },
  { name: 'Inverted Row', muscle: 'Back' },
  { name: 'Back Extension', muscle: 'Back' },
  { name: 'Rack Pull', muscle: 'Back', compound: true },
  // Shoulders
  { name: 'Overhead Press', muscle: 'Shoulders', compound: true },
  { name: 'Push Press', muscle: 'Shoulders', compound: true },
  { name: 'Dumbbell Shoulder Press', muscle: 'Shoulders', compound: true },
  { name: 'Machine Shoulder Press', muscle: 'Shoulders' },
  { name: 'Arnold Press', muscle: 'Shoulders' },
  { name: 'Landmine Press', muscle: 'Shoulders' },
  { name: 'Lateral Raise', muscle: 'Shoulders' },
  { name: 'Cable Lateral Raise', muscle: 'Shoulders' },
  { name: 'Front Raise', muscle: 'Shoulders' },
  { name: 'Rear Delt Fly', muscle: 'Shoulders' },
  { name: 'Reverse Pec Deck', muscle: 'Shoulders' },
  { name: 'Face Pull', muscle: 'Shoulders' },
  { name: 'Upright Row', muscle: 'Shoulders' },
  // Traps
  { name: 'Shrug', muscle: 'Traps' },
  { name: 'Dumbbell Shrug', muscle: 'Traps' },
  { name: "Farmer's Carry", muscle: 'Traps' },
  // Biceps
  { name: 'Barbell Curl', muscle: 'Biceps' },
  { name: 'EZ-Bar Curl', muscle: 'Biceps' },
  { name: 'Dumbbell Curl', muscle: 'Biceps' },
  { name: 'Hammer Curl', muscle: 'Biceps' },
  { name: 'Incline Dumbbell Curl', muscle: 'Biceps' },
  { name: 'Preacher Curl', muscle: 'Biceps' },
  { name: 'Concentration Curl', muscle: 'Biceps' },
  { name: 'Cable Curl', muscle: 'Biceps' },
  { name: 'Spider Curl', muscle: 'Biceps' },
  { name: 'Reverse Curl', muscle: 'Forearms' },
  { name: 'Wrist Curl', muscle: 'Forearms' },
  // Triceps
  { name: 'Close-Grip Bench Press', muscle: 'Triceps', compound: true },
  { name: 'Triceps Dip', muscle: 'Triceps', compound: true },
  { name: 'Triceps Pushdown', muscle: 'Triceps' },
  { name: 'Rope Pushdown', muscle: 'Triceps' },
  { name: 'Skull Crusher', muscle: 'Triceps' },
  { name: 'Overhead Triceps Extension', muscle: 'Triceps' },
  { name: 'Cable Overhead Triceps Extension', muscle: 'Triceps' },
  { name: 'Dumbbell Kickback', muscle: 'Triceps' },
  { name: 'Diamond Push-up', muscle: 'Triceps' },
  // Quads
  { name: 'Back Squat', muscle: 'Quads', compound: true },
  { name: 'Front Squat', muscle: 'Quads', compound: true },
  { name: 'Goblet Squat', muscle: 'Quads' },
  { name: 'Hack Squat', muscle: 'Quads', compound: true },
  { name: 'Smith Machine Squat', muscle: 'Quads', compound: true },
  { name: 'Leg Press', muscle: 'Quads' },
  { name: 'Bulgarian Split Squat', muscle: 'Quads' },
  { name: 'Walking Lunge', muscle: 'Quads' },
  { name: 'Reverse Lunge', muscle: 'Quads' },
  { name: 'Dumbbell Lunge', muscle: 'Quads' },
  { name: 'Step-up', muscle: 'Quads' },
  { name: 'Leg Extension', muscle: 'Quads' },
  // Hamstrings and glutes
  { name: 'Romanian Deadlift', muscle: 'Hamstrings', compound: true },
  { name: 'Stiff-Leg Deadlift', muscle: 'Hamstrings', compound: true },
  { name: 'Sumo Deadlift', muscle: 'Hamstrings', compound: true },
  { name: 'Trap Bar Deadlift', muscle: 'Hamstrings', compound: true },
  { name: 'Good Morning', muscle: 'Hamstrings' },
  { name: 'Leg Curl', muscle: 'Hamstrings' },
  { name: 'Seated Leg Curl', muscle: 'Hamstrings' },
  { name: 'Nordic Curl', muscle: 'Hamstrings' },
  { name: 'Hip Thrust', muscle: 'Glutes', compound: true },
  { name: 'Glute Bridge', muscle: 'Glutes' },
  { name: 'Cable Kickback', muscle: 'Glutes' },
  { name: 'Hip Abduction', muscle: 'Glutes' },
  { name: 'Hip Adduction', muscle: 'Adductors' },
  { name: 'Kettlebell Swing', muscle: 'Glutes' },
  // Calves
  { name: 'Standing Calf Raise', muscle: 'Calves' },
  { name: 'Seated Calf Raise', muscle: 'Calves' },
  { name: 'Leg Press Calf Raise', muscle: 'Calves' },
  // Core
  { name: 'Crunch', muscle: 'Core' },
  { name: 'Cable Crunch', muscle: 'Core' },
  { name: 'Hanging Leg Raise', muscle: 'Core' },
  { name: 'Lying Leg Raise', muscle: 'Core' },
  { name: 'Plank', muscle: 'Core' },
  { name: 'Side Plank', muscle: 'Core' },
  { name: 'Russian Twist', muscle: 'Core' },
  { name: 'Ab Wheel Rollout', muscle: 'Core' },
  { name: 'Dead Bug', muscle: 'Core' },
  { name: 'Pallof Press', muscle: 'Core' },
  { name: 'Sit-up', muscle: 'Core' },
  // Full body
  { name: 'Power Clean', muscle: 'Full body', compound: true },
  { name: 'Clean and Press', muscle: 'Full body', compound: true },
  { name: 'Thruster', muscle: 'Full body', compound: true },
  { name: 'Burpee', muscle: 'Full body' },
  { name: 'Box Jump', muscle: 'Full body' },
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
