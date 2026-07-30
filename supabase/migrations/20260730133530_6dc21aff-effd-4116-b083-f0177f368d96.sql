GRANT EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.shares_org_with(uuid, uuid) TO authenticated;

DO $$
DECLARE
  p record;
  new_org_id uuid;
BEGIN
  FOR p IN
    SELECT pr.id FROM public.profiles pr
    WHERE NOT EXISTS (SELECT 1 FROM public.organization_members m WHERE m.user_id = pr.id)
  LOOP
    INSERT INTO public.organizations (name) VALUES ('Moja organizacja') RETURNING id INTO new_org_id;
    INSERT INTO public.organization_members (org_id, user_id, role) VALUES (new_org_id, p.id, 'admin');
    INSERT INTO public.numbering_rules (org_id) VALUES (new_org_id);
  END LOOP;
END;
$$;