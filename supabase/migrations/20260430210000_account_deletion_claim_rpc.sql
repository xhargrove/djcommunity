-- Phase 14: single-row atomic claim for operator deletion script (avoids read-then-update races).
-- Callable only with service_role — not exposed to browser clients using the anon key.

CREATE OR REPLACE FUNCTION public.claim_account_deletion_execution(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows integer;
  v_attempts integer;
BEGIN
  UPDATE public.account_deletion_requests
  SET
    execution_status = 'running',
    execution_attempts = execution_attempts + 1,
    last_error_code = NULL,
    last_error_at = NULL,
    last_execution_stage = 'claim'
  WHERE id = p_request_id
    AND execution_status IN ('idle', 'failed')
    AND status IN ('pending', 'processing')
    AND user_id IS NOT NULL;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 0 THEN
    RETURN jsonb_build_object(
      'claimed', false,
      'reason', 'no_match'
    );
  END IF;

  SELECT execution_attempts INTO v_attempts
  FROM public.account_deletion_requests
  WHERE id = p_request_id;

  RETURN jsonb_build_object(
    'claimed', true,
    'attempts', v_attempts
  );
END;
$$;

COMMENT ON FUNCTION public.claim_account_deletion_execution(uuid) IS
  'Atomically claims a deletion ticket for script execution. Service role only.';

REVOKE ALL ON FUNCTION public.claim_account_deletion_execution(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_account_deletion_execution(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.claim_account_deletion_execution(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_account_deletion_execution(uuid) TO service_role;
