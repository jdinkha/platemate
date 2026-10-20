// Self-check for coach.ts: `node src/lib/coach.check.mjs` (Node 22.15+ runs the TypeScript directly).
// `node src/lib/coach.check.mjs --print` also prints the prompt, to read it or try it on the model.
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'

registerHooks({
  resolve: (specifier, context, next) =>
    next(specifier.startsWith('@/') ? new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href : specifier, context),
})

const { analyze } = await import('./analysis.ts')
const { coachPrompt } = await import('./coach.ts')
const { addDays } = await import('./dates.ts')
const { buildPlanHistory } = await import('./training.ts')

const today = '2026-10-19'
const exercise = (name, targetSets, targetReps) => ({ exerciseId: name, name, position: 0, targetSets, targetReps })
// Bench twice a week with almost no direct triceps work.
const days = [
  { id: 'upper', name: 'Upper', position: 0, weekdays: [4, 1], exercises: [exercise('Bench Press', 4, 5), exercise('Barbell Row', 4, 8)] },
  { id: 'lower', name: 'Lower', position: 1, weekdays: [2, 5], exercises: [exercise('Back Squat', 4, 5), exercise('Romanian Deadlift', 3, 8)] },
]
const plan = { id: 'p', name: 'Upper / Lower', templateKey: null, activeFrom: '2026-07-01', createdAt: '2026-07-01', days, scheduleType: 'weekly', loop: [], loopStart: 0 }
const history = buildPlanHistory([plan])

// Bench stuck at 100 kg × 5 for 10 weeks, plus some pull-ups at bodyweight.
const sets = Array.from({ length: 10 }, (_, week) => addDays(today, -7 * week - 4)).flatMap((date) => [
  ...Array.from({ length: 4 }, () => ({ date, exercise: 'Bench Press', weight_kg: 100, reps: 5 })),
  { date, exercise: 'Pull-up', weight_kg: 0, reps: 8 },
])
const weighIns = [
  { date: addDays(today, -1), weight_kg: 80 },
  { date: today, weight_kg: 80.4 },
]
const analysis = analyze(history, sets, today, 'mass', 'lbs')
const prompt = coachPrompt({
  profile: { id: 'u', display_name: 'Sam', goal: 'mass', unit_preference: 'lbs', week_starts_on: 1, timezone: 'UTC' },
  history,
  today,
  sets,
  weighIns,
  analysis,
})
if (process.argv.includes('--print')) console.log(prompt)

assert.match(prompt, /Their goal: build muscle\. Weights are in lbs\./)
assert.match(prompt, /- Upper \(Mon, Thu\): Bench Press 4×5, Barbell Row 4×8/)
// Weights in pounds, each day's sets with its estimated max: 100 kg × 5 is 220.5 lb, e1RM 116.7 kg.
assert.match(prompt, /Bench Press \(works chest 1, front delts 0\.5, triceps 0\.5; compound lift\):\n- 2026-08-13: 220\.5×5, 220\.5×5, 220\.5×5, 220\.5×5; e1RM 257\.2/)
assert.match(prompt, /- \d{4}-\d\d-\d\d: bw×8\n/)
assert.match(prompt, /- Bench Press: 257\.2 in the last 4 weeks, 257\.2 in the 8 weeks before, not done in the same 4 weeks last year\. stalled/)
assert.match(prompt, /- Triceps: 2 \/ 4 \(Bench Press 2 \/ 4\)/)
assert.match(prompt, /Weigh-ins \(lbs\), oldest first\n2026-10-18: 176\.4, 2026-10-19: 177\.3/)
assert.match(prompt, /Problems the app flagged:\n- Serious: /)

console.log('coach.check: ok')
