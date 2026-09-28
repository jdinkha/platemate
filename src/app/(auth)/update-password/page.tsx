import type { Metadata } from "next";

import { UpdatePasswordForm } from "@/components/auth/auth-forms";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Set a new password",
};

// Reached from a password reset email, which signs the user in first.
export default async function UpdatePasswordPage() {
  await requireUser();
  return <UpdatePasswordForm />;
}
