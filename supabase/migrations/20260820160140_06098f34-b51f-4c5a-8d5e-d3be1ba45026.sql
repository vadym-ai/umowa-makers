REVOKE ALL ON FUNCTION public.document_period_key(text, integer, integer, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.next_document_number(uuid, integer, integer, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.preview_document_number(uuid, integer, integer, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.next_contract_number(uuid, integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.preview_contract_number(uuid, integer, integer) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.document_period_key(text, integer, integer, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.next_document_number(uuid, integer, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.preview_document_number(uuid, integer, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_contract_number(uuid, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.preview_contract_number(uuid, integer, integer) TO authenticated;