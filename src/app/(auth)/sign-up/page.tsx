import { redirect } from "next/navigation";

import { SignUpForm } from "@/components/auth/sign-up-form";
import { AuthCard } from "@/components/auth/auth-card";
import { getCurrentUser } from "@/lib/auth/session";
import { ROUTES } from "@/lib/routes";

export default async function SignUpPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(ROUTES.home);
  }

  return (
    <AuthCard
      title="Create an account"
      description="Choose an email and a password. You may need to confirm your email depending on project settings."
    >
      <SignUpForm />
    </AuthCard>
  );
}
