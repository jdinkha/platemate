import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { TrendingUpIcon } from "@/components/icons";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/server";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  // Already signed in? There's nothing to do on these pages.
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) {
    redirect("/");
  }

  return (
    <div className="flex flex-1">
      <div className="flex flex-1 flex-col px-5 py-5 sm:px-10 sm:py-8">
        <header className="flex items-center justify-between">
          <Logo />
          <ThemeToggle />
        </header>
        <main className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-sm motion-safe:animate-fade-up">{children}</div>
        </main>
      </div>

      <BrandPanel />
    </div>
  );
}

function BrandPanel() {
  return (
    <aside
      aria-hidden="true"
      className="relative isolate hidden w-[46%] max-w-[760px] flex-col justify-between overflow-hidden bg-accent p-12 text-accent-foreground lg:flex xl:p-16 dark:bg-card dark:text-foreground"
    >
      <div className="bg-grid absolute inset-0 -z-10 [--grid-line:rgb(0_0_0/0.08)] [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_75%)] dark:[--grid-line:rgb(255_255_255/0.05)]" />
      <div className="absolute -right-40 -top-40 -z-10 hidden size-[520px] rounded-full bg-accent/15 blur-3xl dark:block" />
      {/* Oversized weight plate */}
      <div className="absolute -bottom-48 -right-48 -z-10 size-[560px] rounded-full border-[56px] border-black/[0.06] dark:border-white/[0.04]">
        <div className="absolute inset-[90px] rounded-full border-[20px] border-black/[0.05] dark:border-white/[0.03]" />
      </div>

      <p className="font-mono text-xs uppercase tracking-[0.25em] opacity-70">Train · Log · Repeat</p>

      <div>
        <p className="text-6xl font-semibold leading-[0.95] tracking-tighter xl:text-7xl">
          Stack plates.
          <br />
          <span className="dark:text-accent">Stack progress.</span>
        </p>
        <p className="mt-6 max-w-sm text-lg/relaxed opacity-75">
          Every set you log becomes proof of how far you&apos;ve come.
        </p>
      </div>

      <div className="max-w-md rounded-2xl bg-accent-foreground p-6 text-white shadow-2xl ring-1 ring-white/10">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">
              Session complete
            </p>
            <p className="mt-1 text-xl font-semibold">Pull Day</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
            <TrendingUpIcon className="size-3.5" />
            New PR
          </span>
        </div>
        <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-white/10 pt-5">
          {[
            ["Duration", "52 min"],
            ["Sets", "18"],
            ["Volume", "11,240 lb"],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-white/50">{label}</dt>
              <dd className="mt-1 font-mono text-lg font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </aside>
  );
}
