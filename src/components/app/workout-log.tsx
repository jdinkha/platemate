"use client";

import { useEffect, useId, useOptimistic, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";

import {
  addExerciseToDay,
  deleteSet,
  logSet,
  removeExerciseFromDay,
  updateTargetSets,
} from "@/app/(app)/actions";
import { CheckIcon, MinusIcon, PlusIcon, SpinnerIcon, TrashIcon, XIcon } from "@/components/icons";
import { formatDate } from "@/lib/dates";
import { searchExercises } from "@/lib/exercises";
import type { WeightUnit } from "@/lib/splits";
import { formatNumber, weightStep } from "@/lib/units";

/** A set with its weight already converted to the user's unit. */
export type LoggedSet = { id: string; weight: number; reps: number };

export type ExerciseEntry = {
  exerciseId: string;
  name: string;
  /** In the workout's exercise list, as opposed to logged here without being part of it. */
  planned: boolean;
  target?: { sets: number; reps: number };
  sets: LoggedSet[];
  lastTime?: { date: string; sets: Omit<LoggedSet, "id">[] };
};

type LogProps = {
  date: string;
  dayId: string;
  /** The workout's name, e.g. "Push". */
  dayName: string;
  unit: WeightUnit;
  /** Whether the workout belongs to the current split, so its exercises can be changed. */
  editable: boolean;
};

// Sets shown before the server confirms them get placeholder ids.
let placeholderCount = 0;
const isPlaceholder = (id: string) => id.startsWith("placeholder-");

export function WorkoutLog({ exercises, ...props }: LogProps & { exercises: ExerciseEntry[] }) {
  const plannedCount = exercises.filter((exercise) => exercise.planned).length;

  return (
    <div className="space-y-4">
      {exercises.map((exercise, index) => (
        <ExerciseCard
          key={exercise.exerciseId}
          exercise={exercise}
          number={index + 1}
          isLastPlanned={exercise.planned && plannedCount === 1}
          {...props}
        />
      ))}
      {props.editable && (
        <AddExercise
          dayId={props.dayId}
          dayName={props.dayName}
          existing={exercises.filter((exercise) => exercise.planned).map((exercise) => exercise.name)}
        />
      )}
    </div>
  );
}

function ExerciseCard({
  exercise,
  number,
  isLastPlanned,
  date,
  dayId,
  dayName,
  unit,
  editable,
}: LogProps & { exercise: ExerciseEntry; number: number; isLastPlanned: boolean }) {
  const [sets, changeSets] = useOptimistic(
    exercise.sets,
    (current: LoggedSet[], change: { add: LoggedSet } | { remove: string }) =>
      "add" in change ? [...current, change.add] : current.filter((set) => set.id !== change.remove)
  );
  const [targetSets, showTargetSets] = useOptimistic(exercise.target?.sets);
  // Start from the last set logged today, else last session's first set, else the target.
  const previous = exercise.sets.at(-1) ?? exercise.lastTime?.sets[0];
  // Bodyweight sets (0) leave the field empty so it shows the "BW" placeholder.
  const [weight, setWeight] = useState(previous?.weight ? String(previous.weight) : "");
  const [reps, setReps] = useState(String(exercise.sets.at(-1)?.reps ?? exercise.target?.reps ?? ""));
  const [error, setError] = useState<string>();
  const [removing, startRemoving] = useTransition();
  const [, startTransition] = useTransition();

  const canEdit = editable && exercise.planned;
  const complete = targetSets !== undefined && sets.length >= targetSets;
  const remaining = targetSets !== undefined ? Math.max(0, targetSets - sets.length) : 0;

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

  function removeSet(id: string) {
    setError(undefined);
    startTransition(async () => {
      changeSets({ remove: id });
      const result = await deleteSet(id);
      if (result.error) setError(result.error);
    });
  }

  function changeTarget(next: number) {
    setError(undefined);
    startTransition(async () => {
      showTargetSets(next);
      const result = await updateTargetSets(dayId, exercise.exerciseId, next);
      if (result.error) setError(result.error);
    });
  }

  function removeExercise() {
    setError(undefined);
    startRemoving(async () => {
      const result = await removeExerciseFromDay(dayId, exercise.exerciseId);
      if (result.error) setError(result.error);
    });
  }

  return (
    <article
      aria-busy={removing}
      className={`rounded-3xl border bg-card p-5 transition sm:p-6 ${complete ? "border-accent-ink/40" : "border-border"} ${
        removing ? "opacity-50" : ""
      }`}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-baseline gap-2.5 text-lg font-semibold tracking-tight">
            <span className="font-mono text-xs font-normal text-muted-foreground">{String(number).padStart(2, "0")}</span>
            <span className="truncate">{exercise.name}</span>
            {complete && (
              <span className="inline-flex shrink-0 items-center gap-1 self-center rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
                <CheckIcon className="size-3" strokeWidth={3} />
                Done
              </span>
            )}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {exercise.lastTime ? (
              <>
                Last time, {formatDate(exercise.lastTime.date, { month: "short", day: "numeric" })}:{" "}
                <span className="font-mono text-foreground">{summarize(exercise.lastTime.sets, unit)}</span>
              </>
            ) : exercise.planned ? (
              "First time. Pick a weight you can move with good form."
            ) : (
              `Logged here, but not part of ${dayName}.`
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {exercise.target && targetSets !== undefined && (
            <TargetControl
              sets={targetSets}
              reps={exercise.target.reps}
              editable={canEdit}
              exerciseName={exercise.name}
              onChange={changeTarget}
            />
          )}
          {canEdit && (
            <DeleteExerciseButton
              exerciseName={exercise.name}
              dayName={dayName}
              isLast={isLastPlanned}
              onConfirm={removeExercise}
            />
          )}
        </div>
      </header>

      {(sets.length > 0 || remaining > 0) && (
        <ol className="mt-4 flex flex-wrap gap-2" aria-label={`Sets for ${exercise.name}`}>
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
                onClick={() => removeSet(set.id)}
                disabled={isPlaceholder(set.id)}
                aria-label={`Delete set ${index + 1}`}
                className="grid size-6 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40"
              >
                <XIcon className="size-3.5" />
              </button>
            </li>
          ))}
          {/* The sets still to do. */}
          {Array.from({ length: remaining }, (_, index) => (
            <li
              key={`todo-${index}`}
              aria-label={`Set ${sets.length + index + 1}, not logged yet`}
              className="inline-flex h-8 min-w-12 items-center justify-center rounded-full border border-dashed border-border px-3 font-mono text-xs text-muted-foreground/70"
            >
              {sets.length + index + 1}
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

/** "4 × 8" with − and + to change the number of sets for this exercise. */
function TargetControl({
  sets,
  reps,
  editable,
  exerciseName,
  onChange,
}: {
  sets: number;
  reps: number;
  editable: boolean;
  exerciseName: string;
  onChange: (sets: number) => void;
}) {
  const label = (
    <span className="px-1 font-mono text-xs font-medium" title={`${sets} sets of ${reps} reps`}>
      {sets} × {reps}
    </span>
  );
  if (!editable) return <span className="rounded-full bg-muted px-2.5 py-1">{label}</span>;

  const button =
    "grid size-7 place-items-center rounded-full text-muted-foreground transition hover:bg-background hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent";
  return (
    <div role="group" aria-label={`Target sets for ${exerciseName}`} className="flex items-center rounded-full bg-muted p-0.5">
      <button type="button" onClick={() => onChange(sets - 1)} disabled={sets <= 1} aria-label="One fewer set" className={button}>
        <MinusIcon className="size-3.5" />
      </button>
      <span aria-live="polite">{label}</span>
      <button type="button" onClick={() => onChange(sets + 1)} disabled={sets >= 10} aria-label="One more set" className={button}>
        <PlusIcon className="size-3.5" />
      </button>
    </div>
  );
}

function DeleteExerciseButton({
  exerciseName,
  dayName,
  isLast,
  onConfirm,
}: {
  exerciseName: string;
  dayName: string;
  isLast: boolean;
  onConfirm: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Delete ${exerciseName} from ${dayName}`}
        className="grid size-8 place-items-center rounded-full text-muted-foreground transition hover:bg-danger/10 hover:text-danger"
      >
        <TrashIcon className="size-4" />
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={isLast ? `${dayName} needs at least one exercise` : `Delete ${exerciseName}?`}
        actions={
          isLast ? (
            <DialogButton onClick={() => setOpen(false)} autoFocus>
              OK
            </DialogButton>
          ) : (
            <>
              <DialogButton onClick={() => setOpen(false)} autoFocus>
                Cancel
              </DialogButton>
              <DialogButton
                danger
                onClick={() => {
                  setOpen(false);
                  onConfirm();
                }}
              >
                Delete
              </DialogButton>
            </>
          )
        }
      >
        {isLast ? (
          <>
            You can&apos;t delete {exerciseName} because it&apos;s the last exercise in the {dayName} workout. Add another
            exercise first.
          </>
        ) : (
          <>
            Are you sure you want to delete {exerciseName} from the {dayName} workout? It will be removed from every{" "}
            {dayName} day. Sets you&apos;ve already logged are kept.
          </>
        )}
      </Dialog>
    </>
  );
}

/** A modal dialog using the native <dialog> element, which handles focus and Escape. */
function Dialog({
  open,
  onClose,
  title,
  actions,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  actions: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog?.open) dialog?.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border border-border bg-card p-6 text-foreground shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <h2 id={titleId} className="text-lg font-semibold tracking-tight">
        {title}
      </h2>
      <p id={bodyId} className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {children}
      </p>
      <div className="mt-6 flex justify-end gap-2">{actions}</div>
    </dialog>
  );
}

function DialogButton({
  danger,
  autoFocus,
  onClick,
  children,
}: {
  danger?: boolean;
  autoFocus?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      autoFocus={autoFocus}
      onClick={onClick}
      className={`h-10 rounded-full px-5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        danger ? "bg-danger text-white hover:opacity-90" : "border border-border hover:bg-muted"
      }`}
    >
      {children}
    </button>
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

/**
 * Adds an exercise to the workout (and so to every day it comes up), with
 * suggestions from the exercise catalog as you type.
 */
function AddExercise({ dayId, dayName, existing }: { dayId: string; dayName: string; existing: string[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const inputId = useId();
  const listId = useId();

  const taken = new Set(existing.map((name) => name.toLowerCase()));
  const typed = query.trim().replace(/\s+/g, " ");
  const suggestions = searchExercises(query, 12)
    .filter((exercise) => !taken.has(exercise.name.toLowerCase()))
    .slice(0, 8);
  const exactMatch = suggestions.some((exercise) => exercise.name.toLowerCase() === typed.toLowerCase());
  const options = [
    ...suggestions.map((exercise) => ({ name: exercise.name, detail: exercise.muscle, isNew: false })),
    ...(typed && !exactMatch && !taken.has(typed.toLowerCase()) ? [{ name: typed, detail: "New exercise", isNew: true }] : []),
  ];

  function close() {
    setOpen(false);
    setQuery("");
    setActive(-1);
    setError(undefined);
  }

  function add(name: string) {
    if (taken.has(name.toLowerCase())) {
      setError(`${name} is already in ${dayName}.`);
      return;
    }
    setError(undefined);
    setListOpen(false);
    startTransition(async () => {
      const result = await addExerciseToDay(dayId, name);
      if (result.error) setError(result.error);
      else close();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-border py-5 text-sm font-medium text-muted-foreground transition hover:border-foreground/30 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <PlusIcon className="size-4" />
        Add an exercise to {dayName}
      </button>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const choice = active >= 0 ? options[active]?.name : typed;
        if (choice) add(choice);
      }}
      className="rounded-3xl border border-border bg-card p-5"
    >
      <label htmlFor={inputId} className="text-sm font-medium">
        Add an exercise to {dayName}
      </label>
      <p className="text-xs text-muted-foreground">It&apos;s added to every {dayName} day.</p>
      <div className="mt-3 flex gap-2">
        <div className="relative min-w-0 flex-1">
          <input
            id={inputId}
            role="combobox"
            aria-expanded={listOpen && options.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
            autoFocus
            autoComplete="off"
            maxLength={80}
            value={query}
            disabled={pending}
            placeholder="Search, e.g. dumbbell"
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(-1);
              setListOpen(true);
            }}
            onFocus={() => setListOpen(true)}
            onBlur={() => setListOpen(false)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setListOpen(true);
                setActive((index) => Math.min(index + 1, options.length - 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive((index) => Math.max(index - 1, -1));
              } else if (event.key === "Escape") {
                if (listOpen) {
                  event.preventDefault();
                  setListOpen(false);
                } else {
                  close();
                }
              }
            }}
            className="h-11 w-full rounded-xl border border-border bg-background px-3.5 outline-none transition focus:border-accent-ink/60 focus:ring-4 focus:ring-accent/30"
          />
          {listOpen && options.length > 0 && (
            <div
              // Keep focus in the input while choosing, so the list doesn't close first.
              onMouseDown={(event) => event.preventDefault()}
              className="absolute inset-x-0 top-full z-20 mt-1.5 overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
            >
              <div
                aria-hidden="true"
                className="grid grid-cols-[1fr_auto] gap-3 border-b border-border bg-muted/60 px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
              >
                <span>{typed ? "Matches" : "Popular exercises"}</span>
                <span>Muscle group</span>
              </div>
              <ul id={listId} role="listbox" aria-label="Exercises" className="max-h-80 overflow-y-auto py-1">
                {options.map((option, index) => (
                  <li
                    key={option.name}
                    id={`${listId}-${index}`}
                    role="option"
                    aria-selected={index === active}
                    onClick={() => add(option.name)}
                    onMouseEnter={() => setActive(index)}
                    className={`grid cursor-pointer grid-cols-[1fr_auto] gap-3 px-3.5 py-2 text-sm ${
                      index === active ? "bg-accent/20 dark:bg-accent/15" : ""
                    }`}
                  >
                    <span className="truncate font-medium">
                      {option.isNew ? <>Add &ldquo;{option.name}&rdquo;</> : option.name}
                    </span>
                    <span className="text-xs text-muted-foreground">{option.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={pending || (!typed && active < 0)}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {pending && <SpinnerIcon className="size-4" />}
          Add
        </button>
        <button
          type="button"
          onClick={close}
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

/** "185 lbs × 8, 8, 7" when the weight didn't change, else "185 × 8 · 175 × 10". */
function summarize(sets: Omit<LoggedSet, "id">[], unit: WeightUnit) {
  const format = (weight: number) => (weight === 0 ? "BW" : formatNumber(weight));
  if (sets.every((set) => set.weight === sets[0].weight)) {
    const weight = sets[0].weight;
    return `${weight === 0 ? "BW" : `${formatNumber(weight)} ${unit}`} × ${sets.map((set) => set.reps).join(", ")}`;
  }
  return sets.map((set) => `${format(set.weight)} × ${set.reps}`).join(" · ");
}
