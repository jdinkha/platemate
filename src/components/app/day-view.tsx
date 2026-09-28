import Link from "next/link";
import type { ReactNode } from "react";

import { MarkDayButtons, UndoDayStatusButton, WorkoutSwitcher } from "@/components/app/day-controls";
import { STATUS_STYLES } from "@/components/app/day-status";
import { WeekStrip, type WeekDay } from "@/components/app/week-strip";
import { WorkoutLog, type ExerciseEntry } from "@/components/app/workout-log";
import { MoonIcon, SkipIcon } from "@/components/icons";
import { ProgressRing } from "@/components/progress-ring";
import { getLastSessions, getSessions, getSets } from "@/lib/data";
import { addDays, eachDay, formatDate, startOfWeek } from "@/lib/dates";
import {
  buildCalendar,
  sessionsNeededFrom,
  volumeOf,
  workoutForDay,
  type Calendar,
  type PlanHistory,
  type Profile,
} from "@/lib/training";
import { formatNumber, fromKg } from "@/lib/units";

type Props = {
  userId: string;
  profile: Profile;
  history: PlanHistory;
  date: string;
  today: string;
  /** A workout (split day id) picked with `?workout=` instead of the scheduled one. */
  choice?: string;
  /** Small line above the title, e.g. a greeting. */
  eyebrow: ReactNode;
  /** The page's own path, for "train anyway" links. */
  basePath: string;
};

/** Everything about one day: the week around it and the workout to log. */
export async function DayView({ userId, profile, history, date, today, choice, eyebrow, basePath }: Props) {
  const unit = profile.unit_preference;
  const weekStart = startOfWeek(date, profile.week_starts_on);
  const weekEnd = addDays(weekStart, 6);
  const sessions = await getSessions(userId, sessionsNeededFrom(history, weekStart), weekEnd);
  const calendar = buildCalendar(history, sessions, today);

  const sessionsByDate = new Map(sessions.map((session) => [session.date, session]));
  const session = sessionsByDate.get(date);
  const plan = calendar.planned(date).plan;
  const isLoop = plan?.scheduleType === "loop";
  const status = calendar.status(date, session);

  const week: WeekDay[] = eachDay(weekStart, weekEnd).map((day) => {
    const dayState = calendar.status(day, sessionsByDate.get(day));
    const openable = day <= today && dayState !== "untracked";
    return {
      date: day,
      status: dayState,
      isToday: day === today,
      isSelected: day === date,
      href: openable ? (day === today ? "/" : `/diary/${day}`) : undefined,
    };
  });

  // A day marked as a break or skipped.
  if (session && session.status !== "completed" && !choice) {
    const isBreak = session.status === "break";
    const planned = session.split_day_id ? history.days.get(session.split_day_id)?.day.name : undefined;
    return (
      <DayLayout
        eyebrow={eyebrow}
        title={isBreak ? "Taking a break" : "Workout skipped"}
        subtitle={planned ? `${planned} was planned` : undefined}
        badge={status}
        week={week}
      >
        <Panel icon={isBreak ? <MoonIcon className="size-6" /> : <SkipIcon className="size-6" />}>
          <p className="text-muted-foreground">
            {isBreak
              ? `Breaks don't count against your consistency.${
                  isLoop && planned ? ` ${planned} will still be next when you're back.` : " Rest up and come back strong."
                }`
              : `Skipped days count as missed in your diary${
                  isLoop ? ", and your loop moves on to what's next" : ""
                }. Changed your mind? Undo it and log your sets.`}
          </p>
          <div className="mt-5">
            <UndoDayStatusButton date={date} />
          </div>
        </Panel>
      </DayLayout>
    );
  }

  const { plan: workoutPlan, day } = workoutForDay(date, history, calendar, session, choice);

  // A rest day with no workout chosen.
  if (!day || !workoutPlan) {
    const next = nextWorkout(calendar, date);
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
          {plan && plan.days.length > 0 && (
            <>
              <p className="mt-6 text-sm font-medium">Feeling good? Train anyway:</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {plan.days.map((option) => (
                  <Link
                    key={option.id}
                    href={`${basePath}?workout=${option.id}`}
                    className="inline-flex h-10 items-center rounded-full border border-border bg-card px-4 text-sm font-medium transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    {option.name}
                  </Link>
                ))}
              </div>
            </>
          )}
        </Panel>
      </DayLayout>
    );
  }

  // A workout to log.
  const sets = session ? await getSets([session.id]) : [];
  const plannedIds = new Set(day.exercises.map((exercise) => exercise.exerciseId));
  const added = [...new Map(sets.filter((set) => !plannedIds.has(set.exercise_id)).map((set) => [set.exercise_id, set.exercise]))];
  const lastSessions = await getLastSessions(userId, [...plannedIds, ...added.map(([id]) => id)], date);

  const exercises: ExerciseEntry[] = [
    ...day.exercises.map((exercise) => ({
      exerciseId: exercise.exerciseId,
      name: exercise.name,
      target:
        exercise.targetSets && exercise.targetReps
          ? { sets: exercise.targetSets, reps: exercise.targetReps }
          : undefined,
    })),
    ...added.map(([exerciseId, name]) => ({ exerciseId, name })),
  ].map((exercise) => {
    const last = lastSessions.get(exercise.exerciseId);
    return {
      ...exercise,
      sets: sets
        .filter((set) => set.exercise_id === exercise.exerciseId)
        .map((set) => ({ id: set.id, weight: fromKg(set.weight_kg, unit), reps: set.reps })),
      lastTime: last && {
        date: last.date,
        sets: last.sets.map((set) => ({ weight: fromKg(set.weight_kg, unit), reps: set.reps })),
      },
    };
  });

  const targetSets = day.exercises.reduce((sum, exercise) => sum + (exercise.targetSets ?? 0), 0);
  const volume = volumeOf(sets, unit);
  const details = [
    workoutPlan.name,
    `${day.exercises.length} exercises`,
    volume > 0 ? `${formatNumber(volume)} ${unit} moved` : undefined,
  ].filter(Boolean);

  // Offer the day's split's workouts, plus the one already logged if it came from an older split.
  const options = plan?.days.some((option) => option.id === day.id) ? plan.days : [day, ...(plan?.days ?? [])];

  return (
    <DayLayout
      eyebrow={eyebrow}
      title={day.name}
      subtitle={details.join(" · ")}
      badge={status}
      week={week}
      aside={targetSets > 0 ? <ProgressRing done={sets.length} total={targetSets} size="size-16" /> : undefined}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        {options.length > 1 ? <WorkoutSwitcher workouts={options} current={day.id} /> : <span />}
        {sets.length === 0 && <MarkDayButtons date={date} />}
      </div>
      <WorkoutLog key={day.id} date={date} dayId={day.id} unit={unit} exercises={exercises} />
    </DayLayout>
  );
}

function DayLayout({
  eyebrow,
  title,
  subtitle,
  badge,
  week,
  aside,
  children,
}: {
  eyebrow: ReactNode;
  title: string;
  subtitle?: string;
  badge: keyof typeof STATUS_STYLES;
  week: WeekDay[];
  aside?: ReactNode;
  children: ReactNode;
}) {
  const showBadge = badge === "missed" || badge === "trained" || badge === "skipped" || badge === "break";
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border bg-card p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</p>
              {showBadge && (
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[badge].badge}`}>
                  {STATUS_STYLES[badge].label}
                </span>
              )}
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {aside}
        </div>
        <div className="mt-6">
          <WeekStrip days={week} />
        </div>
      </section>
      {children}
    </div>
  );
}

function Panel({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-border bg-card p-6 sm:p-8">
      <div className="mb-5 grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">{icon}</div>
      {children}
    </section>
  );
}

/** The next planned workout within four weeks after `date`. */
function nextWorkout(calendar: Calendar, date: string) {
  for (let offset = 1; offset <= 28; offset++) {
    const day = addDays(date, offset);
    const workout = calendar.planned(day).day;
    if (workout) return { name: workout.name, date: day };
  }
  return undefined;
}
