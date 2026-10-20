import { estimatedMax, type Analysis, type LoggedSet } from '@/lib/analysis'
import { weekdayLabels } from '@/lib/dates'
import { findExercise, MUSCLES, type Muscle } from '@/lib/exercises'
import type { Goal } from '@/lib/splits'
import { planFor, type Plan, type PlanHistory, type Profile, type WeighIn } from '@/lib/training'
import { formatNumber, fromKg } from '@/lib/units'

// The Insights coach's system prompt: how to answer, then the user's data as
// plain text. The model only reads this. It gets no tools, so it can't query
// or change anything.

export type CoachMessage = { role: 'user' | 'model'; text: string }

const GOALS: Record<Goal, string> = {
  strength: 'get stronger',
  mass: 'build muscle',
  weight_loss: 'lose weight',
}

const INSTRUCTIONS = `You are the coach in PlateMate, a workout tracker. You answer the user's questions about their own training, using their data below: their goal, current plan, the app's analysis, weigh-ins and workout log.

How to answer:
- Read the data before you answer. Back every claim with numbers from it: sets a week, weights, reps, dates, percentages. Never make up data. If the data can't answer the question, say what's missing and what they should log.
- Look for causes, not just symptoms. When a lift is stuck, or they aren't getting stronger or bigger, check each of these and name the ones that apply, most likely first:
  1. Is it really stuck? Follow its e1RM across the dates in the workout log, and its line in "Lift trends".
  2. The muscles behind it. Is each getting enough weekly sets? Under 4 is too few, about 10 to 20 is typical for growth. Bench press is driven by chest, triceps and front delts; overhead press by front delts and triceps; squat by quads and glutes; deadlift by glutes, hamstrings and lower back; rows and pull-ups by back and biceps.
  3. Practice and progression. How many times a week they do the lift, and whether the weight or reps ever go up. The same weight and reps session after session means no progressive overload.
  4. Reps against the goal. Strength comes from heavy sets of about 3 to 6 reps; muscle from sets of about 6 to 12 taken close to failure.
  5. Following the plan: plan done %, muscles being skipped, missed sets.
  6. Body weight against the goal. Losing weight, or not gaining while trying to build muscle, slows strength and muscle gain.
  7. Balance problems, and too much work: more than about 25 sets a week for one muscle can outpace recovery.
- End with 1 to 3 specific changes: which exercises, how many sets and reps.
- For questions about overall progress, compare their lift trends, weekly sets and body weight against their goal.
- Stay on their training, recovery, body weight and basic nutrition. For anything else, say you can only help with their training. Don't give medical advice: for pain or injury, tell them to see a doctor or physical therapist.
- You can't change their plan or logs. Tell them what to change, and they'll change it in the app.

How to write:
- Keep it under 150 words unless they ask for more detail or a full plan. Plain, friendly and direct, speaking to them as "you".
- Lead with the answer. Use "- " bullets for lists and **bold** for the key point. No headings, no tables.
- Give weights in their unit, as in the data.`

/** The coach's system prompt, with the user's data. `sets`, `weighIns` and `analysis` are what getInsights() returns. */
export function coachPrompt({
  profile,
  history,
  today,
  sets,
  weighIns,
  analysis,
}: {
  profile: Profile
  history: PlanHistory
  today: string
  sets: LoggedSet[]
  weighIns: WeighIn[]
  analysis: Analysis | null
}) {
  const unit = profile.unit_preference
  const weight = (kg: number) => formatNumber(fromKg(kg, unit))

  return [
    INSTRUCTIONS,
    '',
    "# The user's data",
    `Today is ${today}. Their goal: ${GOALS[profile.goal]}. Weights are in ${unit}.`,
    '',
    '## Current plan',
    ...planLines(planFor(history, today)!),
    '',
    '## Analysis',
    ...(analysis ? analysisLines(analysis, weight) : ['Not enough training logged yet to analyze.']),
    '',
    `## Weigh-ins (${unit}), oldest first`,
    weighIns.length > 0
      ? weighIns.map((weighIn) => `${weighIn.date}: ${weight(weighIn.weight_kg)}`).join(', ')
      : 'None logged.',
    '',
    '## Workout log',
    ...logLines(sets, weight),
  ].join('\n')
}

function planLines(plan: Plan) {
  const weekdays = weekdayLabels(0)
  const schedule =
    plan.scheduleType === 'loop'
      ? `a loop of ${plan.loop.length} days, repeating: ${plan.loop.map((day) => day?.name ?? 'Rest').join(', ')}`
      : 'weekly'
  return [
    `"${plan.name}", ${schedule}. Each exercise is sets×reps.`,
    ...plan.days.map((day) => {
      const when = plan.scheduleType === 'weekly' ? ` (${day.weekdays.toSorted().map((weekday) => weekdays[weekday]).join(', ') || 'not scheduled'})` : ''
      const exercises = day.exercises.map((exercise) => `${exercise.name} ${exercise.targetSets ?? '?'}×${exercise.targetReps ?? '?'}`)
      return `- ${day.name}${when}: ${exercises.join(', ') || 'no exercises'}`
    }),
  ]
}

function analysisLines(analysis: Analysis, weight: (kg: number) => string) {
  const n = (value?: number) => (value === undefined ? 'n/a' : formatNumber(value))
  const best = (lift: Analysis['lifts'][number], value?: number) =>
    value === undefined ? 'not done' : lift.bodyweight ? `${value} reps` : weight(value)
  return [
    `From ${analysis.from} to ${analysis.to} (${analysis.days} days). "Done" is the average a week over these days; "planned" is a week of the current plan.`,
    analysis.completion === undefined
      ? 'Nothing was planned over these days.'
      : `They did ${Math.round(analysis.completion * 100)}% of the sets planned over these days.`,
    `Sets a week: ${n(analysis.actualSets)} done, ${n(analysis.plannedSets)} planned.`,
    '',
    'Weekly sets per muscle, done / planned, with the exercises behind them. A set counts 1 for a muscle it mainly works, 0.5 for a strong helper, 0.25 for a minor one:',
    ...analysis.muscles.map((row) => {
      const exercises = row.exercises.map((entry) => `${entry.exercise} ${n(entry.actual)} / ${n(entry.planned)}`)
      return `- ${MUSCLES[row.muscle]}: ${n(row.actual)} / ${n(row.planned)}${row.skipped ? ', being skipped' : ''}${exercises.length > 0 ? ` (${exercises.join('; ')})` : ''}`
    }),
    '',
    'Balance, sets of the first group per set of the second, done / planned:',
    ...analysis.ratios.map(
      (ratio) =>
        `- ${ratio.label}: ${n(ratio.actual)} / ${n(ratio.planned)}, aim for ${ratio.max === Infinity ? `at least ${ratio.min}` : `${ratio.min} to ${ratio.max}`}`
    ),
    '',
    'Lift trends, best estimated 1-rep max (best reps for bodyweight lifts):',
    ...analysis.lifts.map(
      (lift) =>
        `- ${lift.exercise}: ${best(lift, lift.current)} in the last 4 weeks, ${best(lift, lift.previous)} in the 8 weeks before, ${best(lift, lift.lastYear)} in the same 4 weeks last year. ${lift.status}`
    ),
    '',
    'Problems the app flagged:',
    ...(analysis.issues.length > 0
      ? analysis.issues.map((issue) => `- ${issue.severity === 'high' ? 'Serious' : 'Minor'}: ${issue.title}. ${issue.detail}`)
      : ['- None']),
  ]
}

/** Every set by exercise, the most-logged exercise first, each day on its own line. */
function logLines(sets: LoggedSet[], weight: (kg: number) => string) {
  if (sets.length === 0) return ['Nothing logged.']
  const exercises = [...Map.groupBy(sets.toSorted((a, b) => a.date.localeCompare(b.date)), (set) => set.exercise)]
  return [
    'Completed workouts from the last 12 weeks and the same 4 weeks a year ago, oldest first. Each set is weight×reps, "bw" for bodyweight. e1RM is the best estimated 1-rep max that day.',
    ...exercises
      .sort((a, b) => b[1].length - a[1].length)
      .flatMap(([name, logged]) => {
        const known = findExercise(name)
        const muscles = known
          ? Object.entries(known.muscles)
              .map(([muscle, share]) => `${MUSCLES[muscle as Muscle].toLowerCase()} ${share}`)
              .join(', ')
          : 'unknown'
        return [
          '',
          `${name} (works ${muscles}${known?.compound ? '; compound lift' : ''}):`,
          ...[...Map.groupBy(logged, (set) => set.date)].map(([date, day]) => {
            const weighted = day.filter((set) => set.weight_kg > 0)
            const e1rm = weighted.length > 0 ? `; e1RM ${weight(Math.max(...weighted.map(estimatedMax)))}` : ''
            return `- ${date}: ${day.map((set) => `${set.weight_kg > 0 ? weight(set.weight_kg) : 'bw'}×${set.reps}`).join(', ')}${e1rm}`
          }),
        ]
      }),
  ]
}
