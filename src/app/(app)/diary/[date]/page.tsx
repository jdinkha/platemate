import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DayView } from "@/components/app/day-view";
import { ChevronLeftIcon } from "@/components/icons";
import { requireTrainingSetup } from "@/lib/auth";
import { formatDate, isValidISODate, monthOf } from "@/lib/dates";
import { trackingStart } from "@/lib/training";

export const metadata: Metadata = {
  title: "Diary",
};

// A past day: view what was logged, or fill in a day you forgot to log.
export default async function DiaryDayPage({ params, searchParams }: PageProps<"/diary/[date]">) {
  const { user, profile, history, today } = await requireTrainingSetup();
  const { date } = await params;
  const { workout } = await searchParams;
  const choice = typeof workout === "string" ? workout : undefined;

  if (!isValidISODate(date) || date > today || date < trackingStart(history)!) {
    notFound();
  }
  if (date === today) {
    redirect(choice ? `/?workout=${encodeURIComponent(choice)}` : "/");
  }

  return (
    <div className="space-y-5">
      <Link
        href={`/diary?month=${monthOf(date)}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ChevronLeftIcon className="size-4" />
        Diary
      </Link>
      <DayView
        userId={user.id}
        profile={profile}
        history={history}
        date={date}
        today={today}
        choice={choice}
        eyebrow={formatDate(date, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        basePath={`/diary/${date}`}
      />
    </div>
  );
}
