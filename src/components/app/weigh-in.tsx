"use client";

import { useId, useState, useTransition, type FormEvent } from "react";

import { logWeight, skipWeighIn } from "@/app/(app)/actions";
import { CheckIcon, SpinnerIcon } from "@/components/icons";
import type { WeightUnit } from "@/lib/splits";

/** Logs today's body weight. `skippable` adds "Not now", which holds the weekly prompt off for a week. */
export function WeighInForm({ unit, skippable = false }: { unit: WeightUnit; skippable?: boolean }) {
  const id = useId();
  const [weight, setWeight] = useState("");
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ error?: string }>, onDone?: () => void) {
    setError(undefined);
    setSaved(false);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
      else onDone?.();
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    run(
      () => logWeight(Number(weight)),
      () => {
        setWeight("");
        setSaved(true);
      }
    );
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground">
        Weigh yourself first thing in the morning, after the bathroom and before you eat or drink. Your weight swings by a
        few {unit === "kg" ? "kilos" : "pounds"} over a day with food, water and salt, so morning weigh-ins are the ones you
        can compare.
      </p>
      <form onSubmit={submit} className="mt-4 flex flex-wrap items-end gap-2">
        <div className="w-36">
          <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Today ({unit})
          </label>
          <input
            id={id}
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            required
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
            className="h-12 w-full rounded-xl border border-border bg-background px-4 font-mono text-lg font-semibold outline-none transition [appearance:textfield] focus:border-accent-ink/60 focus:ring-4 focus:ring-accent/30 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? <SpinnerIcon className="size-4" /> : <CheckIcon className="size-4" strokeWidth={2.5} />}
          Save
        </button>
        {skippable && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(skipWeighIn)}
            className="h-12 rounded-xl px-4 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60"
          >
            Not now
          </button>
        )}
      </form>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="mt-3 text-sm text-muted-foreground">
          Saved. Logging again today replaces it.
        </p>
      )}
    </div>
  );
}
