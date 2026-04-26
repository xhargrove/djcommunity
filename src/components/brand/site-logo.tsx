import Image from "next/image";
import Link from "next/link";

import { ROUTES } from "@/lib/routes";

const LOGO_SRC = "/mixerhq-logo.png";

type SiteLogoProps = {
  /** Navigation target; default is the signed-in home feed. */
  href?: string;
  /** Max height via Tailwind (width follows aspect ratio). */
  className?: string;
};

export function SiteLogo({
  href = ROUTES.home,
  className = "h-8 sm:h-9",
}: SiteLogoProps) {
  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
      aria-label="MixerHQ home"
    >
      <Image
        src={LOGO_SRC}
        alt="MixerHQ — DJ community network"
        width={640}
        height={200}
        className={`w-auto max-w-[min(52vw,220px)] object-contain object-left sm:max-w-[240px] ${className}`}
        priority
        sizes="(max-width: 640px) 52vw, 240px"
      />
    </Link>
  );
}
