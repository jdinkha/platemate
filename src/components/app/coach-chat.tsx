"use client";

import { useId, useState } from "react";

import { AlertIcon, ArrowRightIcon, SpinnerIcon } from "@/components/icons";
import type { CoachMessage } from "@/lib/coach";

const FAILED = "The coach couldn't answer right now. Please try again.";
const SIGNED_OUT = "Your session has expired. Please sign in again.";
const NO_ANSWER = "The coach didn't answer. Try asking another way.";

/** Streams the coach's reply to `messages` into `onText`. Returns the error to show if it fails. */
async function ask(messages: CoachMessage[], onText: (text: string) => void) {
  try {
    const response = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
      // The proxy sends signed-out requests to /login; don't follow it there.
      redirect: "manual",
    });
    if (response.type === "opaqueredirect") return SIGNED_OUT;
    if (!response.ok || !response.body) {
      const body = await response.json().catch(() => null);
      return typeof body?.error === "string" ? body.error : FAILED;
    }
    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    let text = "";
    for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) onText((text += chunk.value));
    return text.trim() ? undefined : NO_ANSWER;
  } catch {
    return FAILED;
  }
}

/** A chat with the coach about the user's training. `suggestions` are questions to start with. */
export function CoachChat({ suggestions }: { suggestions: string[] }) {
  const id = useId();
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  /** The first question, held back until the user has read the notice about Google. */
  const [held, setHeld] = useState<string>();
  const [noticed, setNoticed] = useState(false);

  async function send(text: string, afterNotice = false) {
    const question = text.trim();
    if (!question || pending) return;
    if (!afterNotice && !noticed && !noticeRead()) {
      setHeld(question);
      return;
    }
    const asked: CoachMessage[] = [...messages, { role: "user", text: question }];
    setMessages([...asked, { role: "model", text: "" }]);
    setInput("");
    setError(undefined);
    setPending(true);
    const failed = await ask(asked, (reply) => setMessages([...asked, { role: "model", text: reply }]));
    if (failed) {
      // Take the question back so it can be sent again.
      setMessages(messages);
      setInput(question);
      setError(failed);
    }
    setPending(false);
  }

  return (
    <section aria-labelledby="coach-heading" className="rounded-3xl border border-border bg-card p-5 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="coach-heading" className="text-lg font-semibold">
            Ask your coach
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            It answers from your plan, workouts and weigh-ins. It can read them, not change them.
          </p>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setMessages([]);
              setError(undefined);
            }}
            className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-60"
          >
            New chat
          </button>
        )}
      </div>

      {messages.length > 0 && (
        // column-reverse keeps the scroll at the newest message while a reply streams in.
        <div className="mt-5 flex max-h-[min(36rem,65vh)] flex-col-reverse overflow-y-auto">
          <ol className="space-y-3" aria-live="polite" aria-busy={pending}>
            {messages.map((message, i) =>
              message.role === "user" ? (
                <li
                  key={i}
                  className="ml-auto w-fit max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground"
                >
                  <span className="sr-only">You: </span>
                  {message.text}
                </li>
              ) : (
                <li key={i} className="w-fit max-w-[92%] rounded-2xl rounded-bl-md bg-muted px-4 py-3 leading-relaxed">
                  <span className="sr-only">Coach: </span>
                  {message.text ? (
                    <div className="space-y-2.5">
                      <Formatted text={message.text} />
                    </div>
                  ) : (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <SpinnerIcon className="size-4" />
                      Looking at your training…
                    </span>
                  )}
                </li>
              )
            )}
          </ol>
        </div>
      )}

      {held ? (
        <GoogleNotice
          onContinue={() => {
            try {
              localStorage.setItem(NOTICE_KEY, "1");
            } catch {
              // Storage is blocked: the notice shows again next visit.
            }
            setNoticed(true);
            setHeld(undefined);
            send(held, true);
          }}
          onCancel={() => setHeld(undefined)}
        />
      ) : (
        <>
        {messages.length === 0 && (
          <ul className="mt-5 flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <li key={suggestion}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => send(suggestion)}
                  className="rounded-full border border-border bg-background px-3.5 py-1.5 text-sm transition hover:border-accent-ink/50 hover:bg-muted focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-60"
                >
                  {suggestion}
                </button>
              </li>
            ))}
          </ul>
        )}

        {error && (
          <p
            role="alert"
            className="mt-4 flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-medium text-danger"
          >
            <AlertIcon className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        )}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            send(input);
          }}
          className="mt-4 flex items-end gap-2 rounded-2xl border border-border bg-background p-1.5 pl-4 transition focus-within:border-accent-ink/60 focus-within:ring-4 focus-within:ring-accent/30"
        >
          <label htmlFor={id} className="sr-only">
            Ask your coach
          </label>
          <textarea
            id={id}
            rows={1}
            maxLength={2000}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Ask about your training…"
            className="field-sizing-content max-h-40 min-h-10 flex-1 resize-none bg-transparent py-2 text-base outline-none placeholder:text-muted-foreground sm:text-sm"
          />
          <button
            type="submit"
            disabled={pending || !input.trim()}
            aria-label="Send"
            className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-40"
          >
            {pending ? <SpinnerIcon className="size-4" /> : <ArrowRightIcon className="size-4" strokeWidth={2.5} />}
          </button>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">The coach can get things wrong. Double-check anything important.</p>
        </>
      )}
    </section>
  );
}

/** Set in localStorage once the user has read the notice about Google, so it shows once per browser. */
const NOTICE_KEY = "platemate-coach-notice";

function noticeRead() {
  try {
    return localStorage.getItem(NOTICE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * What Google does with the coach's prompts. It follows the Gemini API's terms
 * for unpaid use (https://ai.google.dev/gemini-api/terms, updated 2026-04-28);
 * if the API key gets billing turned on, Google stops using prompts to improve its products, so reword this.
 */
function GoogleNotice({ onContinue, onCancel }: { onContinue: () => void; onCancel: () => void }) {
  return (
    <div role="region" aria-labelledby="coach-notice-heading" className="mt-5 rounded-2xl border border-border bg-muted/50 p-4 sm:p-5">
      <h3 id="coach-notice-heading" className="font-semibold">
        Before your first question
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">
        The coach runs on Google&apos;s Gemini, on its free tier. Each question sends Google what you type along with your
        plan, workouts and weigh-ins, but not your name or email. Under Google&apos;s terms for the free tier:
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Google can use your questions, your data and the coach&apos;s answers to improve its products and AI models.</li>
        <li>People at Google may read and annotate them to do that.</li>
        <li>So don&apos;t type anything sensitive or personal, like medical conditions or contact details.</li>
      </ul>
      <a
        href="https://ai.google.dev/gemini-api/terms"
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-block text-sm font-medium underline underline-offset-4 hover:text-accent-ink focus-visible:outline-2 focus-visible:outline-accent"
      >
        Read Google&apos;s Gemini API terms
      </a>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          autoFocus
          onClick={onContinue}
          className="h-10 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Continue
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-10 rounded-xl px-4 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

const BULLET = /^\s*(?:[-*•]|\d+[.)])\s+/;

/** The little Markdown the coach is told to use: paragraphs, "- " lists and **bold**. */
function Formatted({ text }: { text: string }) {
  const blocks: { list: boolean; lines: string[] }[] = [];
  let block: (typeof blocks)[number] | undefined;
  for (const line of text.split("\n")) {
    const list = BULLET.test(line);
    const content = line.replace(BULLET, "").replace(/^#+\s+(.*)/, "**$1**").trim();
    if (!content) {
      block = undefined;
      continue;
    }
    if (block?.list !== list) blocks.push((block = { list, lines: [] }));
    block!.lines.push(content);
  }
  return blocks.map((block, i) =>
    block.list ? (
      <ul key={i} className="list-disc space-y-1 pl-5 marker:text-muted-foreground">
        {block.lines.map((line, j) => (
          <li key={j}>{bold(line)}</li>
        ))}
      </ul>
    ) : (
      <p key={i} className="whitespace-pre-line">
        {bold(block.lines.join("\n"))}
      </p>
    )
  );
}

/** **bold** as <strong>; other stray asterisks dropped. */
function bold(text: string) {
  return text
    .split(/\*\*(.+?)\*\*/)
    .map((part, i) => (i % 2 ? <strong key={i} className="font-semibold">{part}</strong> : part.replaceAll("*", "")));
}
