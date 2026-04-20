import type { Metadata } from "next";

import { getPrivateRouteRobots } from "@/lib/meta/indexing";

export async function generateMetadata(): Promise<Metadata> {
  return { robots: getPrivateRouteRobots() };
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      {children}
    </div>
  );
}
