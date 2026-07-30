CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA app_private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION app_private.is_org_member(_org_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members m WHERE m.org_id = _org_id AND m.user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION app_private.is_org_admin(_org_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members m WHERE m.org_id = _org_id AND m.user_id = _user_id AND m.role = 'admin');
$$;

CREATE OR REPLACE FUNCTION app_private.shares_org_with(_other_user uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members a
    JOIN public.organization_members b ON a.org_id = b.org_id
    WHERE a.user_id = _user_id AND b.user_id = _other_user
  );
$$;

REVOKE ALL ON FUNCTION app_private.is_org_member(uuid,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.is_org_admin(uuid,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.shares_org_with(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.is_org_member(uuid,uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.is_org_admin(uuid,uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.shares_org_with(uuid,uuid) TO authenticated, service_role;

-- companies
DROP POLICY IF EXISTS companies_select ON public.companies;
DROP POLICY IF EXISTS companies_insert ON public.companies;
DROP POLICY IF EXISTS companies_update ON public.companies;
DROP POLICY IF EXISTS companies_delete ON public.companies;
CREATE POLICY companies_select ON public.companies FOR SELECT TO authenticated USING (app_private.is_org_member(org_id, auth.uid()));
CREATE POLICY companies_insert ON public.companies FOR INSERT TO authenticated WITH CHECK (app_private.is_org_member(org_id, auth.uid()));
CREATE POLICY companies_update ON public.companies FOR UPDATE TO authenticated USING (app_private.is_org_member(org_id, auth.uid())) WITH CHECK (app_private.is_org_member(org_id, auth.uid()));
CREATE POLICY companies_delete ON public.companies FOR DELETE TO authenticated USING (app_private.is_org_member(org_id, auth.uid()));

-- contractors
DROP POLICY IF EXISTS contractors_select ON public.contractors;
DROP POLICY IF EXISTS contractors_insert ON public.contractors;
DROP POLICY IF EXISTS contractors_update ON public.contractors;
DROP POLICY IF EXISTS contractors_delete ON public.contractors;
CREATE POLICY contractors_select ON public.contractors FOR SELECT TO authenticated USING (app_private.is_org_member(org_id, auth.uid()));
CREATE POLICY contractors_insert ON public.contractors FOR INSERT TO authenticated WITH CHECK (app_private.is_org_member(org_id, auth.uid()));
CREATE POLICY contractors_update ON public.contractors FOR UPDATE TO authenticated USING (app_private.is_org_member(org_id, auth.uid())) WITH CHECK (app_private.is_org_member(org_id, auth.uid()));
CREATE POLICY contractors_delete ON public.contractors FOR DELETE TO authenticated USING (app_private.is_org_member(org_id, auth.uid()));

-- numbering_rules
DROP POLICY IF EXISTS numbering_select ON public.numbering_rules;
DROP POLICY IF EXISTS numbering_insert_admin ON public.numbering_rules;
DROP POLICY IF EXISTS numbering_update_admin ON public.numbering_rules;
CREATE POLICY numbering_select ON public.numbering_rules FOR SELECT TO authenticated USING (app_private.is_org_member(org_id, auth.uid()));
CREATE POLICY numbering_insert_admin ON public.numbering_rules FOR INSERT TO authenticated WITH CHECK (app_private.is_org_admin(org_id, auth.uid()));
CREATE POLICY numbering_update_admin ON public.numbering_rules FOR UPDATE TO authenticated USING (app_private.is_org_admin(org_id, auth.uid())) WITH CHECK (app_private.is_org_admin(org_id, auth.uid()));

-- organizations
DROP POLICY IF EXISTS orgs_select_member ON public.organizations;
DROP POLICY IF EXISTS orgs_update_admin ON public.organizations;
DROP POLICY IF EXISTS orgs_delete_admin ON public.organizations;
CREATE POLICY orgs_select_member ON public.organizations FOR SELECT TO authenticated USING (app_private.is_org_member(id, auth.uid()));
CREATE POLICY orgs_update_admin ON public.organizations FOR UPDATE TO authenticated USING (app_private.is_org_admin(id, auth.uid())) WITH CHECK (app_private.is_org_admin(id, auth.uid()));
CREATE POLICY orgs_delete_admin ON public.organizations FOR DELETE TO authenticated USING (app_private.is_org_admin(id, auth.uid()));

-- organization_members
DROP POLICY IF EXISTS members_select ON public.organization_members;
DROP POLICY IF EXISTS members_insert_admin ON public.organization_members;
DROP POLICY IF EXISTS members_update_admin ON public.organization_members;
DROP POLICY IF EXISTS members_delete_admin ON public.organization_members;
CREATE POLICY members_select ON public.organization_members FOR SELECT TO authenticated USING ((user_id = auth.uid()) OR app_private.is_org_member(org_id, auth.uid()));
CREATE POLICY members_insert_admin ON public.organization_members FOR INSERT TO authenticated WITH CHECK (app_private.is_org_admin(org_id, auth.uid()));
CREATE POLICY members_update_admin ON public.organization_members FOR UPDATE TO authenticated USING (app_private.is_org_admin(org_id, auth.uid())) WITH CHECK (app_private.is_org_admin(org_id, auth.uid()));
CREATE POLICY members_delete_admin ON public.organization_members FOR DELETE TO authenticated USING (app_private.is_org_admin(org_id, auth.uid()));

-- profiles
DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated USING ((id = auth.uid()) OR app_private.shares_org_with(id, auth.uid()));

DROP FUNCTION IF EXISTS public.is_org_member(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_org_admin(uuid, uuid);
DROP FUNCTION IF EXISTS public.shares_org_with(uuid, uuid);