import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";

import { AppShell } from "@/components/app/app-shell";
import { DemoToday } from "@/components/demo/demo-today";
import { GuestLinks } from "@/components/landing/site-header";
import { redirectIfSignedIn } from "@/lib/auth";
import { DEMO_COOKIE } from "@/lib/demo";

export const metadata: Metadata = {
  title: "Demo",
  description: "Try PlateMate's workout log without an account.",
};

// Signed-out visitors try today's workout. Signed-in users have the real thing at "/".
export default async function DemoPage() {
  await redirectIfSignedIn();
  const cookie = (await cookies()).get(DEMO_COOKIE)?.value ?? null;

  return (
    <AppShell showNav={false} actions={<GuestLinks />}>
      <aside className="mb-6 rounded-3xl border border-accent-ink/25 bg-accent/15 px-5 py-4 text-sm leading-relaxed dark:bg-accent/5">
        <p>
          <span className="font-semibold">This is a demo.</span>{" "}
          <span className="text-muted-foreground">
            Log sets, change targets and swap exercises. It&apos;s kept in this browser until midnight, then starts
            fresh.
          </span>{" "}
          <Link href="/signup" className="font-semibold underline decoration-accent-ink/50 underline-offset-4 hover:decoration-accent-ink">
            Create an account
          </Link>{" "}
          <span className="text-muted-foreground">to keep your training log.</span>
        </p>
      </aside>
      <DemoToday cookie={cookie} />
    </AppShell>
  );
}
