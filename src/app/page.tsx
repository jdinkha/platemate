import type { Metadata } from "next";

import { AppShell } from "@/components/app/app-shell";
import { DayView } from "@/components/app/day-view";
import { OnboardingForm } from "@/components/app/onboarding-form";
import { WeighInForm } from "@/components/app/weigh-in";
import { LandingPage } from "@/components/landing/landing-page";
import { getCurrentUser } from "@/lib/auth";
import { getPlanHistory, getProfile, weighInDue } from "@/lib/data";
import { formatDate, hourIn, todayIn } from "@/lib/dates";

export async function generateMetadata(): Promise<Metadata> {
  return (await getCurrentUser()) ? { title: "Today" } : {};
}

// Visitors get the landing page; signed-in users get today's workout.
export default async function Home({ searchParams }: PageProps<"/">) {
  const user = await getCurrentUser();
  if (!user) {
    return <LandingPage />;
  }

  const [profile, history] = await Promise.all([getProfile(user.id), getPlanHistory(user.id)]);
  if (!profile || history.timeline.length === 0) {
    return (
      <AppShell showNav={false}>
        <OnboardingForm defaultName={user.providerName} />
      </AppShell>
    );
  }

  const { workout } = await searchParams;
  const today = todayIn(profile.timezone);
  const hour = hourIn(profile.timezone);
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = profile.display_name.split(" ")[0];
  const askWeight = await weighInDue(user.id, today);

  return (
    <AppShell>
      {askWeight && (
        <section
          aria-labelledby="weigh-in-heading"
          className="mb-6 rounded-3xl border border-accent-ink/25 bg-accent/15 p-5 sm:p-7 dark:bg-accent/5"
        >
          <h2 id="weigh-in-heading" className="text-lg font-semibold">
            {askWeight === "first" ? "Weekly weigh-in" : "Weekly weigh-in, morning 2"}
          </h2>
          <p className="mb-3 mt-1 text-sm">
            {askWeight === "first"
              ? "Weigh in this morning and tomorrow morning. Insights averages the two to see whether you're eating enough for your goal, so one off day doesn't skew it."
              : "Weigh in again this morning. Insights averages it with yesterday's, so one off day doesn't skew your trend."}{" "}
            It&apos;s optional, and you can log your weight any time from Insights.
          </p>
          <WeighInForm unit={profile.unit_preference} skippable />
        </section>
      )}
      <DayView
        userId={user.id}
        profile={profile}
        history={history}
        date={today}
        today={today}
        choice={typeof workout === "string" ? workout : undefined}
        eyebrow={
          <>
            {formatDate(today, { weekday: "short", month: "short", day: "numeric" })}
            <span className="hidden sm:inline">
              {" · "}
              {greeting}
              {firstName && `, ${firstName}`}
            </span>
          </>
        }
        basePath="/"
      />
    </AppShell>
  );
}
