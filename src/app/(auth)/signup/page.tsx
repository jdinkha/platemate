import type { Metadata } from "next";

import { SignupForm } from "@/components/auth/auth-forms";
import { redirectIfSignedIn } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Create your account",
};

export default async function SignupPage() {
  await redirectIfSignedIn();
  return <SignupForm />;
}
