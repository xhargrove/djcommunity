# Observability — next steps beyond structured logs

Structured logs (`src/lib/observability/server-log.ts`) are the baseline. This document describes **grounded** next steps to move from “we saw a JSON line” to “we can reason about production behavior.”

## 1. Host-native signals (Vercel)

- **Log drain:** Ship stdout to your vendor (Datadog, Axiom, Grafana Cloud, etc.). Filter on `source:"djcn"` and `category` from `logServerError`.
- **Speed Insights / Web Analytics:** Enable in the Vercel project for **client** Core Web Vitals and route popularity — complements server logs, not a substitute for error tracing.
- **Deployment markers:** Correlate release time with error spikes using your log tool’s time-series view.

## 2. Server action / handler latency (lightweight)

- **`reportServerActionDuration`** (`src/lib/observability/instrumentation.ts`) — optional JSON lines with `context:"server_action_timing"`. Enable with `DJCN_LOG_SERVER_ACTION_TIMING=true` or log slow paths only via `DJCN_SLOW_ACTION_MS` (default 2000).
- **Usage:** Wrap critical server actions at the end of the handler: `reportServerActionDuration("posts.create", startedAt)` — add incrementally; do not blanket-instrument every action without a sampling strategy.

## 3. Error spike detection (no APM required)

- Define alerts on **log count** of `level:"error"` and `source:"djcn"` exceeding a threshold per 5 minutes.
- Add a **separate** alert for sustained `5xx` from the host edge if your platform exposes HTTP status metrics (Vercel Observability / connected APM).

## 4. Deeper tracing (when justified)

- **OpenTelemetry** via `instrumentation.ts` (Next.js) + an OTLP exporter — viable when you need distributed traces across Supabase calls and app routes. This is heavier; adopt when log-based triage is no longer enough.
- **Third-party APM** (Sentry, Datadog APM) — use official Next.js SDKs; sample in production to control cost.

## 5. What we are not doing here

- No fake dashboards or stub “APM enabled” flags.
- No recording of user-generated content or PII in timing events — keep `name` strings stable and generic.
