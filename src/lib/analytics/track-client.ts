"use client";

import type { ProductEventName } from "@/lib/analytics/events";

/**
 * Dispatches a browser `CustomEvent` (`djcn:analytics`) for local debugging / future wiring.
 * If `window.gtag` exists and `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set, forwards to GA4.
 */
export function trackProductEvent(
  name: ProductEventName,
  payload?: Record<string, string | number | boolean | undefined>,
): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const detail = {
      name,
      ...payload,
      ts: Date.now(),
    };
    window.dispatchEvent(new CustomEvent("djcn:analytics", { detail }));

    const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    const gtag = (
      window as unknown as { gtag?: (...args: unknown[]) => void }
    ).gtag;
    if (typeof gtag === "function" && measurementId) {
      gtag("event", name, payload ?? {});
    }
  } catch {
    /* ignore analytics failures */
  }
}
