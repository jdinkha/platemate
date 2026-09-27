"use client";

import Link from "next/link";
import { useActionState, useState, type ReactNode } from "react";

import {
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
  type AuthFormState,
} from "@/app/auth/actions";
import {
  AlertIcon,
  ArrowRightIcon,
  EyeIcon,
  EyeOffIcon,
  GoogleIcon,
  MailIcon,
  SpinnerIcon,
} from "@/components/icons";

const inputClass =
  "block h-12 w-full rounded-xl border border-border bg-card px-4 text-[15px] text-foreground shadow-xs outline-none transition placeholder:text-muted-foreground/60 focus:border-accent-ink/60 focus:ring-4 focus:ring-accent/30";

export function LoginForm({ initialError }: { initialError?: string }) {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    signInWithEmail,
    { error: initialError }
  );

  return (
    <>
      <Heading title="Welcome back" subtitle="Sign in to pick up where you left off." />
      <GoogleButton />
      <Divider />
      <form action={formAction} className="space-y-4">
        <EmailField defaultValue={state.email} />
        <PasswordField autoComplete="current-password" />
        <FormError message={state.error} />
        <SubmitButton pending={pending}>Sign in</SubmitButton>
      </form>
      <FooterPrompt>
        New to PlateMate? <TextLink href="/signup">Create an account</TextLink>
      </FooterPrompt>
    </>
  );
}

export function SignupForm() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    signUpWithEmail,
    {}
  );

  if (state.checkEmail) {
    return <CheckYourEmail email={state.email} />;
  }

  return (
    <>
      <Heading
        title="Create your account"
        subtitle="Start logging your lifts in under a minute."
      />
      <GoogleButton />
      <Divider />
      <form action={formAction} className="space-y-4">
        <EmailField defaultValue={state.email} />
        <PasswordField autoComplete="new-password" minLength={8} hint="At least 8 characters" />
        <FormError message={state.error} />
        <SubmitButton pending={pending}>Create account</SubmitButton>
      </form>
      <FooterPrompt>
        Already have an account? <TextLink href="/login">Sign in</TextLink>
      </FooterPrompt>
    </>
  );
}

function GoogleButton() {
  const [state, formAction, pending] = useActionState<AuthFormState>(signInWithGoogle, {});

  return (
    <form action={formAction} className="space-y-3">
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-border bg-card text-[15px] font-medium shadow-xs transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? <SpinnerIcon className="size-5" /> : <GoogleIcon className="size-5" />}
        Continue with Google
      </button>
      <FormError message={state.error} />
    </form>
  );
}

function Heading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-2 text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function Divider() {
  return (
    <div className="my-6 flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
      <span className="h-px flex-1 bg-border" />
      or with email
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

function EmailField({ defaultValue }: { defaultValue?: string }) {
  return (
    <div className="space-y-2">
      <label htmlFor="email" className="text-sm font-medium">
        Email
      </label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        required
        // Keeps the email filled in after a failed attempt (React resets forms after an action).
        defaultValue={defaultValue}
        className={inputClass}
      />
    </div>
  );
}

function PasswordField({
  autoComplete,
  minLength,
  hint,
}: {
  autoComplete: "current-password" | "new-password";
  minLength?: number;
  hint?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        {hint && (
          <span id="password-hint" className="text-xs text-muted-foreground">
            {hint}
          </span>
        )}
      </div>
      <div className="relative">
        <input
          id="password"
          name="password"
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={minLength}
          aria-describedby={hint ? "password-hint" : undefined}
          className={`${inputClass} pr-12`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-xl text-muted-foreground transition hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-accent"
        >
          {visible ? <EyeOffIcon className="size-[18px]" /> : <EyeIcon className="size-[18px]" />}
        </button>
      </div>
    </div>
  );
}

function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="flex items-start gap-2.5 rounded-xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger"
    >
      <AlertIcon className="mt-px size-4 shrink-0" />
      {message}
    </p>
  );
}

function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[15px] font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-70"
    >
      {pending && <SpinnerIcon className="size-4" />}
      {children}
      {!pending && (
        <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
      )}
    </button>
  );
}

function FooterPrompt({ children }: { children: ReactNode }) {
  return <p className="mt-8 text-center text-sm text-muted-foreground">{children}</p>;
}

function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="font-semibold text-foreground underline decoration-accent decoration-2 underline-offset-4 transition hover:decoration-accent-ink"
    >
      {children}
    </Link>
  );
}

function CheckYourEmail({ email }: { email?: string }) {
  return (
    <div className="text-center">
      <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-accent text-accent-foreground shadow-sm ring-1 ring-black/10">
        <MailIcon className="size-7" />
      </div>
      <h1 className="mt-8 text-3xl font-semibold tracking-tight">Check your inbox</h1>
      <p className="mt-3 text-muted-foreground">
        We sent a confirmation link to{" "}
        <span className="font-medium text-foreground">{email ?? "your email"}</span>. Open it to
        activate your account.
      </p>
      <p className="mt-6 text-sm text-muted-foreground">
        Can&apos;t find it? Check your spam folder, or give it a minute.
      </p>
      <FooterPrompt>
        Already confirmed? <TextLink href="/login">Sign in</TextLink>
      </FooterPrompt>
    </div>
  );
}
