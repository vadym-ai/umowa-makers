CREATE OR REPLACE FUNCTION public.next_contract_number_for_user(_user_id uuid, _org_id uuid, _month integer, _year integer)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  r record;
  k text;
  c int;
BEGIN
  IF NOT app_private.is_org_member(_org_id, _user_id) THEN
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
$function$;

REVOKE ALL ON FUNCTION public.next_contract_number_for_user(uuid, uuid, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_contract_number_for_user(uuid, uuid, integer, integer) TO service_role;

DROP FUNCTION IF EXISTS app_private.next_contract_number_for_user(uuid, uuid, integer, integer);