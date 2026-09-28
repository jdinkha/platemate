"use client";

import { MoonIcon, SunIcon } from "@/components/icons";
import { applyThemePreference } from "@/lib/theme";

export function ThemeToggle() {
  function toggleTheme() {
    const isDark = document.documentElement.classList.contains("dark");
    applyThemePreference(isDark ? "light" : "dark");
  }

  // Both icons are rendered and CSS picks one, so the server and client markup
  // always match regardless of the current theme.
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      className="group relative grid size-10 place-items-center rounded-full border border-border bg-card/60 text-foreground transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <SunIcon className="hidden size-[18px] transition-transform duration-500 group-hover:rotate-45 dark:block" />
      <MoonIcon className="size-[18px] transition-transform duration-500 group-hover:-rotate-12 dark:hidden" />
    </button>
  );
}
