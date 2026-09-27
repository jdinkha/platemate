import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = {
  title: "Sign in",
};

const ERROR_MESSAGES: Record<string, string> = {
  auth: "That sign-in didn't go through. If you used an email link, it may have expired. Please try again.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  const initialError = typeof error === "string" ? ERROR_MESSAGES[error] : undefined;

  return <LoginForm initialError={initialError} />;
}
