import type { DayStatus } from "@/lib/training";

/** How each kind of day looks everywhere it appears (week strip, calendar, diary). */
export const STATUS_STYLES: Record<DayStatus, { label: string; cell: string; badge: string }> = {
  trained: {
    label: "Trained",
    cell: "bg-accent text-accent-foreground ring-1 ring-inset ring-black/10",
    badge: "bg-accent text-accent-foreground",
  },
  planned: {
    label: "Planned",
    cell: "bg-card text-foreground ring-2 ring-inset ring-foreground/70",
    badge: "bg-muted text-foreground",
  },
  rest: {
    label: "Rest day",
    cell: "bg-muted text-muted-foreground dark:bg-white/[0.07]",
    badge: "bg-muted text-muted-foreground",
  },
  break: {
    label: "Break",
    cell: "bg-amber-500/15 text-amber-700 ring-1 ring-inset ring-amber-500/40 dark:text-amber-300",
    badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  skipped: {
    label: "Skipped",
    cell: "bg-danger/10 text-danger ring-1 ring-inset ring-danger/40",
    badge: "bg-danger/10 text-danger",
  },
  missed: {
    label: "Missed",
    cell: "bg-danger/10 text-danger ring-1 ring-inset ring-danger/40",
    badge: "bg-danger/10 text-danger",
  },
  untracked: {
    label: "Not tracked",
    cell: "text-muted-foreground/50 ring-1 ring-inset ring-border/60",
    badge: "bg-muted text-muted-foreground",
  },
};
