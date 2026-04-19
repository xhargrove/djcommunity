import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { AuthCard } from "@/components/auth/auth-card";
import { getSafeRedirectTarget } from "@/lib/auth/redirect";
import { getCurrentUser } from "@/lib/auth/session";

type PageProps = {
  searchParams: Promise<{ next?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const nextRaw = params.next;
  const nextParam = Array.isArray(nextRaw) ? nextRaw[0] : nextRaw;

  const user = await getCurrentUser();
  if (user) {
    redirect(getSafeRedirectTarget(nextParam));
  }

  return (
    <AuthCard
      title="Log in"
      description="Use your email and password to access your account."
    >
      <LoginForm nextParam={nextParam} />
    </AuthCard>
  );
}
