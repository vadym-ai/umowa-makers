ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_status_check;
ALTER TABLE public.contracts ADD CONSTRAINT contracts_status_check CHECK (status IN ('confirmed','archived'));

DROP POLICY IF EXISTS contracts_delete ON public.contracts;
CREATE POLICY contracts_delete ON public.contracts FOR DELETE TO authenticated
USING (app_private.is_org_admin(org_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.set_contract_counter(_org_id uuid, _period_key text, _value integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT app_private.is_org_owner(_org_id, auth.uid()) THEN
    RAISE EXCEPTION 'only organization owner can change counters';
  END IF;
  IF _value < 0 THEN
    RAISE EXCEPTION 'counter must be >= 0';
  END IF;

  INSERT INTO public.contract_counters (org_id, period_key, counter)
  VALUES (_org_id, _period_key, _value)
  ON CONFLICT (org_id, period_key)
  DO UPDATE SET counter = EXCLUDED.counter, updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.set_contract_counter(uuid, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_contract_counter(uuid, text, integer) TO authenticated, service_role;