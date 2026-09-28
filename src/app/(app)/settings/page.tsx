import type { Metadata } from "next";

import { SettingsForm } from "@/components/app/settings-form";
import { requireTrainingSetup } from "@/lib/auth";
import { getSessions } from "@/lib/data";
import { REST, getSplit } from "@/lib/splits";
import { buildCalendar, planFor, sessionsNeededFrom } from "@/lib/training";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const { user, profile, history, today } = await requireTrainingSetup();
  const plan = planFor(history, today)!;
  const sessions = await getSessions(user.id, sessionsNeededFrom(history, today), today);
  const calendar = buildCalendar(history, sessions, today);

  // The template's defaults, with its workout keys mapped to this split's workouts.
  const template = getSplit(plan.templateKey);
  const matchesTemplate =
    template?.workouts.length === plan.days.length &&
    template.workouts.every((workout, i) => workout.name === plan.days[i].name);
  const idFor = (key: string) =>
    key === REST ? null : (plan.days[template!.workouts.findIndex((workout) => workout.key === key)]?.id ?? null);
  const defaults = matchesTemplate
    ? {
        // Templates list the week Monday first; weekdays here are 0 = Sunday.
        weekly: Array.from({ length: 7 }, (_, weekday) => idFor(template.schedule[(weekday + 6) % 7])),
        loop: template.loop.map(idFor),
      }
    : undefined;

  const currentWeekly = Array.from(
    { length: 7 },
    (_, weekday) => plan.days.find((day) => day.weekdays.includes(weekday))?.id ?? null
  );
  const isLoop = plan.scheduleType === "loop";

  const timeZones = Intl.supportedValuesOf("timeZone");
  if (!timeZones.includes(profile.timezone)) timeZones.unshift(profile.timezone);

  return (
    <SettingsForm
      profile={profile}
      splitId={plan.id}
      templateKey={plan.templateKey}
      schedule={{
        days: plan.days.map((day) => ({ id: day.id, name: day.name })),
        mode: plan.scheduleType,
        // The mode not in use starts from the template's default, ready to switch to.
        weekly: isLoop ? (defaults?.weekly ?? currentWeekly) : currentWeekly,
        loop: isLoop
          ? plan.loop.map((day) => day?.id ?? null)
          : (defaults?.loop ?? [...plan.days.map((day) => day.id), null]),
        loopToday: calendar.loopIndex(today) ?? 0,
        defaults,
      }}
      today={today}
      email={user.email}
      timeZones={timeZones}
    />
  );
}
