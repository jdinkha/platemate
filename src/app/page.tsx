import type { Metadata } from "next";

import { AppShell } from "@/components/app/app-shell";
import { DayView } from "@/components/app/day-view";
import { OnboardingForm } from "@/components/app/onboarding-form";
import { LandingPage } from "@/components/landing/landing-page";
import { getCurrentUser } from "@/lib/auth";
import { getPlanHistory, getProfile } from "@/lib/data";
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

  return (
    <AppShell>
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
