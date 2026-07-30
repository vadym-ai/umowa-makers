CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  nip text,
  representative text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY companies_select ON public.companies FOR SELECT TO authenticated USING (public.is_org_member(org_id, auth.uid()));
CREATE POLICY companies_insert ON public.companies FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id, auth.uid()));
CREATE POLICY companies_update ON public.companies FOR UPDATE TO authenticated USING (public.is_org_member(org_id, auth.uid())) WITH CHECK (public.is_org_member(org_id, auth.uid()));
CREATE POLICY companies_delete ON public.companies FOR DELETE TO authenticated USING (public.is_org_member(org_id, auth.uid()));

CREATE TABLE public.contractors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  address text,
  pesel text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractors TO authenticated;
GRANT ALL ON public.contractors TO service_role;
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;
CREATE POLICY contractors_select ON public.contractors FOR SELECT TO authenticated USING (public.is_org_member(org_id, auth.uid()));
CREATE POLICY contractors_insert ON public.contractors FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id, auth.uid()));
CREATE POLICY contractors_update ON public.contractors FOR UPDATE TO authenticated USING (public.is_org_member(org_id, auth.uid())) WITH CHECK (public.is_org_member(org_id, auth.uid()));
CREATE POLICY contractors_delete ON public.contractors FOR DELETE TO authenticated USING (public.is_org_member(org_id, auth.uid()));

CREATE TABLE public.numbering_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  prefix text NOT NULL DEFAULT 'W-',
  format text NOT NULL DEFAULT '{prefix}{NN}/{MM}/{YY}',
  reset_period text NOT NULL DEFAULT 'monthly' CHECK (reset_period IN ('monthly','yearly','never')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.numbering_rules TO authenticated;
GRANT ALL ON public.numbering_rules TO service_role;
ALTER TABLE public.numbering_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY numbering_select ON public.numbering_rules FOR SELECT TO authenticated USING (public.is_org_member(org_id, auth.uid()));
CREATE POLICY numbering_insert_admin ON public.numbering_rules FOR INSERT TO authenticated WITH CHECK (public.is_org_admin(org_id, auth.uid()));
CREATE POLICY numbering_update_admin ON public.numbering_rules FOR UPDATE TO authenticated USING (public.is_org_admin(org_id, auth.uid())) WITH CHECK (public.is_org_admin(org_id, auth.uid()));

INSERT INTO public.numbering_rules (org_id)
SELECT o.id FROM public.organizations o
WHERE NOT EXISTS (SELECT 1 FROM public.numbering_rules n WHERE n.org_id = o.id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_org_id uuid;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.organizations (name)
  VALUES (COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'org_name', ''), 'Moja organizacja'))
  RETURNING id INTO new_org_id;

  INSERT INTO public.organization_members (org_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'admin');

  INSERT INTO public.numbering_rules (org_id) VALUES (new_org_id);

  RETURN NEW;
END;
$function$;