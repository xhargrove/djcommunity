# Performance expectations (lightweight SLOs)

Use these as **manual or synthetic check targets**, not a full APM suite. Measure on staging with realistic data volume.

## Flows & rough budgets

Targets assume warm server, Supabase in-region, no client throttling. Adjust for your hosting region.

| Flow | What to measure | Indicative target (p95) |
|------|-----------------|-------------------------|
| **Home / feed** | Server time to first byte for `/home` RSC payload | &lt; 2.5s cold, &lt; 1.2s warm |
| **Room open** | `/rooms/[slug]` initial load | &lt; 2s warm |
| **Send room message** | Server action round-trip success | &lt; 800ms excluding client animation |
| **Create post** | `createPostAction` success path (text-only faster than upload) | &lt; 1.5s text; uploads bound by size/network |
| **Onboarding submit** | Profile create/update action | &lt; 1.5s |

## How to measure

- **Browser:** DevTools Network + “Server” timing on document and server actions.
- **Hosting:** Vercel (or equivalent) function duration metrics; correlate with structured logs (`logServerError` categories: `database`, `storage`).
- **Database:** Supabase query stats / slow query log for N+1 or missing indexes.

## When to optimize

- p95 consistently above these bands after caching/auth checks are ruled out.
- Feed or discovery queries scanning large tables without indexes (review migrations and `explain` in staging).
