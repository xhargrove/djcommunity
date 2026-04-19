import type { Metadata } from "next";
import { Geist } from "next/font/google";

import "./globals.css";

import { getPublicEnv } from "@/lib/env/public";

const geistSans = Geist({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "DJ Community Network",
  description: "DJ Community Network",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  getPublicEnv();

  return (
    <html lang="en">
      <body
        className={`min-h-dvh bg-[var(--background)] antialiased ${geistSans.className}`}
      >
        {children}
      </body>
    </html>
  );
}
