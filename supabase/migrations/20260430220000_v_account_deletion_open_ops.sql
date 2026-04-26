-- Phase 15: lightweight operator visibility — one read model for "needs attention" deletion tickets.
-- Not exposed to anon/authenticated API clients; service_role / dashboard SQL only.

CREATE OR REPLACE VIEW public.v_account_deletion_open_ops
WITH (security_invoker = true) AS
SELECT
  adr.*,
  CASE
    WHEN adr.execution_status = 'failed'
         AND adr.last_error_code = 'FINALIZE' THEN 'finalize_reconcile_candidate'
    WHEN adr.execution_status = 'failed' THEN 'failed_execution'
    WHEN adr.execution_status = 'running'
         AND adr.updated_at < now() - interval '1 hour' THEN 'stuck_running'
    WHEN adr.status = 'pending'
         AND adr.created_at < now() - interval '14 days' THEN 'old_pending'
    WHEN adr.status = 'processing'
         AND adr.execution_status = 'idle'
         AND adr.updated_at < now() - interval '7 days' THEN 'processing_idle_stale'
  END::text AS ops_category,
  CASE
    WHEN adr.execution_status = 'failed'
         AND adr.last_error_code = 'FINALIZE' THEN 'action_required'
    WHEN adr.execution_status = 'failed' THEN 'action_required'
    WHEN adr.execution_status = 'running'
         AND adr.updated_at < now() - interval '1 hour' THEN 'warning'
    WHEN adr.status = 'pending'
         AND adr.created_at < now() - interval '14 days' THEN 'warning'
    WHEN adr.status = 'processing'
         AND adr.execution_status = 'idle'
         AND adr.updated_at < now() - interval '7 days' THEN 'informational'
  END::text AS ops_severity
FROM public.account_deletion_requests adr
WHERE adr.status <> 'cancelled'
  AND adr.status <> 'completed'
  AND (
    (adr.execution_status = 'failed' AND adr.status IN ('pending', 'processing'))
    OR (
      adr.execution_status = 'running'
      AND adr.updated_at < now() - interval '1 hour'
    )
    OR (
      adr.status = 'pending'
      AND adr.created_at < now() - interval '14 days'
    )
    OR (
      adr.status = 'processing'
      AND adr.execution_status = 'idle'
      AND adr.updated_at < now() - interval '7 days'
    )
  );

COMMENT ON VIEW public.v_account_deletion_open_ops IS
  'Open account-deletion work needing review: failures, stuck runs, stale pending, idle processing. Use from SQL editor or service_role; see docs/ACCOUNT_DELETION_ROUTINE_REVIEW.md.';

REVOKE ALL ON public.v_account_deletion_open_ops FROM PUBLIC;
REVOKE ALL ON public.v_account_deletion_open_ops FROM anon;
REVOKE ALL ON public.v_account_deletion_open_ops FROM authenticated;
GRANT SELECT ON public.v_account_deletion_open_ops TO service_role;
