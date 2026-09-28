import type { Metadata } from "next";

import { SettingsForm } from "@/components/app/settings-form";
import { requireTrainingSetup } from "@/lib/auth";
import { planFor } from "@/lib/training";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const { user, profile, history, today } = await requireTrainingSetup();
  const plan = planFor(history, today)!;

  const timeZones = Intl.supportedValuesOf("timeZone");
  if (!timeZones.includes(profile.timezone)) timeZones.unshift(profile.timezone);

  return (
    <SettingsForm
      profile={profile}
      templateKey={plan.templateKey}
      days={plan.days.map((day) => ({ id: day.id, name: day.name }))}
      schedule={Array.from(
        { length: 7 },
        (_, weekday) => plan.days.find((day) => day.weekdays.includes(weekday))?.id ?? null
      )}
      email={user.email}
      timeZones={timeZones}
    />
  );
}
