// Self-check for the retry in server.ts: `node src/lib/supabase/server.check.mjs` (takes ~4s).
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'

registerHooks({
  resolve: (specifier, context, next) => next(specifier === 'next/headers' ? 'next/headers.js' : specifier, context),
})

const { fetchWithClockRetry } = await import('./server.ts')

const future = () => new Response('{"code":"PGRST303","message":"JWT issued at future"}', { status: 401 })
const expired = () => new Response('{"code":"PGRST303","message":"JWT expired"}', { status: 401 })
const ok = () => new Response('[]', { status: 200 })

async function run(responses) {
  let calls = 0
  globalThis.fetch = async () => responses[Math.min(calls++, responses.length - 1)]()
  const response = await fetchWithClockRetry('https://example.test/rest/v1/profiles')
  return { status: response.status, calls }
}

assert.deepEqual(await run([ok]), { status: 200, calls: 1 })
assert.deepEqual(await run([expired]), { status: 401, calls: 1 }, 'other 401s are not retried')
assert.deepEqual(await run([future, ok]), { status: 200, calls: 2 }, 'retries a stale-clock rejection')
assert.deepEqual(await run([future]), { status: 401, calls: 3 }, 'gives up after 3 attempts')

console.log('server.ts retry: all checks passed')
