import type { Metadata } from "next";

import { Stat } from "@/components/app/diary-parts";
import { AlertIcon, CheckIcon, ChevronRightIcon } from "@/components/icons";
import {
  analysisRanges,
  analyze,
  type Analysis,
  type Issue,
  type LiftTrend,
  type MuscleExercise,
} from "@/lib/analysis";
import { requireTrainingSetup } from "@/lib/auth";
import { getLoggedSets } from "@/lib/data";
import { formatDate } from "@/lib/dates";
import { MUSCLES } from "@/lib/exercises";
import type { WeightUnit } from "@/lib/splits";
import { formatNumber, fromKg } from "@/lib/units";

export const metadata: Metadata = {
  title: "Insights",
};

const SEVERITY_STYLES: Record<Issue["severity"], { label: string; icon: string; badge: string }> = {
  high: { label: "Fix this", icon: "text-danger", badge: "bg-danger/10 text-danger" },
  medium: {
    label: "Worth a look",
    icon: "text-amber-600 dark:text-amber-300",
    badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
};

const LIFT_STYLES: Record<LiftTrend["status"], { label: string; badge: string }> = {
  regressed: { label: "Weaker", badge: "bg-danger/10 text-danger" },
  stalled: { label: "Stalled", badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  progressing: { label: "Improving", badge: "bg-accent text-accent-foreground" },
  new: { label: "New", badge: "bg-muted text-muted-foreground" },
};

export default async function InsightsPage() {
  const { user, profile, history, today } = await requireTrainingSetup();
  const sets = (
    await Promise.all(analysisRanges(today).map((range) => getLoggedSets(user.id, range.from, range.to)))
  ).flat();
  const analysis = analyze(history, sets, today, profile.goal, profile.unit_preference);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight">Insights</h1>
        <p className="mt-2 text-muted-foreground">
          {analysis
            ? `Your plan against what you logged, ${formatDate(analysis.from, { month: "short", day: "numeric" })} – ${formatDate(analysis.to, { month: "short", day: "numeric" })}.`
            : "Your plan against what you logged."}
        </p>
      </div>
      {analysis ? (
        <Report analysis={analysis} unit={profile.unit_preference} />
      ) : (
        <p className="rounded-3xl border border-dashed border-border p-8 text-center text-muted-foreground">
          Insights start tomorrow, once you have a day of training to look at.
        </p>
      )}
    </div>
  );
}

function Report({ analysis, unit }: { analysis: Analysis; unit: WeightUnit }) {
  const { issues, lifts, completion } = analysis;
  const improving = lifts.filter((lift) => lift.status === "progressing").length;
  const judged = lifts.filter((lift) => lift.status !== "new").length;

  return (
    <>
      <section aria-labelledby="issues-heading" className="space-y-3">
        <h2 id="issues-heading" className="text-lg font-semibold">
          {issues.length > 0 ? `${issues.length} ${issues.length === 1 ? "thing needs" : "things need"} attention` : "All clear"}
        </h2>
        {issues.length === 0 ? (
          <p className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
            <CheckIcon className="size-5 shrink-0 text-accent-ink" />
            Your plan is balanced, you&apos;re following it, and your lifts are moving.
          </p>
        ) : (
          <ol className="space-y-2">
            {issues.map((issue) => {
              const style = SEVERITY_STYLES[issue.severity];
              return (
                <li key={issue.title} className="flex gap-3 rounded-2xl border border-border bg-card px-4 py-3">
                  <AlertIcon className={`mt-0.5 size-5 shrink-0 ${style.icon}`} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{issue.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{issue.detail}</p>
                  </div>
                  <span className={`h-fit shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${style.badge}`}>
                    {style.label}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Plan done"
          value={completion !== undefined ? `${Math.round(completion * 100)}%` : "–"}
          tone={completion !== undefined && completion < 0.8 ? "danger" : undefined}
        />
        <Stat label="Avg. done a week" value={formatNumber(Math.round(analysis.actualSets))} />
        <Stat label="Current plan a week" value={formatNumber(Math.round(analysis.plannedSets))} />
        <Stat label="Lifts improving" value={judged > 0 ? `${improving} of ${judged}` : "–"} />
      </dl>

      <MuscleChart analysis={analysis} />
      <Balance ratios={analysis.ratios} />
      <Lifts lifts={lifts} unit={unit} />
    </>
  );
}

/** Done as a bar, planned as a tick, per muscle. */
function MuscleChart({ analysis }: { analysis: Analysis }) {
  const scale = Math.max(1, ...analysis.muscles.flatMap((row) => [row.planned, row.actual]));
  const position = (value: number) => `${(value / scale) * 100}%`;
  const period = analysis.days === 28 ? "the past 4 weeks" : `the past ${analysis.days} days`;

  return (
    <section aria-labelledby="muscles-heading" className="rounded-3xl border border-border bg-card p-5 sm:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h2 id="muscles-heading" className="text-lg font-semibold">
          Weekly sets by muscle
        </h2>
        <div className="flex gap-4 text-xs text-muted-foreground" aria-hidden="true">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-r-[4px] bg-accent-ink" />
            Done (weekly average)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3.5 w-0.5 bg-foreground" />
            Planned (current plan)
          </span>
        </div>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Done is your average sets a week over {period} ({formatDate(analysis.from, { month: "short", day: "numeric" })} –{" "}
        {formatDate(analysis.to, { month: "short", day: "numeric" })}). Planned is a week of your current plan, even if you
        changed it today. A set counts toward every muscle it works: one set of bench press is 1 chest, ½ front delts and ½
        triceps. Tap a muscle to see the exercises behind it.
      </p>

      <ul className="mt-5 text-sm">
        {analysis.muscles.map((row) => (
          <li key={row.muscle}>
            <details className="group">
              <summary
                title={`${MUSCLES[row.muscle]}: ${formatNumber(row.actual)} sets a week on average over ${period}, ${formatNumber(row.planned)} a week in your current plan`}
                className="grid cursor-pointer list-none grid-cols-[7rem_1fr_6rem] items-center rounded-lg py-1.5 hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-accent sm:grid-cols-[8rem_1fr_6rem] [&::-webkit-details-marker]:hidden"
              >
                <span className="flex items-center gap-1 pr-3 font-medium">
                  <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
                  {MUSCLES[row.muscle]}
                  {row.skipped && <AlertIcon className="size-3.5 shrink-0 text-danger" aria-label="Being skipped" />}
                </span>
                <span className="relative h-4" aria-hidden="true">
                  <span className="absolute inset-y-0 left-0 right-0 my-auto h-2.5 bg-muted" />
                  <span
                    className={`absolute inset-y-0 left-0 my-auto h-2.5 rounded-r-[4px] ${row.skipped ? "bg-danger" : "bg-accent-ink"}`}
                    style={{ width: position(row.actual) }}
                  />
                  {row.planned > 0 && (
                    <span className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-foreground" style={{ left: position(row.planned) }} />
                  )}
                </span>
                <span className="whitespace-nowrap pl-3 text-right font-mono text-xs tabular-nums text-muted-foreground">
                  <span className="font-semibold text-foreground">{formatNumber(row.actual)}</span> /{" "}
                  {formatNumber(row.planned)}
                  <span className="sr-only"> sets a week, average done / current plan</span>
                </span>
              </summary>
              <MuscleExercises exercises={row.exercises} />
            </details>
          </li>
        ))}
      </ul>

      {analysis.unmapped.length > 0 && (
        <p className="mt-4 text-xs text-muted-foreground">
          Not counted, since we don&apos;t know which muscles they work: {analysis.unmapped.join(", ")}.
        </p>
      )}
    </section>
  );
}

const FRACTIONS: Record<number, string> = { 0.25: "¼", 0.5: "½", 0.75: "¾" };

/** What adds up to one muscle's weekly sets. */
function MuscleExercises({ exercises }: { exercises: MuscleExercise[] }) {
  return (
    <div className="mb-2 ml-5 mt-1 rounded-2xl bg-muted/50 px-4 py-3">
      {exercises.length === 0 ? (
        <p className="text-muted-foreground">Nothing in your plan or your log works this muscle.</p>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="pb-1 font-medium">Exercise</th>
              <th className="pb-1 text-right font-medium">Sets a week, avg. done / current plan</th>
            </tr>
          </thead>
          <tbody>
            {exercises.map((entry) => (
              <tr key={entry.exercise}>
                <th scope="row" className="py-1 pr-3 text-left font-normal">
                  {entry.exercise}
                  {entry.weight < 1 && (
                    <span className="text-muted-foreground">
                      {" "}
                      · each set counts {FRACTIONS[entry.weight] ?? formatNumber(entry.weight)}
                    </span>
                  )}
                </th>
                <td className="whitespace-nowrap py-1 text-right font-mono text-xs tabular-nums text-muted-foreground">
                  <span className="font-semibold text-foreground">{formatNumber(entry.actual)}</span> /{" "}
                  {formatNumber(entry.planned)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Balance({ ratios }: { ratios: Analysis["ratios"] }) {
  const show = (value: number | undefined, min: number, max: number) => {
    if (value === undefined) return <span className="text-muted-foreground">–</span>;
    const off = value < min || value > max;
    return (
      <span className={`font-mono tabular-nums ${off ? "font-semibold text-danger" : ""}`}>
        {formatNumber(value)}
        {off && <span className="sr-only"> (out of range)</span>}
      </span>
    );
  };

  return (
    <section aria-labelledby="balance-heading" className="rounded-3xl border border-border bg-card p-5 sm:p-7">
      <h2 id="balance-heading" className="text-lg font-semibold">
        Balance
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">Sets of the first muscle group for each set of the second.</p>
      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted-foreground">
            <th className="pb-2 font-medium">Pair</th>
            <th className="pb-2 text-right font-medium">Plan</th>
            <th className="pb-2 text-right font-medium">Done</th>
            <th className="pb-2 text-right font-medium">Aim</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {ratios.map((ratio) => (
            <tr key={ratio.label}>
              <th scope="row" className="py-2.5 pr-3 text-left font-medium">
                {ratio.label}
              </th>
              <td className="py-2.5 text-right">{show(ratio.planned, ratio.min, ratio.max)}</td>
              <td className="py-2.5 text-right">{show(ratio.actual, ratio.min, ratio.max)}</td>
              <td className="py-2.5 pl-3 text-right font-mono text-xs text-muted-foreground tabular-nums">
                {ratio.max === Infinity ? `≥ ${ratio.min}` : `${ratio.min}–${ratio.max}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Lifts({ lifts, unit }: { lifts: LiftTrend[]; unit: WeightUnit }) {
  const change = (current: number, before: number | undefined, label: string) => {
    if (before === undefined) return undefined;
    const percent = Math.round((current / before - 1) * 100);
    return `${percent > 0 ? "+" : ""}${percent}% ${label}`;
  };

  return (
    <section aria-labelledby="lifts-heading" className="space-y-3">
      <div>
        <h2 id="lifts-heading" className="text-lg font-semibold">
          Lifts
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your best estimated one-rep max in the last 4 weeks, against the 8 weeks before and the same weeks last year.
        </p>
      </div>
      {lifts.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-border p-8 text-center text-muted-foreground">
          Lifts show up here once you log sets.
        </p>
      ) : (
        <ol className="space-y-2">
          {lifts.map((lift) => {
            const style = LIFT_STYLES[lift.status];
            const best = lift.bodyweight
              ? `${lift.current} reps`
              : `${formatNumber(fromKg(lift.current, unit))} ${unit}`;
            const details = [
              change(lift.current, lift.previous, "vs 8 weeks before"),
              change(lift.current, lift.lastYear, "vs last year"),
            ].filter(Boolean);
            return (
              <li key={lift.exercise} className="flex items-center gap-4 rounded-2xl border border-border bg-card px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{lift.exercise}</p>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-mono text-foreground">{best}</span>
                    {details.length > 0 && ` · ${details.join(" · ")}`}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${style.badge}`}>{style.label}</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
