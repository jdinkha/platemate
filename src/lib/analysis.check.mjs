// Self-check for analysis.ts: `node src/lib/analysis.check.mjs` (Node 22.15+ runs the TypeScript directly).
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'

registerHooks({
  resolve: (specifier, context, next) =>
    next(specifier.startsWith('@/') ? new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href : specifier, context),
})

const { analyze } = await import('./analysis.ts')
const { addDays, dayOfWeek, eachDay } = await import('./dates.ts')
const { SPLITS, targetForName } = await import('./splits.ts')
const { buildPlanHistory } = await import('./training.ts')

const today = '2026-10-08'
const start = '2026-01-01'

// A built-in split on its default weekly schedule (Monday to Sunday).
function planFromTemplate(id, goal) {
  const split = SPLITS.find((split) => split.id === id)
  const days = split.workouts.map((workout, position) => ({
    id: workout.key,
    name: workout.name,
    position,
    weekdays: split.schedule.flatMap((key, index) => (key === workout.key ? [(index + 1) % 7] : [])),
    exercises: workout.exercises.map((exercise, position) => {
      const target = targetForName(exercise.name, workout, goal)
      return { exerciseId: exercise.name, name: exercise.name, position, targetSets: target.sets, targetReps: target.reps }
    }),
  }))
  return { id, name: split.name, templateKey: id, activeFrom: start, createdAt: start, days, scheduleType: 'weekly', loop: [], loopStart: 0 }
}

/** Every planned set on every scheduled day, except the exercises in `skip`. */
function follow(plan, from, to, skip = []) {
  return eachDay(from, to).flatMap((date) => {
    const day = plan.days.find((day) => day.weekdays.includes(dayOfWeek(date)))
    return (day?.exercises ?? []).flatMap((exercise) =>
      skip.includes(exercise.name)
        ? []
        : Array.from({ length: exercise.targetSets }, () => ({ date, exercise: exercise.name, weight_kg: 60, reps: 8 }))
    )
  })
}

const ppl = planFromTemplate('ppl', 'mass')
const history = buildPlanHistory([ppl])

// Following PPL exactly: balanced plan, nothing skipped, everything at 100%.
{
  const result = analyze(history, follow(ppl, addDays(today, -40), today), today, 'mass', 'kg')
  assert.equal(result.days, 28)
  assert.equal(Math.round(result.plannedSets), Math.round(result.actualSets))
  const chest = result.muscles.find((row) => row.muscle === 'chest')
  // Bench 4 + incline 3 sets, twice a week.
  assert.equal(chest.planned, 14)
  assert.deepEqual(result.issues.filter((issue) => !issue.title.includes('stalled')), [])
}

// Skipping Romanian deadlifts: hamstrings flagged, the culprit named, chest left alone.
{
  const result = analyze(history, follow(ppl, addDays(today, -40), today, ['Romanian Deadlift']), today, 'mass', 'kg')
  const skip = result.issues.find((issue) => issue.title === "You're skipping hamstrings work")
  assert.ok(skip, 'hamstrings should be flagged')
  assert.match(skip.detail, /Romanian Deadlift, 0 of 32 sets/)
  assert.ok(!result.issues.some((issue) => issue.title.includes('chest')))
}

// A chest-and-arms plan with almost no legs: plan coverage and balance flagged.
{
  const plan = planFromTemplate('ppl', 'mass')
  plan.days[2].exercises = [{ exerciseId: 'x', name: 'Leg Extension', position: 0, targetSets: 2, targetReps: 12 }]
  const result = analyze(buildPlanHistory([plan]), [], today, 'mass', 'kg')
  const titles = result.issues.map((issue) => issue.title)
  assert.ok(titles.includes("Your plan doesn't train hamstrings"))
  assert.ok(titles.includes('Your plan is unbalanced: legs vs upper body'))
  assert.ok(titles.includes("You're doing 0% of your planned sets"))
}

// Bench is weaker than the same month last year: a high-severity issue for a strength goal.
{
  const bench = (date, weight_kg) => ({ date, exercise: 'Bench Press', weight_kg, reps: 5 })
  const sets = [bench(addDays(today, -370), 100), bench(addDays(today, -40), 90), bench(today, 92)]
  const result = analyze(history, sets, today, 'strength', 'kg')
  const lift = result.lifts.find((lift) => lift.exercise === 'Bench Press')
  assert.equal(lift.status, 'regressed')
  const issue = result.issues.find((issue) => issue.title === 'Bench Press is weaker than a year ago')
  assert.equal(issue.severity, 'high')
  assert.match(issue.detail, /down 8% from 116\.7 kg in October 2025/)

  // Better than last year, but no better than last month: stalled.
  const stalled = analyze(history, [bench(addDays(today, -370), 80), bench(addDays(today, -40), 95), bench(today, 92)], today, 'mass', 'kg')
  assert.equal(stalled.lifts[0].status, 'stalled')
  assert.equal(stalled.issues.find((issue) => issue.title === 'Bench Press has stalled').severity, 'medium')
}

console.log('analysis checks passed')
