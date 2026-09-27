"use client";

import Link from "next/link";
import { useActionState, useState, type ReactNode } from "react";

import {
  requestPasswordReset,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
  updatePassword,
  type AuthFormState,
} from "@/app/auth/actions";
import {
  AlertIcon,
  ArrowRightIcon,
  CheckIcon,
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
        <PasswordField
          autoComplete="current-password"
          trailing={
            <Link
              href="/forgot-password"
              className="text-sm text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline"
            >
              Forgot password?
            </Link>
          }
        />
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
    return (
      <StatusPanel
        icon={<MailIcon className="size-7" />}
        title="Check your inbox"
        note="Can't find it? Check your spam folder, or give it a minute."
        footer={
          <>
            Already confirmed? <TextLink href="/login">Sign in</TextLink>
          </>
        }
      >
        We sent a confirmation link to <Email address={state.email} />. Open it to activate your
        account.
      </StatusPanel>
    );
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

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    requestPasswordReset,
    {}
  );

  if (state.checkEmail) {
    return (
      <StatusPanel
        icon={<MailIcon className="size-7" />}
        title="Check your inbox"
        note="Can't find it? Check your spam folder, or give it a minute."
        footer={<TextLink href="/login">Back to sign in</TextLink>}
      >
        If there&apos;s an account for <Email address={state.email} />, we&apos;ve sent it a link
        to set a new password.
      </StatusPanel>
    );
  }

  return (
    <>
      <Heading
        title="Reset your password"
        subtitle="Enter your account email and we'll send you a link to set a new one."
      />
      <form action={formAction} className="space-y-4">
        <EmailField defaultValue={state.email} />
        <FormError message={state.error} />
        <SubmitButton pending={pending}>Send reset link</SubmitButton>
      </form>
      <FooterPrompt>
        Remembered it? <TextLink href="/login">Sign in</TextLink>
      </FooterPrompt>
    </>
  );
}

export function UpdatePasswordForm() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    updatePassword,
    {}
  );

  if (state.passwordUpdated) {
    return (
      <StatusPanel
        icon={<CheckIcon className="size-7" strokeWidth={2.5} />}
        title="Password updated"
        footer={<TextLink href="/">Continue to PlateMate</TextLink>}
      >
        You&apos;re signed in, and your new password is ready for next time.
      </StatusPanel>
    );
  }

  return (
    <>
      <Heading
        title="Choose a new password"
        subtitle="You'll use it the next time you sign in with email."
      />
      <form action={formAction} className="space-y-4">
        <PasswordField
          autoComplete="new-password"
          label="New password"
          minLength={8}
          hint="At least 8 characters"
        />
        <FormError message={state.error} />
        <SubmitButton pending={pending}>Update password</SubmitButton>
      </form>
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
  label = "Password",
  minLength,
  hint,
  trailing,
}: {
  autoComplete: "current-password" | "new-password";
  label?: string;
  minLength?: number;
  hint?: string;
  trailing?: ReactNode;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <label htmlFor="password" className="text-sm font-medium">
          {label}
        </label>
        {hint && (
          <span id="password-hint" className="text-xs text-muted-foreground">
            {hint}
          </span>
        )}
        {trailing}
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

function StatusPanel({
  icon,
  title,
  children,
  note,
  footer,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  note?: string;
  footer: ReactNode;
}) {
  return (
    <div className="text-center">
      <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-accent text-accent-foreground shadow-sm ring-1 ring-black/10">
        {icon}
      </div>
      <h1 className="mt-8 text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-3 text-muted-foreground">{children}</p>
      {note && <p className="mt-6 text-sm text-muted-foreground">{note}</p>}
      <FooterPrompt>{footer}</FooterPrompt>
    </div>
  );
}

function Email({ address }: { address?: string }) {
  return <span className="font-medium text-foreground">{address ?? "your email"}</span>;
}
