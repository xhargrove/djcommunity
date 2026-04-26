import type { Metadata } from "next";
import Link from "next/link";

import { SiteLogo } from "@/components/brand/site-logo";
import { getSiteOrigin } from "@/lib/meta/site";
import { ROUTES } from "@/lib/routes";

const defaultDescription =
  "MixerHQ is a network for DJs: scene-first profiles, a social feed with photos and clips, city discovery, rooms for crews, and a place to share mixtape links — sign in to join.";

export async function generateMetadata(): Promise<Metadata> {
  const site = getSiteOrigin();
  const canonical = site ? `${site}${ROUTES.root}` : undefined;
  return {
    title: "MixerHQ",
    description: defaultDescription,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      type: "website",
      title: "MixerHQ",
      description: defaultDescription,
      url: canonical,
    },
    twitter: {
      card: "summary_large_image",
      title: "MixerHQ",
      description: defaultDescription,
    },
  };
}

const highlights = [
  {
    title: "DJ profiles",
    body: "Build your public identity — city, genres, how you play, and links so the scene can find you.",
  },
  {
    title: "Home feed",
    body: "Post captions with photos and short videos (carousel-friendly). Follow people and see what’s moving in the network.",
  },
  {
    title: "Explore",
    body: "Discover DJs, rooms, cities, and genres — dig into what’s trending where you play or where you’re visiting.",
  },
  {
    title: "Rooms",
    body: "Scene-based spaces for crews and topics — public rooms open fast; private rooms stay among members.",
  },
  {
    title: "Mashups & mixtapes",
    body: "Drop https links to your mixes and mashups (SoundCloud, Drive, etc.). The app doesn’t host audio files — you keep control of your files.",
  },
  {
    title: "Notifications",
    body: "Likes, comments, follows, and room activity so you can jump back into the conversation.",
  },
] as const;

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-[var(--border)] bg-[var(--surface-elevated)]/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <SiteLogo href={ROUTES.root} className="h-9 sm:h-10" />
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={ROUTES.login}
              className="rounded-full px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
            >
              Log in
            </Link>
            <Link
              href={ROUTES.signUp}
              className="rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-amber-900/15 transition hover:bg-amber-700"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14">
        <section className="text-center sm:text-left">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-800">
            For DJs and the scenes around them
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
            MixerHQ
          </h1>
          <p className="mt-2 text-lg font-medium text-zinc-800 sm:text-xl">
            Your crew, your city, your mixes — in one place.
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[var(--muted)] sm:mx-0">
            Show who you are, share moments from gigs and practice, discover other DJs, and point
            people to your mashups and mixtapes. Create a free account to open the full app — feed,
            explore, rooms, and more.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
            <Link
              href={ROUTES.signUp}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-amber-900/15 transition hover:bg-amber-700"
            >
              Create an account
            </Link>
            <Link
              href={ROUTES.login}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-zinc-200 bg-white px-6 py-2.5 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50"
            >
              I already have an account
            </Link>
          </div>
        </section>

        <section className="mt-16 border-t border-zinc-100 pt-14" aria-labelledby="features-heading">
          <h2
            id="features-heading"
            className="text-center text-lg font-semibold text-zinc-900 sm:text-left"
          >
            What you get after you sign in
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-[var(--muted)] sm:mx-0 sm:text-left">
            Everything below is in the authenticated app — this page is only the front door.
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {highlights.map((item) => (
              <li
                key={item.title}
                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-200/40"
              >
                <h3 className="text-sm font-semibold text-zinc-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{item.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-14 rounded-2xl border border-amber-200/80 bg-amber-50/60 px-5 py-6 sm:px-6">
          <h2 className="text-sm font-semibold text-amber-950">Quick start</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-amber-950/90">
            <li>Sign up with email and confirm your account.</li>
            <li>Finish onboarding — handle, city, genres, and how you DJ.</li>
            <li>Post to Home, browse Explore, join or start a Room, and add links on Mashups &amp; Mixtapes.</li>
          </ol>
        </section>
      </main>

      <footer className="border-t border-[var(--border)] bg-zinc-50/80 py-8">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 px-4 text-center sm:flex-row sm:px-6 sm:text-left">
          <p className="text-xs text-[var(--muted)]">
            © {new Date().getFullYear()} MixerHQ · Built for real-world DJ culture.
          </p>
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-medium text-zinc-600">
            <Link href={ROUTES.terms} className="hover:text-zinc-900">
              Terms
            </Link>
            <Link href={ROUTES.privacy} className="hover:text-zinc-900">
              Privacy
            </Link>
            <Link href={ROUTES.contact} className="hover:text-zinc-900">
              Contact &amp; safety
            </Link>
            <Link href={ROUTES.creator} className="hover:text-zinc-900">
              Creator roadmap
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
