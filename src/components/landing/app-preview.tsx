import type { ReactNode } from "react";

import { CheckIcon, FlameIcon, TrendingUpIcon, XIcon } from "@/components/icons";

const exercises = [
  { name: "Bench Press", target: "4 × 8", weight: "185 lb", done: 4, sets: 4 },
  { name: "Overhead Press", target: "3 × 10", weight: "115 lb", done: 3, sets: 3 },
  { name: "Incline DB Press", target: "3 × 12", weight: "60 lb", done: 1, sets: 3, active: true },
  { name: "Lateral Raise", target: "3 × 15", weight: "25 lb", done: 0, sets: 3 },
  { name: "Triceps Pushdown", target: "3 × 12", weight: "70 lb", done: 0, sets: 3 },
];

type DayState = "done" | "missed" | "today" | "rest";

const week: { label: string; state: DayState }[] = [
  { label: "M", state: "done" },
  { label: "T", state: "done" },
  { label: "W", state: "missed" },
  { label: "T", state: "done" },
  { label: "F", state: "today" },
  { label: "S", state: "rest" },
  { label: "S", state: "rest" },
];

const dayStyles: Record<DayState, string> = {
  done: "bg-accent text-accent-foreground ring-1 ring-inset ring-black/10",
  missed: "bg-danger/10 text-danger ring-1 ring-inset ring-danger/40",
  today: "bg-card text-foreground ring-2 ring-inset ring-foreground",
  rest: "bg-muted text-muted-foreground",
};

const setsDone = exercises.reduce((sum, e) => sum + e.done, 0);
const setsTotal = exercises.reduce((sum, e) => sum + e.sets, 0);

/** A static, decorative mock of the app's "today" screen for the hero. */
export function AppPreview() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto w-full max-w-[26rem] select-none motion-safe:animate-fade-up [animation-delay:250ms] lg:mr-0"
    >
      <div className="relative rounded-[28px] border border-border bg-card p-5 shadow-[0_40px_100px_-30px_rgb(0_0_0/0.3)] sm:p-6 dark:shadow-[0_40px_100px_-30px_rgb(0_0_0/0.9)]">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Friday · Week 6
            </p>
            <p className="mt-1.5 text-2xl font-semibold tracking-tight">Push Day</p>
            <p className="mt-0.5 text-sm text-muted-foreground">Push / Pull / Legs</p>
          </div>
          <ProgressRing done={setsDone} total={setsTotal} />
        </div>

        <div className="mt-5 grid grid-cols-7 gap-1.5">
          {week.map((day, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <span className="font-mono text-[10px] text-muted-foreground">{day.label}</span>
              <span className={`grid h-8 w-full place-items-center rounded-lg ${dayStyles[day.state]}`}>
                {day.state === "done" && <CheckIcon className="size-3.5" strokeWidth={3} />}
                {day.state === "missed" && <XIcon className="size-3.5" strokeWidth={3} />}
                {day.state === "today" && <span className="size-1.5 rounded-full bg-foreground" />}
              </span>
            </div>
          ))}
        </div>

        <ul className="mt-5 divide-y divide-border overflow-hidden rounded-2xl border border-border">
          {exercises.map((exercise) => (
            <li
              key={exercise.name}
              className={`flex items-center gap-3 px-4 py-3 ${exercise.active ? "bg-muted/70" : ""}`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{exercise.name}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {exercise.target} · {exercise.weight}
                </p>
              </div>
              <div className="flex gap-1">
                {Array.from({ length: exercise.sets }, (_, i) => (
                  <span
                    key={i}
                    className={`size-2.5 rounded-full ${
                      i < exercise.done
                        ? "bg-accent-ink"
                        : exercise.active && i === exercise.done
                          ? "bg-accent-ink/30 motion-safe:animate-pulse"
                          : "bg-border"
                    }`}
                  />
                ))}
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-stretch gap-2">
          <Readout label="Weight" value="60 lb" />
          <Readout label="Reps" value="12" />
          <div className="flex items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">
            <CheckIcon className="size-4" strokeWidth={2.5} />
            Log set
          </div>
        </div>
      </div>

      <FloatingCard className="-right-2 -top-7 rotate-3 sm:-right-10">
        <span className="grid size-9 place-items-center rounded-xl bg-accent text-accent-foreground">
          <TrendingUpIcon className="size-4" />
        </span>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            New PR
          </p>
          <p className="text-sm font-semibold">
            Bench · <span className="font-mono">205 lb</span>
          </p>
        </div>
      </FloatingCard>

      <FloatingCard className="-bottom-8 -left-2 -rotate-2 [animation-delay:-3s] sm:-left-12">
        <span className="grid size-9 place-items-center rounded-xl bg-orange-500/15 text-orange-500">
          <FlameIcon className="size-4" />
        </span>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Streak
          </p>
          <p className="text-sm font-semibold">
            <span className="font-mono">12</span> sessions in a row
          </p>
        </div>
      </FloatingCard>
    </div>
  );
}

function FloatingCard({ className, children }: { className: string; children: ReactNode }) {
  return (
    <div
      className={`absolute flex items-center gap-3 rounded-2xl border border-border bg-card/90 px-4 py-3 shadow-xl backdrop-blur motion-safe:animate-float ${className}`}
    >
      {children}
    </div>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 rounded-xl border border-border bg-background px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-mono text-sm font-semibold">{value}</p>
    </div>
  );
}

function ProgressRing({ done, total }: { done: number; total: number }) {
  const radius = 23;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative grid size-14 place-items-center">
      <svg viewBox="0 0 56 56" className="absolute inset-0 -rotate-90">
        <circle cx="28" cy="28" r={radius} fill="none" strokeWidth="5" className="stroke-muted" />
        <circle
          cx="28"
          cy="28"
          r={radius}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - done / total)}
          className="stroke-accent-ink"
        />
      </svg>
      <span className="font-mono text-[11px] font-semibold">
        {done}/{total}
      </span>
    </div>
  );
}
