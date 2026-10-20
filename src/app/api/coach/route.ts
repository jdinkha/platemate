import { ApiError, GoogleGenAI } from '@google/genai'

import { getCurrentUser } from '@/lib/auth'
import { coachPrompt, type CoachMessage } from '@/lib/coach'
import { getInsights, getPlanHistory, getProfile } from '@/lib/data'
import { todayIn } from '@/lib/dates'

// The Insights coach. The model gets the user's data as text in its system
// prompt and no tools, so it can read the data but never query or change it.

const MODEL = 'gemini-3.8-flash'
/** Weaker, but tried when Google is out of capacity for MODEL (a 503), which happens at busy times on the free tier. */
const FALLBACK_MODEL = 'gemini-3.5-flash-lite'
/** The model sees the latest messages only. Odd, so an alternating chat that ends with the user starts with them too. */
const HISTORY = 21
/** Longest message accepted, so one request can't eat the quota. Questions are capped at 2,000 in the UI. */
const MAX_LENGTH = 8000

const SIGNED_OUT = 'Your session has expired. Please sign in again.'
const RATE_LIMITED = 'Too many chatbot requests, try again later.'
const BUSY = "Google's AI is too busy to answer right now. Try again in a few minutes."
const FAILED = "The coach couldn't answer right now. Please try again."

function isConversation(value: unknown): value is CoachMessage[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (message) =>
        (message?.role === 'user' || message?.role === 'model') &&
        typeof message.text === 'string' &&
        message.text.trim().length > 0 &&
        message.text.length <= MAX_LENGTH
    ) &&
    value.at(-1).role === 'user'
  )
}

function isOverloaded(error: unknown) {
  return error instanceof ApiError && error.status === 503
}

function failure(error: unknown) {
  // 429 is Gemini's quota for this API key: requests a minute or a day.
  if (error instanceof ApiError && error.status === 429) return Response.json({ error: RATE_LIMITED }, { status: 429 })
  if (isOverloaded(error)) return Response.json({ error: BUSY }, { status: 503 })
  console.error('Coach request failed', error)
  return Response.json({ error: FAILED }, { status: 502 })
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: SIGNED_OUT }, { status: 401 })
  const messages = (await request.json().catch(() => null))?.messages
  if (!isConversation(messages)) return Response.json({ error: 'Ask a question first.' }, { status: 400 })

  const [profile, history] = await Promise.all([getProfile(user.id), getPlanHistory(user.id)])
  if (!profile || history.timeline.length === 0) {
    return Response.json({ error: 'Pick a split first, then ask the coach.' }, { status: 400 })
  }
  const today = todayIn(profile.timezone)
  const insights = await getInsights(user.id, profile, history, today)

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  const contents = messages.slice(-HISTORY).map((message) => ({ role: message.role, parts: [{ text: message.text }] }))
  const config = { systemInstruction: coachPrompt({ profile, history, today, ...insights }) }
  const ask = (model: string) => ai.models.generateContentStream({ model, contents, config })
  let stream
  try {
    stream = await ask(MODEL).catch((error) => {
      if (!isOverloaded(error)) throw error
      return ask(FALLBACK_MODEL)
    })
  } catch (error) {
    return failure(error)
  }

  const encoder = new TextEncoder()
  return new Response(
    new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) if (chunk.text) controller.enqueue(encoder.encode(chunk.text))
          controller.close()
        } catch (error) {
          console.error('Coach stream failed', error)
          controller.error(error)
        }
      },
    }),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
  )
}
