import type { Metadata } from "next";

import { STATUS_STYLES } from "@/components/app/day-status";
import { DayRow, MonthCalendar, MonthLink, Stat, type DaySummary } from "@/components/app/diary-parts";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { requireTrainingSetup } from "@/lib/auth";
import { getSessions, getSets } from "@/lib/data";
import { addMonths, eachDay, formatMonth, isValidMonth, monthBounds, monthOf } from "@/lib/dates";
import type { WeightUnit } from "@/lib/splits";
import {
  dayStatus,
  planFor,
  scheduledDay,
  trackingStart,
  volumeOf,
  type DayStatus,
  type PlanHistory,
  type Session,
  type SetLog,
} from "@/lib/training";
import { formatNumber } from "@/lib/units";

export const metadata: Metadata = {
  title: "Diary",
};

export default async function DiaryPage({ searchParams }: PageProps<"/diary">) {
  const { user, profile, history, today } = await requireTrainingSetup();
  const { month: requested } = await searchParams;
  const month = isValidMonth(requested) && requested <= monthOf(today) ? requested : monthOf(today);
  const unit = profile.unit_preference;

  // Only days from when the user started, up to today.
  const start = trackingStart(history)!;
  const bounds = monthBounds(month);
  const from = bounds.start < start ? start : bounds.start;
  const to = bounds.end > today ? today : bounds.end;
  const sessions = from <= to ? await getSessions(user.id, from, to) : [];
  const sets = await getSets(sessions.filter((session) => session.status === "completed").map((session) => session.id));

  const sessionsByDate = new Map(sessions.map((session) => [session.date, session]));
  const setsBySession = Map.groupBy(sets, (set) => set.session_id);
  const days =
    from <= to
      ? eachDay(from, to).map((date) => {
          const session = sessionsByDate.get(date);
          return summarize(date, today, history, session, (session && setsBySession.get(session.id)) ?? [], unit);
        })
      : [];
  const byDate = new Map(days.map((day) => [day.date, day]));

  const count = (...statuses: DayStatus[]) => days.filter((day) => statuses.includes(day.status)).length;
  const trained = count("trained");
  const missed = count("missed", "skipped");
  const volume = days.reduce((sum, day) => sum + day.volume, 0);

  const previousMonth = addMonths(month, -1);
  const nextMonth = addMonths(month, 1);
  const hasPrevious = monthBounds(previousMonth).end >= start;
  const hasNext = nextMonth <= monthOf(today);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">Diary</h1>
          <p className="mt-2 text-muted-foreground">Every day you&apos;ve tracked, including rest days and misses.</p>
        </div>
        <nav aria-label="Month" className="flex items-center gap-1">
          <MonthLink month={previousMonth} enabled={hasPrevious} label="Previous month">
            <ChevronLeftIcon className="size-4" />
          </MonthLink>
          <span className="min-w-36 text-center text-sm font-semibold">{formatMonth(month)}</span>
          <MonthLink month={nextMonth} enabled={hasNext} label="Next month">
            <ChevronRightIcon className="size-4" />
          </MonthLink>
        </nav>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Workouts" value={String(trained)} />
        <Stat
          label="Consistency"
          value={trained + missed > 0 ? `${Math.round((trained / (trained + missed)) * 100)}%` : "–"}
        />
        <Stat label="Missed" value={String(missed)} tone={missed > 0 ? "danger" : undefined} />
        <Stat
          label="Volume"
          value={volume > 0 ? `${new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(volume)} ${unit}` : "–"}
        />
      </dl>

      <section className="rounded-3xl border border-border bg-card p-5 sm:p-7" aria-label={`${formatMonth(month)} calendar`}>
        <MonthCalendar month={month} weekStartsOn={profile.week_starts_on} today={today} byDate={byDate} />
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
          {(["trained", "rest", "break", "missed"] as const).map((status) => (
            <span key={status} className="flex items-center gap-1.5">
              <span className={`size-3 rounded-[4px] ${STATUS_STYLES[status].cell}`} />
              {status === "missed" ? "Missed or skipped" : STATUS_STYLES[status].label}
            </span>
          ))}
        </div>
      </section>

      {days.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-border p-8 text-center text-muted-foreground">
          Nothing tracked this month.
        </p>
      ) : (
        <ol className="space-y-2">
          {[...days].reverse().map((day) => (
            <li key={day.date}>
              <DayRow day={day} isToday={day.date === today} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function summarize(
  date: string,
  today: string,
  history: PlanHistory,
  session: Session | undefined,
  sets: SetLog[],
  unit: WeightUnit
): DaySummary {
  const status = dayStatus(date, today, history, session);
  const planned = scheduledDay(planFor(history, date), date);
  // The workout recorded on the session, else the one the split scheduled.
  const recorded = session?.split_day_id ? history.days.get(session.split_day_id)?.day.name : undefined;
  const plannedName = recorded ?? planned?.name;

  switch (status) {
    case "trained": {
      const volume = volumeOf(sets, unit);
      const exercises = new Set(sets.map((set) => set.exercise)).size;
      return {
        date,
        status,
        title: recorded ?? "Workout",
        detail: `${exercises} ${exercises === 1 ? "exercise" : "exercises"} · ${sets.length} sets${
          volume > 0 ? ` · ${formatNumber(volume)} ${unit}` : ""
        }`,
        volume,
      };
    }
    case "break":
      return { date, status, title: "Break", detail: plannedName ? `${plannedName} was planned` : undefined, volume: 0 };
    case "skipped":
    case "missed":
      return { date, status, title: plannedName ?? "Workout", detail: STATUS_STYLES[status].label, volume: 0 };
    case "planned":
      return { date, status, title: planned?.name ?? "Workout", detail: "Up next today", volume: 0 };
    default:
      return { date, status, title: "Rest day", detail: "Recovery", volume: 0 };
  }
}
