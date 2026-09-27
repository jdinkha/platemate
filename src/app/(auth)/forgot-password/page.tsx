import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/components/auth/auth-forms";
import { redirectIfSignedIn } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Reset your password",
};

export default async function ForgotPasswordPage() {
  await redirectIfSignedIn();
  return <ForgotPasswordForm />;
}
