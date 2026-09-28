"use client";

import { useId, useOptimistic, useState, useTransition, type FormEvent } from "react";

import { deleteSet, logSet } from "@/app/(app)/actions";
import { CheckIcon, MinusIcon, PlusIcon, XIcon } from "@/components/icons";
import { formatDate } from "@/lib/dates";
import type { WeightUnit } from "@/lib/splits";
import { formatNumber, weightStep } from "@/lib/units";

/** A set with its weight already converted to the user's unit. */
export type LoggedSet = { id: string; weight: number; reps: number };

export type ExerciseEntry = {
  /** Absent for an exercise the user just added and hasn't logged yet. */
  exerciseId?: string;
  name: string;
  /** Present for exercises from the workout template; absent for ones the user added. */
  target?: { sets: number; reps: number };
  sets: LoggedSet[];
  lastTime?: { date: string; sets: Omit<LoggedSet, "id">[] };
};

type LogProps = { date: string; dayId: string; unit: WeightUnit };

// Sets shown before the server confirms them get placeholder ids.
let placeholderCount = 0;
const isPlaceholder = (id: string) => id.startsWith("placeholder-");

export function WorkoutLog({ exercises, ...props }: LogProps & { exercises: ExerciseEntry[] }) {
  const [added, setAdded] = useState<string[]>([]);

  // Once a set is logged for an added exercise, the server includes it in `exercises`.
  const names = exercises.map((exercise) => exercise.name.toLowerCase());
  const unlogged = added.filter((name) => !names.includes(name.toLowerCase()));
  const all = [...exercises, ...unlogged.map((name) => ({ name, sets: [] }))];

  return (
    <div className="space-y-4">
      {all.map((exercise, index) => (
        <ExerciseCard key={exercise.name} exercise={exercise} number={index + 1} {...props} />
      ))}
      <AddExercise
        existing={all.map((exercise) => exercise.name.toLowerCase())}
        onAdd={(name) => setAdded((current) => [...current, name])}
      />
    </div>
  );
}

function ExerciseCard({ exercise, number, date, dayId, unit }: LogProps & { exercise: ExerciseEntry; number: number }) {
  const [sets, changeSets] = useOptimistic(
    exercise.sets,
    (current: LoggedSet[], change: { add: LoggedSet } | { remove: string }) =>
      "add" in change ? [...current, change.add] : current.filter((set) => set.id !== change.remove)
  );
  // Start from the last set logged today, else last session's first set, else the target.
  const previous = exercise.sets.at(-1) ?? exercise.lastTime?.sets[0];
  // Bodyweight sets (0) leave the field empty so it shows the "BW" placeholder.
  const [weight, setWeight] = useState(previous?.weight ? String(previous.weight) : "");
  const [reps, setReps] = useState(String(exercise.sets.at(-1)?.reps ?? exercise.target?.reps ?? ""));
  const [error, setError] = useState<string>();
  const [, startTransition] = useTransition();

  const complete = exercise.target !== undefined && sets.length >= exercise.target.sets;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const weightValue = weight.trim() === "" ? 0 : Number(weight);
    const repsValue = Number(reps);
    if (!Number.isFinite(weightValue) || weightValue < 0) {
      setError("Enter a weight of 0 or more. Use 0 for bodyweight.");
      return;
    }
    if (!Number.isInteger(repsValue) || repsValue < 1) {
      setError("Enter a whole number of reps.");
      return;
    }
    setError(undefined);
    startTransition(async () => {
      changeSets({ add: { id: `placeholder-${++placeholderCount}`, weight: weightValue, reps: repsValue } });
      const result = await logSet({
        date,
        dayId,
        exercise: { id: exercise.exerciseId, name: exercise.name },
        weight: weightValue,
        reps: repsValue,
      });
      if (result.error) setError(result.error);
    });
  }

  function remove(id: string) {
    setError(undefined);
    startTransition(async () => {
      changeSets({ remove: id });
      const result = await deleteSet(id);
      if (result.error) setError(result.error);
    });
  }

  return (
    <article
      className={`rounded-3xl border bg-card p-5 transition-colors sm:p-6 ${complete ? "border-accent-ink/40" : "border-border"}`}
    >
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="flex items-baseline gap-2.5 text-lg font-semibold tracking-tight">
            <span className="font-mono text-xs font-normal text-muted-foreground">{String(number).padStart(2, "0")}</span>
            <span className="truncate">{exercise.name}</span>
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {exercise.lastTime ? (
              <>
                Last time, {formatDate(exercise.lastTime.date, { month: "short", day: "numeric" })}:{" "}
                <span className="font-mono text-foreground">{summarize(exercise.lastTime.sets, unit)}</span>
              </>
            ) : exercise.target ? (
              "First time. Pick a weight you can move with good form."
            ) : (
              "Added to this workout."
            )}
          </p>
        </div>
        {exercise.target &&
          (complete ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
              <CheckIcon className="size-3.5" strokeWidth={3} />
              Done
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 font-mono text-xs font-medium">
              {exercise.target.sets} × {exercise.target.reps}
            </span>
          ))}
      </header>

      {sets.length > 0 && (
        <ol className="mt-4 flex flex-wrap gap-2" aria-label={`Sets logged for ${exercise.name}`}>
          {sets.map((set, index) => (
            <li
              key={set.id}
              className={`inline-flex items-center gap-2 rounded-full border border-border bg-background py-1 pl-3 pr-1 text-sm transition-opacity ${
                isPlaceholder(set.id) ? "opacity-60" : ""
              }`}
            >
              <span className="font-mono text-xs text-muted-foreground">{index + 1}</span>
              <span className="font-mono font-medium">
                {set.weight === 0 ? "BW" : formatNumber(set.weight)} × {set.reps}
              </span>
              <button
                type="button"
                onClick={() => remove(set.id)}
                disabled={isPlaceholder(set.id)}
                aria-label={`Delete set ${index + 1}`}
                className="grid size-6 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40"
              >
                <XIcon className="size-3.5" />
              </button>
            </li>
          ))}
        </ol>
      )}

      <form onSubmit={submit} className="mt-4 grid grid-cols-2 items-end gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <Stepper label={`Weight (${unit})`} value={weight} onChange={setWeight} step={weightStep(unit)} min={0} inputMode="decimal" placeholder="BW" />
        <Stepper label="Reps" value={reps} onChange={setReps} step={1} min={1} inputMode="numeric" />
        <button
          type="submit"
          className="col-span-2 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:col-span-1"
        >
          <CheckIcon className="size-4" strokeWidth={2.5} />
          Log set {sets.length + 1}
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
    </article>
  );
}

function Stepper({
  label,
  value,
  onChange,
  step,
  min,
  inputMode,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  step: number;
  min: number;
  inputMode: "decimal" | "numeric";
  placeholder?: string;
}) {
  const id = useId();

  function nudge(direction: 1 | -1) {
    const next = Math.max(min, Math.round(((Number(value) || 0) + direction * step) * 100) / 100);
    onChange(String(next));
  }

  const buttonClass =
    "grid h-full w-10 shrink-0 place-items-center text-muted-foreground transition hover:text-foreground active:scale-90";

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <div className="flex h-12 items-center rounded-xl border border-border bg-background transition focus-within:border-accent-ink/60 focus-within:ring-4 focus-within:ring-accent/30">
        <button type="button" onClick={() => nudge(-1)} aria-label={`Decrease ${label}`} className={buttonClass}>
          <MinusIcon className="size-4" />
        </button>
        <input
          id={id}
          type="number"
          inputMode={inputMode}
          min={min}
          step="any"
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="w-full min-w-0 bg-transparent text-center font-mono text-lg font-semibold outline-none [appearance:textfield] placeholder:text-muted-foreground/50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button type="button" onClick={() => nudge(1)} aria-label={`Increase ${label}`} className={buttonClass}>
          <PlusIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}

function AddExercise({ existing, onAdd }: { existing: string[]; onAdd: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  const id = useId();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim().replace(/\s+/g, " ");
    if (!trimmed) return;
    if (existing.includes(trimmed.toLowerCase())) {
      setError("That exercise is already in this workout.");
      return;
    }
    onAdd(trimmed);
    setName("");
    setError(undefined);
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-border py-5 text-sm font-medium text-muted-foreground transition hover:border-foreground/30 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <PlusIcon className="size-4" />
        Add an exercise
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-3xl border border-border bg-card p-5">
      <label htmlFor={id} className="text-sm font-medium">
        Exercise name
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id={id}
          autoFocus
          maxLength={80}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Cable Crunch"
          className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3.5 outline-none transition focus:border-accent-ink/60 focus:ring-4 focus:ring-accent/30"
        />
        <button type="submit" className="h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90">
          Add
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="h-11 rounded-xl px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          Cancel
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </form>
  );
}

/** "185 lb × 8, 8, 7" when the weight didn't change, else "185 × 8 · 175 × 10". */
function summarize(sets: Omit<LoggedSet, "id">[], unit: WeightUnit) {
  const format = (weight: number) => (weight === 0 ? "BW" : formatNumber(weight));
  if (sets.every((set) => set.weight === sets[0].weight)) {
    const weight = sets[0].weight;
    return `${weight === 0 ? "BW" : `${formatNumber(weight)} ${unit}`} × ${sets.map((set) => set.reps).join(", ")}`;
  }
  return sets.map((set) => `${format(set.weight)} × ${set.reps}`).join(" · ");
}
