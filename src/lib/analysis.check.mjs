// Self-check for analysis.ts: `node src/lib/analysis.check.mjs` (Node 22.15+ runs the TypeScript directly).
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'

registerHooks({
  resolve: (specifier, context, next) =>
    next(specifier.startsWith('@/') ? new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href : specifier, context),
})

const { analyze, weightTrend } = await import('./analysis.ts')
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

// Loops: weekly sets follow how often each workout comes up. Upper is 2 of 6 days in
// U R U R L R and 1 of 4 in U R L R; Lower is 1 of 6 and 1 of 4.
{
  const loopPlan = (keys) => {
    const plan = planFromTemplate('upper-lower', 'mass')
    return { ...plan, scheduleType: 'loop', loop: keys.map((key) => plan.days.find((day) => day.id === key) ?? null) }
  }
  const run = (keys) => analyze(buildPlanHistory([loopPlan(keys)]), [], today, 'mass', 'kg')
  const muscle = (result, name) => result.muscles.find((row) => row.muscle === name)
  const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≈ ${b}`)
  const sixDay = run(['upper', 'rest', 'upper', 'rest', 'lower', 'rest'])
  const fourDay = run(['upper', 'rest', 'lower', 'rest'])
  close(muscle(sixDay, 'chest').planned / muscle(fourDay, 'chest').planned, 4 / 3)
  close(muscle(fourDay, 'glutes').planned / muscle(sixDay, 'glutes').planned, 3 / 2)

  // Each muscle lists the exercises behind it, adding up to its total.
  const glutes = muscle(sixDay, 'glutes')
  assert.deepEqual(glutes.exercises.map((row) => row.exercise), ['Back Squat', 'Romanian Deadlift', 'Walking Lunge'])
  close(glutes.exercises.reduce((total, row) => total + row.planned, 0), glutes.planned)
  assert.deepEqual(muscle(sixDay, 'chest').exercises.map((row) => [row.exercise, row.weight]), [['Bench Press', 1]])
}

// Switching split today: planned shows the new split right away, while the past
// month is still judged by PPL, which was followed, so nothing counts as skipped.
{
  const upperLower = { ...planFromTemplate('upper-lower', 'mass'), activeFrom: today, createdAt: today }
  const result = analyze(buildPlanHistory([ppl, upperLower]), follow(ppl, addDays(today, -40), addDays(today, -1)), today, 'mass', 'kg')
  // Bench 4 sets, twice a week.
  assert.equal(result.muscles.find((row) => row.muscle === 'chest').planned, 8)
  assert.equal(Math.round(result.completion * 100), 100)
  assert.ok(!result.issues.some((issue) => issue.title.includes('skipping') || issue.title.includes('planned sets')))
}

// Body weight: a month of weigh-ins judged against the goal, each end the
// average of two back-to-back mornings.
{
  /** Each argument is a week's [first morning, second morning] in kg, oldest first, the last week ending today. */
  const weeks = (...pairs) =>
    pairs.flatMap(([first, second], i) => {
      const date = addDays(today, (i - pairs.length + 1) * 7)
      return [{ date: addDays(date, -1), weight_kg: first }, { date, weight_kg: second }]
    })
  // Same weight after a month of trying to build muscle: not eating enough.
  const flat = weightTrend(weeks([79.8, 80.2], [80, 80.4], [80, 79.8], [80.2, 80], [80.4, 79.8]), today, 'mass', 'kg')
  assert.equal(flat.monthAgo.date, addDays(today, -28))
  assert.equal(flat.issue.title, "Your weight isn't going up")
  assert.equal(flat.issue.severity, 'medium')
  assert.match(flat.issue.detail, /from 80 kg on Sep 10 to 80\.1 kg 4 weeks later/)
  // One heavy morning a month ago and one light one today don't hide a 1.25% gain.
  const noisy = weightTrend(weeks([79.2, 80.8], [80.3, 80.5], [80.5, 80.7], [80.8, 80.8], [81.6, 80.4]), today, 'mass', 'kg')
  assert.equal(noisy.issue, undefined)
  // Lighter: worse.
  const losing = weeks([80, 80], [79.8, 79.8], [79.5, 79.5], [79.2, 79.2], [79, 79])
  assert.equal(weightTrend(losing, today, 'mass', 'kg').issue.severity, 'high')
  // Weight loss: judged the other way.
  assert.equal(weightTrend(weeks([80, 80], [80, 80], [80, 80], [80, 80], [80, 80]), today, 'weight_loss', 'kg').issue.title, "Your weight isn't going down")
  assert.equal(weightTrend(losing, today, 'weight_loss', 'kg').issue, undefined)
  // Strength: no judgment.
  assert.equal(weightTrend(losing, today, 'strength', 'kg').issue, undefined)
  // Lone weigh-ins, a week apart, are never judged.
  assert.equal(weightTrend([28, 21, 14, 7, 0].map((days) => ({ date: addDays(today, -days), weight_kg: 80 })), today, 'mass', 'kg'), undefined)
  // Two weeks apart is too soon to tell; a month old is too stale to judge.
  assert.equal(weightTrend(weeks([80, 80], [80, 80], [80, 80]), today, 'mass', 'kg').monthAgo, undefined)
  const stale = losing.map((entry) => ({ ...entry, date: addDays(entry.date, -21) }))
  assert.equal(weightTrend(stale, today, 'mass', 'kg').issue, undefined)
  assert.equal(weightTrend([], today, 'mass', 'kg'), undefined)
}

console.log('analysis checks passed')
