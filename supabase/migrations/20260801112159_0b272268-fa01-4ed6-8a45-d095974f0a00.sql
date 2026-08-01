CREATE TABLE public.telegram_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  original_filename text NOT NULL,
  mime text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.telegram_outbox TO authenticated;
GRANT ALL ON public.telegram_outbox TO service_role;

ALTER TABLE public.telegram_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY telegram_outbox_select_own ON public.telegram_outbox
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE INDEX idx_telegram_outbox_user ON public.telegram_outbox (user_id, created_at);