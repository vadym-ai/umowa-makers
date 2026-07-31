-- Telegram links
CREATE TABLE public.telegram_links (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  chat_id bigint NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.telegram_links TO authenticated;
GRANT ALL ON public.telegram_links TO service_role;

ALTER TABLE public.telegram_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY telegram_links_select ON public.telegram_links
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY telegram_links_insert ON public.telegram_links
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY telegram_links_update ON public.telegram_links
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY telegram_links_delete ON public.telegram_links
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Link codes
CREATE TABLE public.telegram_link_codes (
  code text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.telegram_link_codes TO authenticated;
GRANT ALL ON public.telegram_link_codes TO service_role;

ALTER TABLE public.telegram_link_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY telegram_codes_select ON public.telegram_link_codes
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY telegram_codes_insert ON public.telegram_link_codes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY telegram_codes_delete ON public.telegram_link_codes
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Default company / contractor per org
ALTER TABLE public.companies ADD COLUMN is_default boolean NOT NULL DEFAULT false;
ALTER TABLE public.contractors ADD COLUMN is_default boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX companies_one_default_per_org
  ON public.companies (org_id) WHERE is_default;
CREATE UNIQUE INDEX contractors_one_default_per_org
  ON public.contractors (org_id) WHERE is_default;

-- Service-role numbering for a specific user (used by the Telegram bot)
CREATE OR REPLACE FUNCTION app_private.next_contract_number_for_user(
  _user_id uuid, _org_id uuid, _month integer, _year integer
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

REVOKE ALL ON FUNCTION app_private.next_contract_number_for_user(uuid, uuid, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.next_contract_number_for_user(uuid, uuid, integer, integer) TO service_role;
GRANT USAGE ON SCHEMA app_private TO service_role;