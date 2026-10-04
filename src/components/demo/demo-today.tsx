"use client";

import { useRef, useState, useSyncExternalStore } from "react";

import type { ActionResult } from "@/app/(app)/actions";
import { WorkoutSwitcher } from "@/components/app/day-controls";
import { DayLayout, Panel } from "@/components/app/day-layout";
import type { WeekDay } from "@/components/app/week-strip";
import { WorkoutLog, type ExerciseEntry, type WorkoutActions } from "@/components/app/workout-log";
import { MoonIcon } from "@/components/icons";
import { ProgressRing } from "@/components/progress-ring";
import { addDays, defaultWeekStart, eachDay, formatDate, startOfWeek, todayIn } from "@/lib/dates";
import {
  DEMO_COOKIE,
  DEMO_SPLIT,
  addDemoExercise,
  decodeDemo,
  deleteDemoSet,
  encodeDemo,
  logDemoSet,
  newDemo,
  removeDemoExercise,
  scheduledWorkout,
  setDemoTargetSets,
  targetReps,
  type DemoState,
} from "@/lib/demo";
import { getWorkout } from "@/lib/splits";
import type { DayStatus } from "@/lib/training";
import { formatNumber } from "@/lib/units";

// Browsers keep cookies up to about 4 KB, name included.
const MAX_COOKIE_VALUE = 4000;
const FULL: ActionResult = { error: "The demo can't hold any more. Create an account to keep logging." };

const timeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const localToday = () => todayIn(timeZone());

function nextMidnight() {
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);
  return midnight;
}

/** Calls `onChange` when the date may have changed: at midnight, and when the tab is shown again. */
function subscribeToDate(onChange: () => void) {
  let timer: ReturnType<typeof setTimeout>;
  const schedule = () => {
    timer = setTimeout(() => {
      onChange();
      schedule();
    }, nextMidnight().getTime() - Date.now() + 1000);
  };
  schedule();
  document.addEventListener("visibilitychange", onChange);
  return () => {
    clearTimeout(timer);
    document.removeEventListener("visibilitychange", onChange);
  };
}

/** The cookie is only read when the demo opens, so there's nothing to subscribe to. */
const noSubscription = () => () => {};

function readCookie() {
  const entry = document.cookie.split("; ").find((cookie) => cookie.startsWith(`${DEMO_COOKIE}=`));
  if (!entry) return null;
  try {
    return decodeURIComponent(entry.slice(DEMO_COOKIE.length + 1));
  } catch {
    return null;
  }
}

/** Saves the demo until the visitor's midnight. Only the demo page needs it, so it isn't sent anywhere else. */
function writeCookie(value: string) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${DEMO_COOKIE}=${value}; Expires=${nextMidnight().toUTCString()}; Path=/demo; SameSite=Lax${secure}`;
}

/**
 * Today's workout for the demo. The server doesn't know the visitor's date,
 * so it renders the day saved in the cookie, if there is one, and otherwise a
 * placeholder until the browser takes over.
 */
export function DemoToday({ cookie }: { cookie: string | null }) {
  const saved = decodeDemo(useSyncExternalStore(noSubscription, readCookie, () => cookie));
  const today = useSyncExternalStore(subscribeToDate, localToday, () => saved?.date ?? null);

  if (!today) return <Placeholder />;
  // A new day starts a new demo.
  return <DemoDay key={today} today={today} saved={saved?.date === today ? saved : null} />;
}

function DemoDay({ today, saved }: { today: string; saved: DemoState | null }) {
  const [state, setState] = useState(() => saved ?? newDemo(today, defaultWeekStart(timeZone())));
  // Changes build on this rather than `state`, so several made before React re-renders all count.
  const latest = useRef(state);

  function save(next: DemoState | string): ActionResult {
    if (typeof next === "string") return { error: next };
    const value = encodeURIComponent(encodeDemo(next));
    if (value.length > MAX_COOKIE_VALUE) return FULL;
    latest.current = next;
    setState(next);
    writeCookie(value);
    return {};
  }

  // Stand-ins for the server actions, so the log works just as it does when signed in.
  const actions: WorkoutActions = {
    logSet: async ({ exercise, weight, reps }) => save(logDemoSet(latest.current, exercise.name, weight, reps)),
    deleteSet: async (id) => save(deleteDemoSet(latest.current, Number(id))),
    updateTargetSets: async (workout, exercise, sets) => save(setDemoTargetSets(latest.current, workout, exercise, sets)),
    addExerciseToDay: async (workout, name) => save(addDemoExercise(latest.current, workout, name)),
    removeExerciseFromDay: async (workout, exercise) => save(removeDemoExercise(latest.current, workout, exercise)),
  };
  const chooseWorkout = (key: string) => save({ ...latest.current, workout: key });

  const scheduled = scheduledWorkout(today);
  const workout = getWorkout(DEMO_SPLIT, state.workout) ?? scheduled;
  const status: DayStatus = state.sets.length > 0 ? "trained" : scheduled ? "planned" : "rest";

  // The demo starts today, so earlier days have no history, and no other day can be opened.
  const weekStart = startOfWeek(today, state.weekStartsOn);
  const week: WeekDay[] = eachDay(weekStart, addDays(weekStart, 6)).map((date) => ({
    date,
    status: date < today ? "untracked" : date === today ? status : scheduledWorkout(date) ? "planned" : "rest",
    isToday: date === today,
    isSelected: date === today,
  }));
  const eyebrow = formatDate(today, { weekday: "short", month: "short", day: "numeric" });

  // A rest day with no workout chosen.
  if (!workout) {
    const next = nextWorkout(today);
    return (
      <DayLayout
        eyebrow={eyebrow}
        title="Rest day"
        subtitle={next ? `Next up: ${next.name}, ${formatDate(next.date, { weekday: "long" })}` : undefined}
        badge={status}
        week={week}
      >
        <Panel icon={<MoonIcon className="size-6" />}>
          <p className="text-muted-foreground">
            Recovery is part of the plan. Muscles grow between sessions, not during them.
          </p>
          <p className="mt-6 text-sm font-medium">Feeling good? Train anyway:</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {DEMO_SPLIT.workouts.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => chooseWorkout(option.key)}
                className="inline-flex h-10 items-center rounded-full border border-border bg-card px-4 text-sm font-medium transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {option.name}
              </button>
            ))}
          </div>
        </Panel>
      </DayLayout>
    );
  }

  // A workout to log.
  const planned = state.workouts[workout.key];
  const plannedNames = new Set(planned.map((exercise) => exercise.name));
  const added = [...new Set(state.sets.map((set) => set.exercise))].filter((name) => !plannedNames.has(name));

  const exercises: ExerciseEntry[] = [
    ...planned.map((exercise) => ({
      exerciseId: exercise.name,
      name: exercise.name,
      planned: true,
      target: { sets: exercise.sets, reps: targetReps(workout.key, exercise.name) },
    })),
    ...added.map((name) => ({ exerciseId: name, name, planned: false })),
  ].map((exercise) => ({
    ...exercise,
    sets: state.sets
      .filter((set) => set.exercise === exercise.name)
      .map((set) => ({ id: String(set.id), weight: set.weight, reps: set.reps })),
  }));

  const targetSets = planned.reduce((sum, exercise) => sum + exercise.sets, 0);
  const volume = Math.round(state.sets.reduce((sum, set) => sum + set.weight * set.reps, 0));
  const details = [
    DEMO_SPLIT.name,
    `${planned.length} ${planned.length === 1 ? "exercise" : "exercises"}`,
    volume > 0 ? `${formatNumber(volume)} lbs moved` : undefined,
  ].filter(Boolean);

  return (
    <DayLayout
      eyebrow={eyebrow}
      title={workout.name}
      subtitle={details.join(" · ")}
      badge={status}
      week={week}
      aside={<ProgressRing done={state.sets.length} total={targetSets} size="size-16" />}
    >
      <div>
        <WorkoutSwitcher
          workouts={DEMO_SPLIT.workouts.map((option) => ({ id: option.key, name: option.name }))}
          current={workout.key}
          onChange={chooseWorkout}
        />
      </div>
      <WorkoutLog
        key={workout.key}
        date={today}
        dayId={workout.key}
        dayName={workout.name}
        unit="lbs"
        editable
        exercises={exercises}
        actions={actions}
      />
    </DayLayout>
  );
}

/** The next scheduled workout after `date`. */
function nextWorkout(date: string) {
  for (let offset = 1; offset <= 7; offset++) {
    const day = addDays(date, offset);
    const workout = scheduledWorkout(day);
    if (workout) return { name: workout.name, date: day };
  }
  return undefined;
}

/** Holds the page's shape until the browser knows the date. */
function Placeholder() {
  return (
    <div aria-hidden="true" className="space-y-6 motion-safe:animate-pulse">
      <div className="h-56 rounded-3xl border border-border bg-card" />
      <div className="h-10 w-28 rounded-full bg-muted" />
      <div className="h-64 rounded-3xl border border-border bg-card" />
    </div>
  );
}
