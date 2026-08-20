ALTER TABLE public.numbering_rules
  ADD COLUMN IF NOT EXISTS zgoda_prefix text NOT NULL DEFAULT 'Z-',
  ADD COLUMN IF NOT EXISTS zgoda_format text NOT NULL DEFAULT '{prefix}{NN}/{MM}/{YY}';

CREATE OR REPLACE FUNCTION public.document_period_key(_reset_period text, _month integer, _year integer, _doc_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN coalesce(_doc_type, 'umowa') IN ('umowa', 'umowa_o_dzielo')
      THEN public.contract_period_key(_reset_period, _month, _year)
    ELSE _doc_type || ':' || public.contract_period_key(_reset_period, _month, _year)
  END
$$;

CREATE OR REPLACE FUNCTION public.next_document_number(_org_id uuid, _month integer, _year integer, _doc_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r record;
  pfx text;
  fmt text;
  k text;
  c int;
BEGIN
  IF NOT app_private.is_org_member(_org_id, auth.uid()) THEN
    RAISE EXCEPTION 'not a member of this organization';
  END IF;

  SELECT prefix, format, reset_period, zgoda_prefix, zgoda_format INTO r
  FROM public.numbering_rules WHERE org_id = _org_id LIMIT 1;

  IF r IS NULL THEN
    r := ROW('', '{N}/{MM}/{YYYY}', 'monthly', 'Z-', '{prefix}{NN}/{MM}/{YY}');
  END IF;

  IF coalesce(_doc_type, 'umowa') = 'zgoda_materialy' THEN
    pfx := r.zgoda_prefix; fmt := r.zgoda_format;
  ELSE
    pfx := r.prefix; fmt := r.format;
  END IF;

  k := public.document_period_key(r.reset_period, _month, _year, _doc_type);

  INSERT INTO public.contract_counters (org_id, period_key, counter)
  VALUES (_org_id, k, 1)
  ON CONFLICT (org_id, period_key)
  DO UPDATE SET counter = public.contract_counters.counter + 1, updated_at = now()
  RETURNING counter INTO c;

  RETURN public.format_contract_number(fmt, pfx, c, _month, _year);
END;
$$;

CREATE OR REPLACE FUNCTION public.preview_document_number(_org_id uuid, _month integer, _year integer, _doc_type text)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r record;
  pfx text;
  fmt text;
  k text;
  c int;
BEGIN
  IF NOT app_private.is_org_member(_org_id, auth.uid()) THEN
    RAISE EXCEPTION 'not a member of this organization';
  END IF;

  SELECT prefix, format, reset_period, zgoda_prefix, zgoda_format INTO r
  FROM public.numbering_rules WHERE org_id = _org_id LIMIT 1;

  IF r IS NULL THEN
    r := ROW('', '{N}/{MM}/{YYYY}', 'monthly', 'Z-', '{prefix}{NN}/{MM}/{YY}');
  END IF;

  IF coalesce(_doc_type, 'umowa') = 'zgoda_materialy' THEN
    pfx := r.zgoda_prefix; fmt := r.zgoda_format;
  ELSE
    pfx := r.prefix; fmt := r.format;
  END IF;

  k := public.document_period_key(r.reset_period, _month, _year, _doc_type);

  SELECT coalesce(counter, 0) INTO c FROM public.contract_counters
  WHERE org_id = _org_id AND period_key = k;

  RETURN public.format_contract_number(fmt, pfx, coalesce(c, 0) + 1, _month, _year);
END;
$$;

CREATE OR REPLACE FUNCTION public.next_contract_number(_org_id uuid, _month integer, _year integer)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.next_document_number(_org_id, _month, _year, 'umowa')
$$;

CREATE OR REPLACE FUNCTION public.preview_contract_number(_org_id uuid, _month integer, _year integer)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.preview_document_number(_org_id, _month, _year, 'umowa')
$$;

GRANT EXECUTE ON FUNCTION public.document_period_key(text, integer, integer, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.next_document_number(uuid, integer, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.preview_document_number(uuid, integer, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_contract_number(uuid, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.preview_contract_number(uuid, integer, integer) TO authenticated;