"use client";

import { useActionState, useState, type ReactNode } from "react";

import { completeOnboarding, type ActionResult } from "@/app/(app)/actions";
import { OptionGroup, SplitPicker } from "@/components/app/pickers";
import { AlertIcon, ArrowRightIcon, SpinnerIcon } from "@/components/icons";
import { GOALS, type Goal, type WeightUnit } from "@/lib/splits";

export function OnboardingForm({ defaultName }: { defaultName?: string }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(completeOnboarding, {});
  const [split, setSplit] = useState<string>();
  const [goal, setGoal] = useState<Goal>("mass");
  const [unit, setUnit] = useState<WeightUnit>("lbs");

  return (
    <form
      action={(formData) => {
        // "Today" depends on where the user is, so send the device's time zone.
        formData.set("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
        formAction(formData);
      }}
      className="space-y-6 motion-safe:animate-fade-up"
    >
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent-ink">Welcome to PlateMate</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Let&apos;s set up your training</h1>
        <p className="mt-2 text-muted-foreground">
          A few quick choices and your first workout is ready. You can change any of them later in Settings.
        </p>
      </div>

      <Step number={1} title="What should we call you?" hint="Shown when we greet you">
        <input
          name="name"
          required
          defaultValue={defaultName}
          maxLength={60}
          autoComplete="given-name"
          placeholder="Your name"
          aria-label="Your name"
          className="h-12 w-full rounded-xl border border-border bg-background px-4 outline-none transition focus:border-accent-ink/60 focus:ring-4 focus:ring-accent/30"
        />
      </Step>

      <Step number={2} title="Pick your split" hint="How your week is organized">
        <SplitPicker name="split" value={split} onChange={setSplit} />
      </Step>

      <Step number={3} title="What's your main goal?" hint="Sets your target sets and reps">
        <OptionGroup
          name="goal"
          legend="Goal"
          value={goal}
          onChange={setGoal}
          options={GOALS.map((option) => ({ value: option.id, label: option.label, description: option.description }))}
        />
      </Step>

      <Step number={4} title="Units" hint="For logging weights">
        <OptionGroup
          name="unit"
          legend="Weight unit"
          value={unit}
          onChange={setUnit}
          options={[
            { value: "lbs", label: "Pounds", description: "lbs" },
            { value: "kg", label: "Kilograms", description: "kg" },
          ]}
        />
      </Step>

      {state.error && (
        <p role="alert" className="flex items-start gap-2.5 rounded-xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">
          <AlertIcon className="mt-px size-4 shrink-0" />
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={!split || pending}
        className="group inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending && <SpinnerIcon className="size-4" />}
        {split ? "Start training" : "Pick a split to continue"}
        {!pending && split && <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />}
      </button>
    </form>
  );
}

function Step({ number, title, hint, children }: { number: number; title: string; hint: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-border bg-card p-5 sm:p-7">
      <div className="mb-5 flex items-baseline gap-3">
        <span className="font-mono text-sm font-semibold text-accent-ink">{String(number).padStart(2, "0")}</span>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">{hint}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
