import Link from "next/link";

import { ArrowRightIcon, CheckIcon } from "@/components/icons";
import { AppPreview } from "@/components/landing/app-preview";
import { Features } from "@/components/landing/features";
import { SiteHeader } from "@/components/landing/site-header";
import { SplitMarquee } from "@/components/landing/split-marquee";
import { LogoMark } from "@/components/logo";

/** The marketing page signed-out visitors see at "/". */
export function LandingPage() {
  return (
    <div className="flex flex-1 flex-col overflow-x-clip">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <SplitMarquee />
        <Features />
        <HowItWorks />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative isolate">
      <div
        aria-hidden="true"
        className="bg-grid absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_80%_70%_at_50%_0%,black,transparent)]"
      />
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-0 -z-10 h-[480px] w-[900px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-accent/30 blur-[120px] dark:bg-accent/10"
      />

      <div className="mx-auto grid max-w-6xl items-center gap-20 px-5 pb-24 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-[1.2fr_1fr] lg:gap-12 lg:pb-32 lg:pt-24">
        <div className="text-center lg:text-left">
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-xs backdrop-blur motion-safe:animate-fade-up">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full rounded-full bg-accent-ink opacity-60 motion-safe:animate-ping" />
              <span className="relative inline-flex size-2 rounded-full bg-accent-ink" />
            </span>
            The workout tracker for lifters
          </p>

          <h1 className="mt-7 text-[2.5rem] font-semibold leading-[0.95] tracking-tighter motion-safe:animate-fade-up [animation-delay:80ms] min-[400px]:text-5xl sm:text-7xl lg:text-[4.25rem] xl:text-[4.5rem]">
            Stack plates.
            <br />
            <span className="relative isolate mt-2 inline-block whitespace-nowrap px-1">
              <span
                aria-hidden="true"
                className="absolute -inset-x-2 bottom-0 top-[0.12em] -z-10 -skew-x-6 rounded-lg bg-accent"
              />
              <span className="text-accent-foreground">Stack progress.</span>
            </span>
          </h1>

          <p className="mx-auto mt-7 max-w-xl text-lg/relaxed text-muted-foreground motion-safe:animate-fade-up [animation-delay:160ms] lg:mx-0">
            PlateMate keeps your training honest. Pick a proven split, log every set in seconds, and
            watch a diary of hard work turn into real strength.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 motion-safe:animate-fade-up [animation-delay:240ms] sm:flex-row lg:justify-start">
            <Link
              href="/signup"
              className="group inline-flex h-13 w-full items-center justify-center gap-2 rounded-full bg-primary px-7 font-semibold text-primary-foreground shadow-lg shadow-black/10 transition hover:opacity-90 sm:w-auto"
            >
              Start your training log
              <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/demo"
              className="inline-flex h-13 w-full items-center justify-center rounded-full border border-border bg-card/60 px-7 font-semibold backdrop-blur transition hover:bg-muted sm:w-auto"
            >
              Try the demo
            </Link>
            {/* Larger screens have "Sign in" in the header. */}
            <Link
              href="/login"
              className="inline-flex h-13 w-full items-center justify-center rounded-full border border-border bg-card/60 px-7 font-semibold backdrop-blur transition hover:bg-muted sm:hidden"
            >
              I have an account
            </Link>
          </div>

          <ul className="mt-9 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground motion-safe:animate-fade-up [animation-delay:320ms] lg:justify-start">
            {["Sign up with Google or email", "Switch splits anytime", "Works on any device"].map(
              (item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <CheckIcon className="size-4 text-accent-ink" strokeWidth={2.5} />
                  {item}
                </li>
              )
            )}
          </ul>
        </div>

        <AppPreview />
      </div>
    </section>
  );
}

const steps = [
  {
    title: "Create your account",
    body: "Sign up with Google or email. It takes less time than your warm-up set.",
  },
  {
    title: "Choose your split",
    body: "Push/pull/legs, upper/lower, full body and more. Change it whenever life does.",
  },
  {
    title: "Show up and log",
    body: "Tap in your sets as you go. PlateMate keeps the history, the streaks and the gaps.",
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-16 border-t border-border bg-card/40 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-accent-ink">How it works</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tighter text-balance sm:text-5xl">
            From sign-up to first set in under a minute.
          </h2>
        </div>

        <ol className="mt-16 grid gap-10 md:grid-cols-3 md:gap-8">
          {steps.map((step, i) => (
            <li key={step.title} className="relative">
              <div className="flex items-center gap-4">
                <span className="font-mono text-5xl font-semibold tracking-tighter text-accent-ink">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {i < steps.length - 1 && (
                  <span aria-hidden="true" className="hidden h-px flex-1 bg-linear-to-r from-border to-transparent md:block" />
                )}
              </div>
              <h3 className="mt-5 text-xl font-semibold tracking-tight">{step.title}</h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="px-5 py-24 sm:px-8 sm:py-32">
      <div className="relative isolate mx-auto max-w-6xl overflow-hidden rounded-[32px] bg-accent px-6 py-20 text-center text-accent-foreground sm:px-16 sm:py-28">
        <div
          aria-hidden="true"
          className="bg-grid absolute inset-0 -z-10 [--grid-line:rgb(0_0_0/0.08)] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
        />
        {/* Weight plates peeking in from the corners */}
        <div aria-hidden="true" className="absolute -left-28 -top-28 -z-10 size-72 rounded-full border-[36px] border-black/[0.07]" />
        <div aria-hidden="true" className="absolute -bottom-36 -right-24 -z-10 size-96 rounded-full border-[48px] border-black/[0.07]">
          <div className="absolute inset-16 rounded-full border-[14px] border-black/[0.05]" />
        </div>

        <h2 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tighter text-balance sm:text-6xl">
          Your next PR starts with your first log.
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg/relaxed opacity-75">
          Create your account in seconds and walk into your next session with a plan.
        </p>
        <Link
          href="/signup"
          className="group mt-10 inline-flex h-13 items-center gap-2 rounded-full bg-accent-foreground px-8 font-semibold text-accent shadow-xl shadow-black/20 transition hover:scale-[1.02]"
        >
          Create your account
          <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-10 text-sm text-muted-foreground sm:flex-row sm:px-8">
        <div className="flex items-center gap-2.5">
          <LogoMark className="size-6" />
          <span>© {new Date().getFullYear()} Jacob Dinkha</span>
        </div>
        <nav aria-label="Footer" className="flex gap-6">
          <Link href="/demo" className="transition hover:text-foreground">
            Try the demo
          </Link>
          <Link href="/login" className="transition hover:text-foreground">
            Sign in
          </Link>
          <Link href="/signup" className="transition hover:text-foreground">
            Create account
          </Link>
        </nav>
      </div>
    </footer>
  );
}
