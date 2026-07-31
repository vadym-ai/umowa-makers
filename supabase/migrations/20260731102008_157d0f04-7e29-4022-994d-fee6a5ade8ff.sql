CREATE TABLE public.contract_counters (
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  period_key text NOT NULL,
  counter integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, period_key)
);

GRANT SELECT ON public.contract_counters TO authenticated;
GRANT ALL ON public.contract_counters TO service_role;

ALTER TABLE public.contract_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "counters_select" ON public.contract_counters
FOR SELECT TO authenticated
USING (app_private.is_org_member(org_id, auth.uid()));

CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  contractor_id uuid REFERENCES public.contractors(id) ON DELETE SET NULL,
  contract_type text NOT NULL DEFAULT 'umowa_o_dzielo',
  number text NOT NULL,
  period_month integer,
  period_year integer,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.contracts TO authenticated;
GRANT ALL ON public.contracts TO service_role;

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contracts_select" ON public.contracts
FOR SELECT TO authenticated
USING (app_private.is_org_member(org_id, auth.uid()));

CREATE POLICY "contracts_insert" ON public.contracts
FOR INSERT TO authenticated
WITH CHECK (app_private.is_org_member(org_id, auth.uid()));

CREATE POLICY "contracts_update" ON public.contracts
FOR UPDATE TO authenticated
USING (app_private.is_org_member(org_id, auth.uid()))
WITH CHECK (app_private.is_org_member(org_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contract_counters_updated_at BEFORE UPDATE ON public.contract_counters
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.format_contract_number(_format text, _prefix text, _counter int, _month int, _year int)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT replace(
           replace(
             replace(
               replace(
                 replace(
                   replace(
                     replace(coalesce(_format, '{prefix}{NN}/{MM}/{YY}'), '{prefix}', coalesce(_prefix, '')),
                   '{NNN}', lpad(_counter::text, 3, '0')),
                 '{NN}', lpad(_counter::text, 2, '0')),
               '{N}', _counter::text),
             '{MM}', lpad(_month::text, 2, '0')),
           '{YYYY}', _year::text),
         '{YY}', right(_year::text, 2))
$$;

CREATE OR REPLACE FUNCTION public.contract_period_key(_reset_period text, _month int, _year int)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _reset_period = 'never' THEN 'global'
    WHEN _reset_period = 'yearly' THEN _year::text
    ELSE lpad(_month::text, 2, '0') || '/' || right(_year::text, 2)
  END
$$;

CREATE OR REPLACE FUNCTION public.next_contract_number(_org_id uuid, _month int, _year int)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  k text;
  c int;
BEGIN
  IF NOT app_private.is_org_member(_org_id, auth.uid()) THEN
    RAISE EXCEPTION 'not a member of this organization';
  END IF;

  SELECT prefix, format, reset_period INTO r
  FROM public.numbering_rules WHERE org_id = _org_id LIMIT 1;

  IF r IS NULL THEN
    r := ROW('W-', '{prefix}{NN}/{MM}/{YY}', 'monthly');
  END IF;

  k := public.contract_period_key(r.reset_period, _month, _year);

  INSERT INTO public.contract_counters (org_id, period_key, counter)
  VALUES (_org_id, k, 1)
  ON CONFLICT (org_id, period_key)
  DO UPDATE SET counter = public.contract_counters.counter + 1, updated_at = now()
  RETURNING counter INTO c;

  RETURN public.format_contract_number(r.format, r.prefix, c, _month, _year);
END;
$$;

CREATE OR REPLACE FUNCTION public.preview_contract_number(_org_id uuid, _month int, _year int)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  r record;
  k text;
  c int;
BEGIN
  IF NOT app_private.is_org_member(_org_id, auth.uid()) THEN
    RAISE EXCEPTION 'not a member of this organization';
  END IF;

  SELECT prefix, format, reset_period INTO r
  FROM public.numbering_rules WHERE org_id = _org_id LIMIT 1;

  IF r IS NULL THEN
    r := ROW('W-', '{prefix}{NN}/{MM}/{YY}', 'monthly');
  END IF;

  k := public.contract_period_key(r.reset_period, _month, _year);

  SELECT coalesce(counter, 0) INTO c FROM public.contract_counters
  WHERE org_id = _org_id AND period_key = k;

  RETURN public.format_contract_number(r.format, r.prefix, coalesce(c, 0) + 1, _month, _year);
END;
$$;

CREATE OR REPLACE FUNCTION public.import_local_counters(_org_id uuid, _counters jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  k text;
  v int;
BEGIN
  IF NOT app_private.is_org_member(_org_id, auth.uid()) THEN
    RAISE EXCEPTION 'not a member of this organization';
  END IF;

  FOR k, v IN SELECT key, (value#>>'{}')::int FROM jsonb_each(_counters) LOOP
    INSERT INTO public.contract_counters (org_id, period_key, counter)
    VALUES (_org_id, k, v)
    ON CONFLICT (org_id, period_key)
    DO UPDATE SET counter = GREATEST(public.contract_counters.counter, EXCLUDED.counter), updated_at = now();
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.next_contract_number(uuid, int, int) FROM public, anon;
REVOKE ALL ON FUNCTION public.preview_contract_number(uuid, int, int) FROM public, anon;
REVOKE ALL ON FUNCTION public.import_local_counters(uuid, jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.next_contract_number(uuid, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.preview_contract_number(uuid, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.import_local_counters(uuid, jsonb) TO authenticated;