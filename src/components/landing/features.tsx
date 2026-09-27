import type { ComponentType, ReactNode, SVGProps } from "react";

import {
  BookIcon,
  CalendarIcon,
  CheckIcon,
  FlameIcon,
  RepeatIcon,
  ZapIcon,
} from "@/components/icons";

export function Features() {
  return (
    <section id="features" className="scroll-mt-16 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-accent-ink">Features</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tighter text-balance sm:text-5xl">
            Everything you need. Nothing you&apos;ll skip.
          </h2>
          <p className="mt-5 text-lg/relaxed text-muted-foreground">
            No bloated menus, no ten-tap logging. PlateMate does the handful of things that actually
            make you stronger, and does them fast.
          </p>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            className="md:col-span-2"
            icon={CalendarIcon}
            title="See every day you missed"
            body="Your calendar shows every session and every gap, so one skipped Tuesday never quietly becomes a skipped month."
          >
            <ConsistencyMap />
          </FeatureCard>
          <FeatureCard
            icon={ZapIcon}
            title="Log a set in seconds"
            body="Weight, reps, done. Big targets built for tired hands between sets."
          >
            <LogStepper />
          </FeatureCard>
          <FeatureCard
            icon={RepeatIcon}
            title="Pick a split, switch anytime"
            body="Start with a proven program and change it whenever your schedule does."
          >
            <SplitPicker />
          </FeatureCard>
          <FeatureCard
            icon={FlameIcon}
            title="Today's workout, ready"
            body="Open the app and your session is already laid out. No planning at the rack."
          >
            <TodayChecklist />
          </FeatureCard>
          <FeatureCard
            icon={BookIcon}
            title="A diary that remembers"
            body="Every session saved by day, so you always know what you lifted last time."
          >
            <Diary />
          </FeatureCard>
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  body,
  className = "",
  children,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  body: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <article
      className={`flex flex-col rounded-3xl border border-border bg-card p-6 transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_-24px_rgb(0_0_0/0.25)] sm:p-8 ${className}`}
    >
      <div aria-hidden="true" className="mb-8 flex flex-1 flex-col justify-center">
        {children}
      </div>
      <div className="flex items-center gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground ring-1 ring-black/10">
          <Icon className="size-4" />
        </span>
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      </div>
      <p className="mt-2.5 leading-relaxed text-muted-foreground">{body}</p>
    </article>
  );
}

/* ---------- Decorative feature visuals ---------- */

// One string per week (Mon–Sun). T = trained, R = rest, M = missed, N = today, F = future.
const weeks = [
  "TTRTTRR", "TMRTTTR", "TTRTTRR", "TTRMTRR", "TTRTTTR", "MTRTTRR",
  "TTRTTRR", "TTRTMRR", "TTRTTTR", "TTRTTRR", "TMRTTRR", "TTRTTTR",
  "TTRTTRR", "TTRTTTR", "TTRMTRR", "TTRTTRR", "TTRTTTR", "TTMTNFF",
];

const cellStyles: Record<string, string> = {
  T: "bg-accent ring-1 ring-inset ring-black/10",
  R: "bg-muted",
  M: "bg-danger/15 ring-1 ring-inset ring-danger/50",
  N: "ring-2 ring-inset ring-foreground",
  F: "ring-1 ring-inset ring-border",
};

const trained = weeks.join("").split("T").length - 1;
const missed = weeks.join("").split("M").length - 1;

function ConsistencyMap() {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Last {weeks.length} weeks
        </p>
        <p className="text-sm">
          <span className="font-mono font-semibold">{Math.round((trained / (trained + missed)) * 100)}%</span>{" "}
          <span className="text-muted-foreground">consistency · {missed} missed</span>
        </p>
      </div>
      <div className="flex gap-1 sm:gap-1.5">
        {weeks.map((week, w) => (
          // Narrow screens show the most recent 12 weeks.
          <div key={w} className={`flex flex-1 flex-col gap-1 sm:gap-1.5 ${w < weeks.length - 12 ? "hidden md:flex" : ""}`}>
            {week.split("").map((day, d) => (
              <span key={d} className={`aspect-square rounded-[5px] ${cellStyles[day]}`} />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-5 text-xs text-muted-foreground">
        <Legend className={cellStyles.T} label="Trained" />
        <Legend className={cellStyles.R} label="Rest" />
        <Legend className={cellStyles.M} label="Missed" />
      </div>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`size-3 rounded-[3px] ${className}`} />
      {label}
    </span>
  );
}

function LogStepper() {
  return (
    <div className="space-y-2.5">
      {[
        ["Weight", "185", "lb"],
        ["Reps", "8", ""],
      ].map(([label, value, unit]) => (
        <div
          key={label}
          className="flex items-center justify-between rounded-2xl border border-border bg-background p-2 pl-4"
        >
          <span className="text-sm text-muted-foreground">{label}</span>
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-muted text-lg font-medium">−</span>
            <span className="w-14 text-center font-mono text-xl font-semibold">
              {value}
              {unit && <span className="ml-0.5 text-xs font-normal text-muted-foreground">{unit}</span>}
            </span>
            <span className="grid size-9 place-items-center rounded-xl bg-muted text-lg font-medium">+</span>
          </div>
        </div>
      ))}
      <div className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground">
        <CheckIcon className="size-4" strokeWidth={2.5} />
        Log set 3 of 4
      </div>
    </div>
  );
}

function SplitPicker() {
  return (
    <div className="space-y-2">
      {[
        { name: "Push / Pull / Legs", days: "6 days a week", selected: true },
        { name: "Upper / Lower", days: "4 days a week", selected: false },
        { name: "Full Body", days: "3 days a week", selected: false },
      ].map(({ name, days, selected }) => (
        <div
          key={name}
          className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
            selected ? "border-accent-ink bg-accent/15 dark:bg-accent/10" : "border-border bg-background"
          }`}
        >
          <span
            className={`grid size-5 place-items-center rounded-full border-2 ${
              selected ? "border-accent-ink" : "border-border"
            }`}
          >
            {selected && <span className="size-2 rounded-full bg-accent-ink" />}
          </span>
          <div>
            <p className="text-sm font-medium">{name}</p>
            <p className="text-xs text-muted-foreground">{days}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function TodayChecklist() {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="flex items-baseline justify-between">
        <p className="font-semibold">Pull Day</p>
        <p className="font-mono text-xs text-muted-foreground">4 exercises</p>
      </div>
      <ul className="mt-3 space-y-2.5">
        {[
          { name: "Deadlift", target: "3 × 5", done: true },
          { name: "Pull-up", target: "4 × 8", done: true },
          { name: "Barbell Row", target: "3 × 10", done: false },
          { name: "Hammer Curl", target: "3 × 12", done: false },
        ].map(({ name, target, done }) => (
          <li key={name} className="flex items-center gap-3 text-sm">
            <span
              className={`grid size-5 place-items-center rounded-md ${
                done ? "bg-accent text-accent-foreground" : "ring-1 ring-inset ring-border"
              }`}
            >
              {done && <CheckIcon className="size-3" strokeWidth={3} />}
            </span>
            <span className={`flex-1 ${done ? "text-muted-foreground line-through decoration-1" : ""}`}>
              {name}
            </span>
            <span className="font-mono text-xs text-muted-foreground">{target}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Diary() {
  return (
    <ul className="space-y-2">
      {[
        { day: "FRI", date: "12", title: "Push Day", detail: "18 sets · 9,850 lb" },
        { day: "THU", date: "11", title: "Legs", detail: "15 sets · 14,200 lb" },
        { day: "WED", date: "10", title: "Missed", detail: "Pull Day skipped", missed: true },
        { day: "TUE", date: "9", title: "Pull Day", detail: "16 sets · 10,480 lb" },
      ].map((entry) => (
        <li
          key={entry.date}
          className="flex items-center gap-3 rounded-2xl border border-border bg-background px-3 py-2.5"
        >
          <span
            className={`grid w-10 shrink-0 place-items-center rounded-lg py-1 leading-none ${
              entry.missed ? "bg-danger/10 text-danger" : "bg-muted"
            }`}
          >
            <span className="font-mono text-[9px] tracking-wider">{entry.day}</span>
            <span className="mt-0.5 font-mono text-sm font-semibold">{entry.date}</span>
          </span>
          <div className="min-w-0">
            <p className={`text-sm font-medium ${entry.missed ? "text-danger" : ""}`}>{entry.title}</p>
            <p className="truncate text-xs text-muted-foreground">{entry.detail}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
