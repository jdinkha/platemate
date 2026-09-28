"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { setDayStatus } from "@/app/(app)/actions";
import { ChevronDownIcon, MoonIcon, SkipIcon, SpinnerIcon, UndoIcon } from "@/components/icons";

export function WorkoutSwitcher({ workouts, current }: { workouts: { id: string; name: string }[]; current: string }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Workout</span>
      <select
        value={current}
        onChange={(event) => router.push(`${pathname}?workout=${encodeURIComponent(event.target.value)}`)}
        className="h-10 appearance-none rounded-full border border-border bg-card pl-4 pr-10 text-sm font-medium outline-none transition hover:bg-muted focus-visible:ring-4 focus-visible:ring-accent/30"
      >
        {workouts.map((workout) => (
          <option key={workout.id} value={workout.id}>
            {workout.name}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-3.5 size-4 text-muted-foreground" />
    </label>
  );
}

function useDayStatus(date: string) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function update(status: "break" | "skipped" | null) {
    setError(undefined);
    startTransition(async () => {
      const result = await setDayStatus(date, status);
      if (result.error) setError(result.error);
    });
  }

  return { pending, error, update };
}

const secondaryButton =
  "inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60";

/** "Take a break" and "Skip" for a training day with nothing logged yet. */
export function MarkDayButtons({ date }: { date: string }) {
  const { pending, error, update } = useDayStatus(date);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" disabled={pending} onClick={() => update("break")} className={secondaryButton}>
        <MoonIcon className="size-4" />
        Take a break
      </button>
      <button type="button" disabled={pending} onClick={() => update("skipped")} className={secondaryButton}>
        <SkipIcon className="size-4" />
        Skip
      </button>
      {error && (
        <p role="alert" className="w-full text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function UndoDayStatusButton({ date }: { date: string }) {
  const { pending, error, update } = useDayStatus(date);

  return (
    <>
      <button type="button" disabled={pending} onClick={() => update(null)} className={secondaryButton}>
        {pending ? <SpinnerIcon className="size-4" /> : <UndoIcon className="size-4" />}
        Undo
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </>
  );
}
