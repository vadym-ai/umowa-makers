CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.organization_members (
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin','standard')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_org_member(_org_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members m WHERE m.org_id = _org_id AND m.user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(_org_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members m WHERE m.org_id = _org_id AND m.user_id = _user_id AND m.role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.shares_org_with(_other_user uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members a
    JOIN public.organization_members b ON a.org_id = b.org_id
    WHERE a.user_id = _user_id AND b.user_id = _other_user
  );
$$;

CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.shares_org_with(id, auth.uid()));
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "orgs_select_member" ON public.organizations FOR SELECT TO authenticated
  USING (public.is_org_member(id, auth.uid()));
CREATE POLICY "orgs_insert_auth" ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "orgs_update_admin" ON public.organizations FOR UPDATE TO authenticated
  USING (public.is_org_admin(id, auth.uid())) WITH CHECK (public.is_org_admin(id, auth.uid()));
CREATE POLICY "orgs_delete_admin" ON public.organizations FOR DELETE TO authenticated
  USING (public.is_org_admin(id, auth.uid()));

CREATE POLICY "members_select" ON public.organization_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_org_member(org_id, auth.uid()));
CREATE POLICY "members_insert_admin" ON public.organization_members FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(org_id, auth.uid()));
CREATE POLICY "members_update_admin" ON public.organization_members FOR UPDATE TO authenticated
  USING (public.is_org_admin(org_id, auth.uid())) WITH CHECK (public.is_org_admin(org_id, auth.uid()));
CREATE POLICY "members_delete_admin" ON public.organization_members FOR DELETE TO authenticated
  USING (public.is_org_admin(org_id, auth.uid()));

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
  VALUES (new_org_id, NEW.id, 'admin');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();