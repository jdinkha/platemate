import Link from "next/link";

import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Logo wordmarkClassName="hidden sm:block" />
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/demo"
            className="inline-flex h-10 items-center rounded-full border border-foreground/25 px-4 text-sm font-medium transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Demo
          </Link>
          <ThemeToggle />
          <GuestLinks />
        </div>
      </div>
    </header>
  );
}

/** "Sign in" and "Get started", for signed-out visitors. "Sign in" is hidden on small screens. */
export function GuestLinks() {
  return (
    <>
      <Link
        href="/login"
        className="hidden h-10 items-center rounded-full px-4 text-sm font-medium transition hover:bg-muted sm:inline-flex"
      >
        Sign in
      </Link>
      <Link
        href="/signup"
        className="inline-flex h-10 items-center whitespace-nowrap rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
      >
        Get started
      </Link>
    </>
  );
}
