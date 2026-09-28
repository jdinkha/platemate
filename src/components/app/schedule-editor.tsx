"use client";

import { useState, type ReactNode } from "react";

import { updateLoop, updateSchedule, type ActionResult } from "@/app/(app)/actions";
import { OptionGroup } from "@/components/app/pickers";
import { ChevronDownIcon, ChevronUpIcon, PlusIcon, XIcon } from "@/components/icons";
import { addDays, formatDate, weekdayLabels } from "@/lib/dates";
import { REST } from "@/lib/splits";

type DayId = string | null;

export type ScheduleEditorProps = {
  /** The current split's workouts. */
  days: { id: string; name: string }[];
  mode: "weekly" | "loop";
  /** The workout for each weekday (0 = Sunday), or null for rest. */
  weekly: DayId[];
  /** The loop in order; null entries are rest days. */
  loop: DayId[];
  /** The loop entry for today. */
  loopToday: number;
  /** The split's built-in defaults, when it came from a template. */
  defaults?: { weekly: DayId[]; loop: DayId[] };
  weekStartsOn: number;
  today: string;
  disabled: boolean;
  save: (action: () => Promise<ActionResult>) => void;
};

/**
 * Edits a draft of the schedule, saved with one button: a loop is built up
 * over several edits, and each save starts a new version of the split.
 */
export function ScheduleEditor(props: ScheduleEditorProps) {
  const { days, weekStartsOn, today, disabled, defaults, save } = props;
  const [mode, setMode] = useState(props.mode);
  const [weekly, setWeekly] = useState(props.weekly);
  const [loop, setLoop] = useState(props.loop);
  const [start, setStart] = useState(props.loopToday);

  const nameOf = (id: DayId) => (id ? (days.find((day) => day.id === id)?.name ?? "Workout") : "Rest");
  const same = (a: DayId[], b: DayId[]) => a.length === b.length && a.every((id, i) => id === b[i]);

  const dirty =
    mode !== props.mode ||
    (mode === "weekly" && !same(weekly, props.weekly)) ||
    (mode === "loop" && (!same(loop, props.loop) || start !== props.loopToday));
  const trainingDays = weekly.filter(Boolean).length;

  function reset() {
    setMode(props.mode);
    setWeekly(props.weekly);
    setLoop(props.loop);
    setStart(props.loopToday);
  }

  function submit() {
    save(() => (mode === "weekly" ? updateSchedule(weekly) : updateLoop(loop, start)));
  }

  // Loop editing keeps "today" on the same entry as entries move around.
  function move(index: number, offset: -1 | 1) {
    const target = index + offset;
    const next = [...loop];
    [next[index], next[target]] = [next[target], next[index]];
    setLoop(next);
    if (start === index) setStart(target);
    else if (start === target) setStart(index);
  }

  function remove(index: number) {
    setLoop(loop.filter((_, i) => i !== index));
    if (index < start || start === loop.length - 1) setStart(Math.max(0, start - 1));
  }

  const dayOrder = Array.from({ length: 7 }, (_, i) => (weekStartsOn + i) % 7);
  const dayNames = weekdayLabels(weekStartsOn, "long");
  const loopWorkouts = loop.filter(Boolean).length;

  return (
    <div className={disabled ? "pointer-events-none opacity-50" : ""} aria-busy={disabled}>
      <OptionGroup
        name="schedule-type"
        legend="Schedule type"
        value={mode}
        onChange={setMode}
        options={[
          { value: "weekly", label: "Weekly", description: "Same weekdays every week" },
          { value: "loop", label: "Loop", description: "Repeats in order, any day" },
        ]}
      />

      {mode === "weekly" ? (
        <div className="mt-5">
          <EditorHeading
            summary={`${trainingDays} training ${trainingDays === 1 ? "day" : "days"} a week.`}
            onReset={defaults && !same(weekly, defaults.weekly) ? () => setWeekly(defaults.weekly) : undefined}
          />
          <ul className="divide-y divide-border rounded-2xl border border-border">
            {dayOrder.map((weekday, position) => (
              <li key={weekday} className="flex items-center justify-between gap-4 px-4 py-2.5">
                <label htmlFor={`day-${weekday}`} className="text-sm font-medium">
                  {dayNames[position]}
                </label>
                <DaySelect
                  id={`day-${weekday}`}
                  days={days}
                  value={weekly[weekday]}
                  onChange={(value) => setWeekly(weekly.map((id, i) => (i === weekday ? value : id)))}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="mt-5">
          <EditorHeading
            summary={`Repeats every ${loop.length} ${loop.length === 1 ? "day" : "days"}, ${loopWorkouts} ${
              loopWorkouts === 1 ? "workout" : "workouts"
            }. A missed workout stays next until you do it or skip it.`}
            onReset={
              defaults && !same(loop, defaults.loop)
                ? () => {
                    setLoop(defaults.loop);
                    setStart(0);
                  }
                : undefined
            }
          />
          <ol className="divide-y divide-border rounded-2xl border border-border">
            {loop.map((entry, index) => (
              <li
                key={index}
                className={`flex items-center gap-2 px-3 py-2 first:rounded-t-2xl last:rounded-b-2xl sm:px-4 ${
                  index === start ? "bg-accent/15 dark:bg-accent/10" : ""
                }`}
              >
                <label
                  htmlFor={`loop-${index}`}
                  className={`w-12 shrink-0 font-mono text-xs ${
                    index === start ? "font-semibold text-accent-ink" : "text-muted-foreground"
                  }`}
                >
                  Day {index + 1}
                  {index === start && <span className="sr-only"> (today)</span>}
                </label>
                <DaySelect
                  id={`loop-${index}`}
                  days={days}
                  value={entry}
                  onChange={(value) => setLoop(loop.map((id, i) => (i === index ? value : id)))}
                />
                {index === start && (
                  <span
                    aria-hidden="true"
                    className="hidden rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground sm:inline"
                  >
                    Today
                  </span>
                )}
                <span className="ml-auto flex shrink-0">
                  <IconButton label={`Move day ${index + 1} up`} disabled={index === 0} onClick={() => move(index, -1)}>
                    <ChevronUpIcon className="size-4" />
                  </IconButton>
                  <IconButton
                    label={`Move day ${index + 1} down`}
                    disabled={index === loop.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ChevronDownIcon className="size-4" />
                  </IconButton>
                  <IconButton label={`Remove day ${index + 1}`} disabled={loop.length === 1} onClick={() => remove(index)}>
                    <XIcon className="size-4" />
                  </IconButton>
                </span>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={() => setLoop([...loop, null])}
            disabled={loop.length >= 28}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border py-3 text-sm font-medium text-muted-foreground transition hover:border-foreground/30 hover:text-foreground disabled:opacity-40"
          >
            <PlusIcon className="size-4" />
            Add a day
          </button>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <label htmlFor="loop-start" className="text-sm font-medium">
              Today is
            </label>
            <SelectShell>
              <select
                id="loop-start"
                value={start}
                onChange={(event) => setStart(Number(event.target.value))}
                className={selectClass}
              >
                {loop.map((entry, index) => (
                  <option key={index} value={index}>
                    Day {index + 1} · {nameOf(entry)}
                  </option>
                ))}
              </select>
            </SelectShell>
          </div>

          <div className="mt-4 rounded-2xl bg-muted/60 p-4">
            <p className="text-xs font-medium text-muted-foreground">Next 7 days, if you follow the loop</p>
            <ol className="mt-2 flex flex-wrap gap-1.5">
              {Array.from({ length: 7 }, (_, offset) => {
                const entry = loop[(start + offset) % loop.length];
                return (
                  <li
                    key={offset}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      entry ? "bg-accent text-accent-foreground" : "bg-background text-muted-foreground"
                    }`}
                  >
                    {formatDate(addDays(today, offset), { weekday: "short" })} · {nameOf(entry)}
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      )}

      {dirty && (
        <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-5">
          <p className="mr-auto text-xs text-muted-foreground">Applies from today. Earlier days keep their schedule.</p>
          <button
            type="button"
            onClick={reset}
            className="h-10 rounded-full px-4 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={submit}
            className="h-10 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Save schedule
          </button>
        </div>
      )}
    </div>
  );
}

function EditorHeading({ summary, onReset }: { summary: string; onReset?: () => void }) {
  return (
    <div className="mb-3 flex items-start justify-between gap-4">
      <p className="text-sm text-muted-foreground">{summary}</p>
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="shrink-0 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Reset to default
        </button>
      )}
    </div>
  );
}

const selectClass =
  "h-10 w-full appearance-none rounded-full border border-border bg-background pl-4 pr-10 text-sm font-medium outline-none transition hover:bg-muted focus-visible:ring-4 focus-visible:ring-accent/30";

function SelectShell({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-flex min-w-28">
      {children}
      <ChevronDownIcon className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </span>
  );
}

function DaySelect({
  id,
  days,
  value,
  onChange,
}: {
  id: string;
  days: { id: string; name: string }[];
  value: DayId;
  onChange: (value: DayId) => void;
}) {
  return (
    <SelectShell>
      <select
        id={id}
        value={value ?? REST}
        onChange={(event) => onChange(event.target.value === REST ? null : event.target.value)}
        className={selectClass}
      >
        <option value={REST}>Rest</option>
        {days.map((day) => (
          <option key={day.id} value={day.id}>
            {day.name}
          </option>
        ))}
      </select>
    </SelectShell>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
