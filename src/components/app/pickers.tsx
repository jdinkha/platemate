"use client";

import { SPLITS, trainingDaysPerWeek } from "@/lib/splits";

const focusRing = "has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-accent/30";

export function SplitPicker({
  name,
  value,
  onChange,
}: {
  name: string;
  value: string | undefined;
  onChange: (splitId: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {SPLITS.map((split) => {
        const checked = split.id === value;
        return (
          <label
            key={split.id}
            className={`flex cursor-pointer flex-col rounded-2xl border p-4 transition ${focusRing} ${
              checked ? "border-accent-ink bg-accent/15 dark:bg-accent/10" : "border-border bg-background hover:border-foreground/30"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={split.id}
              checked={checked}
              onChange={() => onChange(split.id)}
              className="sr-only"
            />
            <span className="flex items-center gap-3">
              <RadioDot checked={checked} />
              <span className="flex-1 font-semibold">{split.name}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {trainingDaysPerWeek(split.schedule)} days/wk
              </span>
            </span>
            <span className="mt-2 text-sm text-muted-foreground">{split.description}</span>
            <span className="mt-3 flex flex-wrap gap-1.5">
              {split.workouts.map((workout) => (
                <span key={workout.key} className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                  {workout.name}
                </span>
              ))}
            </span>
          </label>
        );
      })}
    </div>
  );
}

export type Option<T> = { value: T; label: string; description?: string };

/** A row of mutually exclusive choices, e.g. kg / lb. */
export function OptionGroup<T extends string | number>({
  name,
  legend,
  options,
  value,
  onChange,
}: {
  name: string;
  legend: string;
  options: Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="sr-only">{legend}</legend>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((option) => {
          const checked = option.value === value;
          return (
            <label
              key={String(option.value)}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border px-3 py-2.5 text-center transition ${focusRing} ${
                checked
                  ? "border-accent-ink bg-accent/15 dark:bg-accent/10"
                  : "border-border bg-background hover:border-foreground/30"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={String(option.value)}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <span className="text-sm font-semibold">{option.label}</span>
              {option.description && (
                <span className="mt-0.5 text-xs text-muted-foreground">{option.description}</span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function RadioDot({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`grid size-5 shrink-0 place-items-center rounded-full border-2 ${
        checked ? "border-accent-ink" : "border-border"
      }`}
    >
      {checked && <span className="size-2 rounded-full bg-accent-ink" />}
    </span>
  );
}
