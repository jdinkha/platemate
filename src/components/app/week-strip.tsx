import Link from "next/link";

import { STATUS_STYLES } from "@/components/app/day-status";
import { CheckIcon, MoonIcon, XIcon } from "@/components/icons";
import { formatDate } from "@/lib/dates";
import type { DayStatus } from "@/lib/training";

export type WeekDay = {
  date: string;
  status: DayStatus;
  isToday: boolean;
  isSelected: boolean;
  /** Where tapping the day goes; omitted for days that can't be opened. */
  href?: string;
};

export function WeekStrip({ days }: { days: WeekDay[] }) {
  return (
    <ol className="grid grid-cols-7 gap-1.5 sm:gap-2">
      {days.map((day) => {
        const style = STATUS_STYLES[day.status];
        const label = `${formatDate(day.date, { weekday: "long", month: "long", day: "numeric" })}: ${
          day.isToday ? "today, " : ""
        }${style.label}`;
        const cell = (
          <>
            <span className="sr-only">{label}</span>
            <span aria-hidden="true" className="font-mono text-[10px] uppercase text-muted-foreground">
              {formatDate(day.date, { weekday: "narrow" })}
            </span>
            <span
              aria-hidden="true"
              className={`grid h-9 w-full place-items-center rounded-lg transition ${style.cell} ${
                day.isSelected ? "outline-2 outline-offset-2 outline-foreground" : ""
              }`}
            >
              {day.status === "trained" && <CheckIcon className="size-4" strokeWidth={3} />}
              {(day.status === "missed" || day.status === "skipped") && (
                <XIcon className="size-4" strokeWidth={3} />
              )}
              {day.status === "break" && <MoonIcon className="size-4" strokeWidth={2.5} />}
              {day.isToday && day.status === "planned" && <span className="size-1.5 rounded-full bg-foreground" />}
            </span>
            <span
              aria-hidden="true"
              className={`font-mono text-[10px] ${day.isToday ? "font-semibold text-foreground" : "text-muted-foreground"}`}
            >
              {formatDate(day.date, { day: "numeric" })}
            </span>
          </>
        );

        return (
          <li key={day.date}>
            {day.href ? (
              <Link
                href={day.href}
                aria-current={day.isSelected ? "date" : undefined}
                className="flex flex-col items-center gap-1.5 rounded-xl p-0.5 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-accent"
              >
                {cell}
              </Link>
            ) : (
              <div className="flex flex-col items-center gap-1.5 p-0.5">
                {cell}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
