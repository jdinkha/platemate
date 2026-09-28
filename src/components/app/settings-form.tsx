"use client";

import Link from "next/link";
import { useOptimistic, useState, useSyncExternalStore, useTransition, type ReactNode } from "react";

import { updatePreferences, updateSplit, type ActionResult } from "@/app/(app)/actions";
import { signOut } from "@/app/auth/actions";
import { OptionGroup, SplitPicker } from "@/components/app/pickers";
import { ScheduleEditor, type ScheduleEditorProps } from "@/components/app/schedule-editor";
import { AlertIcon, CheckIcon, ChevronDownIcon, LogOutIcon, SpinnerIcon } from "@/components/icons";
import { GOALS } from "@/lib/splits";
import {
  applyThemePreference,
  readThemePreference,
  subscribeToThemePreference,
  type ThemePreference,
} from "@/lib/theme";
import type { Profile } from "@/lib/training";

type Props = {
  profile: Profile;
  /** The current split (a new one starts with each change of split or schedule). */
  splitId: string;
  /** The built-in split the current split came from. */
  templateKey: string | null;
  schedule: Omit<ScheduleEditorProps, "weekStartsOn" | "today" | "disabled" | "save">;
  today: string;
  email?: string;
  timeZones: string[];
};

type SaveStatus = { state: "idle" } | { state: "saving" } | { state: "saved" } | { state: "error"; message: string };

export function SettingsForm({ profile, splitId, templateKey, schedule, today, email, timeZones }: Props) {
  const [status, setStatus] = useState<SaveStatus>({ state: "idle" });
  const [, startTransition] = useTransition();
  const [switchingSplit, startSplitTransition] = useTransition();

  // Each control shows the new value immediately and settles on the saved
  // value when the page refreshes, snapping back by itself if saving fails.
  const [shownTemplate, showTemplate] = useOptimistic(templateKey);
  const [goal, showGoal] = useOptimistic(profile.goal);
  const [unit, showUnit] = useOptimistic(profile.unit_preference);
  const [weekStartsOn, showWeekStartsOn] = useOptimistic(profile.week_starts_on);
  const [timezone, showTimezone] = useOptimistic(profile.timezone);
  const [name, setName] = useState(profile.display_name);

  function save(action: () => Promise<ActionResult>, show: () => void, start = startTransition) {
    setStatus({ state: "saving" });
    start(async () => {
      show();
      const result = await action();
      if (result.error) {
        setStatus({ state: "error", message: result.error });
      } else {
        setStatus({ state: "saved" });
        setTimeout(() => setStatus((current) => (current.state === "saved" ? { state: "idle" } : current)), 2500);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-2 text-muted-foreground">Most changes save as you make them.</p>
      </div>
      <SaveIndicator status={status} />

      <Section
        title="Training split"
        description="Switching applies from today. Your diary keeps the split you used on each earlier day."
      >
        <SplitPicker
          name="split"
          value={shownTemplate ?? undefined}
          onChange={(id) => {
            if (id !== shownTemplate) save(() => updateSplit(id), () => showTemplate(id), startSplitTransition);
          }}
        />
      </Section>

      <Section
        title="Schedule"
        description={
          switchingSplit
            ? "Setting up your new split…"
            : "Train on the same weekdays every week, or follow a loop that doesn't care what day it is."
        }
      >
        {/* A saved schedule starts a new split, so start a fresh draft from it. */}
        <ScheduleEditor
          key={splitId}
          {...schedule}
          weekStartsOn={weekStartsOn}
          today={today}
          disabled={switchingSplit}
          save={(action) => save(action, () => {})}
        />
      </Section>

      <Section title="Goal" description="Sets the target sets and reps for each exercise in your split.">
        <OptionGroup
          name="goal"
          legend="Goal"
          value={goal}
          onChange={(next) => save(() => updatePreferences({ goal: next }), () => showGoal(next))}
          options={GOALS.map((option) => ({ value: option.id, label: option.label, description: option.description }))}
        />
      </Section>

      <Section title="Units and calendar">
        <div className="space-y-5">
          <Field label="Weight unit" hint="Everything you've logged is shown in the unit you pick.">
            <OptionGroup
              name="unit"
              legend="Weight unit"
              value={unit}
              onChange={(next) => save(() => updatePreferences({ weightUnit: next }), () => showUnit(next))}
              options={[
                { value: "lbs", label: "Pounds (lbs)" },
                { value: "kg", label: "Kilograms (kg)" },
              ]}
            />
          </Field>
          <Field label="Week starts on">
            <OptionGroup
              name="week-start"
              legend="Week starts on"
              value={weekStartsOn}
              onChange={(next) => save(() => updatePreferences({ weekStartsOn: next }), () => showWeekStartsOn(next))}
              options={[
                { value: 1, label: "Monday" },
                { value: 0, label: "Sunday" },
              ]}
            />
          </Field>
          <Field label="Time zone" hint="Decides when your day rolls over to the next workout.">
            <div className="flex flex-wrap gap-2">
              <Select
                id="timezone"
                label="Time zone"
                value={timezone}
                onChange={(next) => save(() => updatePreferences({ timezone: next }), () => showTimezone(next))}
                className="min-w-0 flex-1"
              >
                {timeZones.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone.replaceAll("_", " ")}
                  </option>
                ))}
              </Select>
              <button
                type="button"
                onClick={() => {
                  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
                  if (detected !== timezone) {
                    save(() => updatePreferences({ timezone: detected }), () => showTimezone(detected));
                  }
                }}
                className="h-10 rounded-full border border-border px-4 text-sm font-medium transition hover:bg-muted"
              >
                Use this device&apos;s
              </button>
            </div>
          </Field>
        </div>
      </Section>

      <Section title="Appearance">
        <AppearancePicker />
      </Section>

      <Section title="Profile and account">
        <div className="space-y-5">
          <Field label="Name" hint="Used to greet you on the Today page.">
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                save(() => updatePreferences({ displayName: name }), () => {});
              }}
            >
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={60}
                aria-label="Name"
                placeholder="Your name"
                className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-background px-3.5 text-sm outline-none transition focus:border-accent-ink/60 focus:ring-4 focus:ring-accent/30"
              />
              {name.trim() && name.trim() !== profile.display_name && (
                <button type="submit" className="h-10 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90">
                  Save
                </button>
              )}
            </form>
          </Field>
          {email && (
            <Field label="Email">
              <p className="text-sm">{email}</p>
            </Field>
          )}
          <div className="flex flex-wrap gap-2 border-t border-border pt-5">
            <Link
              href="/update-password"
              className="inline-flex h-10 items-center rounded-full border border-border px-4 text-sm font-medium transition hover:bg-muted"
            >
              Set or change password
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium transition hover:bg-muted"
              >
                <LogOutIcon className="size-4" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </Section>
    </div>
  );
}

function AppearancePicker() {
  // Stored in the browser, so it's read after hydration (null on the server).
  const preference = useSyncExternalStore(subscribeToThemePreference, readThemePreference, () => null);

  return (
    <OptionGroup<ThemePreference>
      name="appearance"
      legend="Appearance"
      value={preference}
      onChange={applyThemePreference}
      options={[
        { value: "system", label: "System" },
        { value: "light", label: "Light" },
        { value: "dark", label: "Dark" },
      ]}
    />
  );
}

/** A toast at the bottom of the screen. The live region stays mounted so updates are announced. */
function SaveIndicator({ status }: { status: SaveStatus }) {
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      {status.state !== "idle" && (
        <p
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium shadow-lg backdrop-blur ${
            status.state === "error"
              ? "border-danger/30 bg-card text-danger"
              : "border-border bg-card/95 text-foreground"
          }`}
        >
          {status.state === "saving" && <SpinnerIcon className="size-4" />}
          {status.state === "saved" && <CheckIcon className="size-4 text-accent-ink" strokeWidth={2.5} />}
          {status.state === "error" && <AlertIcon className="size-4" />}
          {status.state === "saving" ? "Saving…" : status.state === "saved" ? "All changes saved" : status.message}
        </p>
      )}
    </div>
  );
}

function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border bg-card p-5 sm:p-7">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-sm font-medium">{label}</p>
      {hint && <p className="mb-2.5 text-xs text-muted-foreground">{hint}</p>}
      <div className={hint ? "" : "mt-2.5"}>{children}</div>
    </div>
  );
}

function Select({
  id,
  label,
  value,
  onChange,
  disabled,
  className = "",
  children,
}: {
  id: string;
  /** Accessible name, when there's no <label> pointing at this select. */
  label?: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className={`relative inline-flex ${className}`}>
      <select
        id={id}
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full appearance-none rounded-full border border-border bg-background pl-4 pr-10 text-sm font-medium outline-none transition hover:bg-muted focus-visible:ring-4 focus-visible:ring-accent/30"
      >
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </span>
  );
}
