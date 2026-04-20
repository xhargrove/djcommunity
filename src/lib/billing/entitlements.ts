import "server-only";

/**
 * Canonical place to resolve paid / tiered capabilities once billing exists.
 * Launch: single free tier; no Stripe or entitlement rows — avoids UI-only “Pro” checks.
 */
export type BillingTier = "free";

export type ViewerEntitlements = {
  tier: BillingTier;
  /** True when a paid product is active for the viewer (future). */
  hasPaidProduct: false;
};

/**
 * Returns entitlements for the current product state. Wire to billing provider + DB when ready.
 */
export async function getViewerEntitlements(): Promise<ViewerEntitlements> {
  return { tier: "free", hasPaidProduct: false };
}
