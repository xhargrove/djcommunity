-- Phase 13: machine execution state separate from human workflow `status`.
-- Human: pending | processing | completed | cancelled
-- Machine: idle | running | failed | succeeded

ALTER TABLE public.account_deletion_requests
  ADD COLUMN IF NOT EXISTS execution_status text NOT NULL DEFAULT 'idle'
    CONSTRAINT account_deletion_requests_execution_status_allowed CHECK (
      execution_status = ANY (
        ARRAY['idle', 'running', 'failed', 'succeeded']::text[]
      )
    );

ALTER TABLE public.account_deletion_requests
  ADD COLUMN IF NOT EXISTS last_error_code text,
  ADD COLUMN IF NOT EXISTS last_error_at timestamptz,
  ADD COLUMN IF NOT EXISTS execution_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS executed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_execution_stage text;

COMMENT ON COLUMN public.account_deletion_requests.execution_status IS
  'Operator script lifecycle: idle (no run / reset), running (in progress), failed (retryable), succeeded (machine finished).';

COMMENT ON COLUMN public.account_deletion_requests.last_error_code IS
  'Short machine-readable code from deletion script; no user content.';

COMMENT ON COLUMN public.account_deletion_requests.last_execution_stage IS
  'Last script stage: storage_post_media, storage_profile_assets, auth_delete, finalize, etc.';

-- Succeeded runs must record completion time (set by operator script on success).
ALTER TABLE public.account_deletion_requests
  ADD CONSTRAINT account_deletion_executed_at_when_succeeded CHECK (
    execution_status <> 'succeeded' OR executed_at IS NOT NULL
  );

-- Historical rows: status may be `completed` with execution_status `idle` (manual fulfillment before tracking).
