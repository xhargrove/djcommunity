# Legal / org readiness (engineering handoff)

This file is **not** legal advice. It separates **what the codebase does** from **what the organization must still do**.

## What the app does *not* claim

- Terms, Privacy, and Contact pages are **draft placeholders** (see `DraftLegalBanner` and footer copy). They must not be read as counsel-approved or jurisdiction-complete.
- Account deletion **requests** are operational tickets; they are **not** a promise of GDPR/CPRA compliance or instant erasure.
- Support/abuse inboxes are **only** shown when `NEXT_PUBLIC_SUPPORT_CONTACT_EMAIL` / `NEXT_PUBLIC_ABUSE_CONTACT_EMAIL` are set; otherwise the UI states they are **not configured**.

## Org / legal blockers for a public marketing launch (typical)

- Counsel-reviewed **Terms** and **Privacy** aligned to actual data flows, retention, subprocessors (e.g. Supabase), and regions you serve.
- Real **support** and **abuse** channels (email or ticketing) and an internal **SLA** expectation.
- **Data processing agreements** and subprocessors list as required by your counsel.
- **Insurance / content policy** decisions if you allow UGC at scale.

## What engineering can defer post-launch (if product allows)

- Automated data export, self-serve instant deletion, full ticketing integration — as long as the public story matches reality (manual queue is OK if disclosed).
