// Self-check for demo.ts: `node src/lib/demo.check.mjs` (Node 22.15+ runs the TypeScript directly).
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'

registerHooks({
  resolve: (specifier, context, next) =>
    next(specifier.startsWith('@/') ? new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href : specifier, context),
})

const { decodeDemo, encodeDemo, newDemo, reorderDemoExercises, setDemoTarget } = await import('./demo.ts')

const demo = newDemo('2026-10-20', 1)
const key = Object.keys(demo.workouts)[0]
const names = demo.workouts[key].map((exercise) => exercise.name)

// Targets: reps can be changed, within 1 to 50.
const plank = setDemoTarget(demo, key, names[0], 3, 1)
assert.deepEqual(plank.workouts[key][0], { name: names[0], sets: 3, reps: 1 })
assert.equal(typeof setDemoTarget(demo, key, names[0], 3, 0), 'string')
assert.equal(typeof setDemoTarget(demo, key, names[0], 3, 51), 'string')

// Reordering takes each exercise exactly once.
const reversed = names.toReversed()
assert.deepEqual(reorderDemoExercises(plank, key, reversed).workouts[key].map((exercise) => exercise.name), reversed)
assert.equal(typeof reorderDemoExercises(demo, key, names.slice(1)), 'string')
assert.equal(typeof reorderDemoExercises(demo, key, [names[0], ...names.slice(0, -1)]), 'string')

// The cookie keeps the order and reps.
const changed = reorderDemoExercises(plank, key, reversed)
assert.deepEqual(decodeDemo(encodeDemo(changed)), { ...changed, workout: undefined })

console.log('demo checks passed')
