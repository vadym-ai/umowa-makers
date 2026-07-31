-- 1. Helpers
CREATE OR REPLACE FUNCTION app_private.org_role(_org_id uuid, _user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.organization_members WHERE org_id = _org_id AND user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION app_private.is_org_admin(_org_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE org_id = _org_id AND user_id = _user_id AND role IN ('admin','owner')
  )
$$;

CREATE OR REPLACE FUNCTION app_private.is_org_owner(_org_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE org_id = _org_id AND user_id = _user_id AND role = 'owner'
  )
$$;

REVOKE ALL ON FUNCTION app_private.org_role(uuid,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.is_org_owner(uuid,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.is_org_admin(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.org_role(uuid,uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.is_org_owner(uuid,uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.is_org_admin(uuid,uuid) TO authenticated, service_role;

-- 2. Role check + backfill
ALTER TABLE public.organization_members DROP CONSTRAINT IF EXISTS organization_members_role_check;

WITH first_admin AS (
  SELECT DISTINCT ON (org_id) org_id, user_id
  FROM public.organization_members
  WHERE role = 'admin'
  ORDER BY org_id, created_at ASC, user_id
)
UPDATE public.organization_members m
SET role = 'owner'
FROM first_admin f
WHERE m.org_id = f.org_id AND m.user_id = f.user_id;

UPDATE public.organization_members SET role = 'standard'
WHERE role NOT IN ('owner','admin','standard');

ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_role_check CHECK (role IN ('owner','admin','standard'));

-- 3. Signup trigger creates owner
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  VALUES (new_org_id, NEW.id, 'owner');

  INSERT INTO public.numbering_rules (org_id) VALUES (new_org_id);

  RETURN NEW;
END;
$$;

-- 4. Policies
DROP POLICY IF EXISTS contracts_select ON public.contracts;
DROP POLICY IF EXISTS contracts_insert ON public.contracts;
DROP POLICY IF EXISTS contracts_update ON public.contracts;
DROP POLICY IF EXISTS contracts_delete ON public.contracts;

CREATE POLICY contracts_select ON public.contracts FOR SELECT TO authenticated
  USING (app_private.is_org_member(org_id, auth.uid())
         AND (app_private.is_org_admin(org_id, auth.uid()) OR created_by = auth.uid()));
CREATE POLICY contracts_insert ON public.contracts FOR INSERT TO authenticated
  WITH CHECK (app_private.is_org_member(org_id, auth.uid()) AND created_by = auth.uid());
CREATE POLICY contracts_update ON public.contracts FOR UPDATE TO authenticated
  USING (app_private.is_org_member(org_id, auth.uid())
         AND (app_private.is_org_admin(org_id, auth.uid()) OR created_by = auth.uid()))
  WITH CHECK (app_private.is_org_member(org_id, auth.uid())
         AND (app_private.is_org_admin(org_id, auth.uid()) OR created_by = auth.uid()));
CREATE POLICY contracts_delete ON public.contracts FOR DELETE TO authenticated
  USING (app_private.is_org_owner(org_id, auth.uid()));
GRANT DELETE ON public.contracts TO authenticated;

DROP POLICY IF EXISTS companies_delete ON public.companies;
CREATE POLICY companies_delete ON public.companies FOR DELETE TO authenticated
  USING (app_private.is_org_admin(org_id, auth.uid()));
DROP POLICY IF EXISTS contractors_delete ON public.contractors;
CREATE POLICY contractors_delete ON public.contractors FOR DELETE TO authenticated
  USING (app_private.is_org_admin(org_id, auth.uid()));

DROP POLICY IF EXISTS members_insert_admin ON public.organization_members;
DROP POLICY IF EXISTS members_update_admin ON public.organization_members;
DROP POLICY IF EXISTS members_delete_admin ON public.organization_members;
CREATE POLICY members_insert_owner ON public.organization_members FOR INSERT TO authenticated
  WITH CHECK (app_private.is_org_owner(org_id, auth.uid()) AND user_id <> auth.uid());
CREATE POLICY members_update_owner ON public.organization_members FOR UPDATE TO authenticated
  USING (app_private.is_org_owner(org_id, auth.uid()) AND user_id <> auth.uid())
  WITH CHECK (app_private.is_org_owner(org_id, auth.uid()) AND user_id <> auth.uid());
CREATE POLICY members_delete_owner ON public.organization_members FOR DELETE TO authenticated
  USING (app_private.is_org_owner(org_id, auth.uid()) AND user_id <> auth.uid());

DROP POLICY IF EXISTS orgs_update_admin ON public.organizations;
DROP POLICY IF EXISTS orgs_delete_admin ON public.organizations;
CREATE POLICY orgs_update_owner ON public.organizations FOR UPDATE TO authenticated
  USING (app_private.is_org_owner(id, auth.uid()))
  WITH CHECK (app_private.is_org_owner(id, auth.uid()));
CREATE POLICY orgs_delete_owner ON public.organizations FOR DELETE TO authenticated
  USING (app_private.is_org_owner(id, auth.uid()));