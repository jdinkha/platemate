import Link from "next/link";
import type { ReactNode } from "react";

import { AppNav } from "@/components/app/app-nav";
import { LogoMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

/** Header and page frame for everything a signed-in user sees. */
export function AppShell({ children, showNav = true }: { children: ReactNode; showNav?: boolean }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link
            href="/"
            aria-label="PlateMate home"
            className="flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            <LogoMark className="size-8" />
            <span className="hidden text-lg font-semibold tracking-tight md:block">PlateMate</span>
          </Link>
          {showNav && <AppNav />}
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24 pt-8 sm:px-6">{children}</main>
    </div>
  );
}
