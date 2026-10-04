import type { ReactNode } from "react";

import { STATUS_STYLES } from "@/components/app/day-status";
import { WeekStrip, type WeekDay } from "@/components/app/week-strip";

/** A day's page: a card with its title and the week around it, then the day's content. */
export function DayLayout({
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

export function Panel({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-border bg-card p-6 sm:p-8">
      <div className="mb-5 grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">{icon}</div>
      {children}
    </section>
  );
}
