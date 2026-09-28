import Link from "next/link";
import type { ReactNode } from "react";

import { STATUS_STYLES } from "@/components/app/day-status";
import { ChevronRightIcon } from "@/components/icons";
import { eachDay, formatDate, monthBounds, startOfWeek, weekdayLabels } from "@/lib/dates";
import type { DayStatus } from "@/lib/training";

export type DaySummary = {
  date: string;
  status: DayStatus;
  title: string;
  detail?: string;
  volume: number;
};

export function DayRow({ day, isToday }: { day: DaySummary; isToday: boolean }) {
  const style = STATUS_STYLES[day.status];
  const quiet = day.status === "rest";
  return (
    <Link
      href={isToday ? "/" : `/diary/${day.date}`}
      className={`flex items-center gap-4 rounded-2xl border border-border px-4 py-3 transition hover:border-foreground/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        quiet ? "bg-transparent" : "bg-card"
      }`}
    >
      <span className={`grid w-12 shrink-0 place-items-center rounded-xl py-1.5 leading-none ${style.cell}`}>
        <span className="font-mono text-[10px] uppercase tracking-wider">{formatDate(day.date, { weekday: "short" })}</span>
        <span className="mt-1 font-mono text-base font-semibold">{formatDate(day.date, { day: "numeric" })}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate font-medium ${quiet ? "text-muted-foreground" : ""}`}>
          {day.title}
          {isToday && <span className="ml-2 text-xs font-normal text-muted-foreground">Today</span>}
        </span>
        {day.detail && <span className="block truncate text-sm text-muted-foreground">{day.detail}</span>}
      </span>
      {!quiet && (
        <span className={`hidden shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold sm:inline ${style.badge}`}>
          {style.label}
        </span>
      )}
      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

export function MonthCalendar({
  month,
  weekStartsOn,
  today,
  byDate,
}: {
  month: string;
  weekStartsOn: number;
  today: string;
  byDate: Map<string, DaySummary>;
}) {
  const { start, end } = monthBounds(month);
  const leadingBlanks = eachDay(startOfWeek(start, weekStartsOn), start).length - 1;

  return (
    <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
      {weekdayLabels(weekStartsOn, "narrow").map((label, index) => (
        <span key={index} aria-hidden="true" className="pb-1 text-center font-mono text-[10px] uppercase text-muted-foreground">
          {label}
        </span>
      ))}
      {Array.from({ length: leadingBlanks }, (_, index) => (
        <span key={`blank-${index}`} />
      ))}
      {eachDay(start, end).map((date) => {
        const day = byDate.get(date);
        const number = formatDate(date, { day: "numeric" });
        const isToday = date === today;
        if (!day) {
          // Before tracking started, or still to come.
          return (
            <span
              key={date}
              className="grid h-10 place-items-center rounded-lg font-mono text-xs text-muted-foreground/50 sm:h-12"
            >
              {number}
            </span>
          );
        }
        return (
          <Link
            key={date}
            href={isToday ? "/" : `/diary/${date}`}
            aria-label={`${formatDate(date, { weekday: "long", month: "long", day: "numeric" })}: ${day.title}`}
            className={`grid h-10 place-items-center rounded-lg font-mono text-xs font-semibold sm:h-12 transition hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              STATUS_STYLES[day.status].cell
            } ${isToday ? "outline-2 outline-offset-2 outline-foreground" : ""}`}
          >
            {number}
          </Link>
        );
      })}
    </div>
  );
}

export function MonthLink({
  month,
  enabled,
  label,
  children,
}: {
  month: string;
  enabled: boolean;
  label: string;
  children: ReactNode;
}) {
  const className = "grid size-9 place-items-center rounded-full border border-border transition";
  if (!enabled) {
    return (
      <span aria-hidden="true" className={`${className} opacity-30`}>
        {children}
      </span>
    );
  }
  return (
    <Link href={`/diary?month=${month}`} aria-label={label} className={`${className} hover:bg-muted`}>
      {children}
    </Link>
  );
}

export function Stat({ label, value, tone }: { label: string; value: string; tone?: "danger" }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className={`mt-1 font-mono text-2xl font-semibold tracking-tight ${tone === "danger" ? "text-danger" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
