import Link from "next/link";

import { signOut } from "@/app/auth/actions";
import { LogOutIcon } from "@/components/icons";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#splits", label: "Splits" },
  { href: "#how-it-works", label: "How it works" },
];

export function SiteHeader({ user }: { user: { email?: string } | null }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Logo />

        <nav aria-label="Main" className="hidden items-center gap-8 text-sm md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-muted-foreground transition hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          {user ? (
            <>
              <span className="hidden max-w-52 truncate text-sm text-muted-foreground sm:block">
                {user.email}
              </span>
              <form action={signOut}>
                <button
                  type="submit"
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <LogOutIcon className="size-4" />
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden h-10 items-center rounded-full px-4 text-sm font-medium transition hover:bg-muted sm:inline-flex"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
