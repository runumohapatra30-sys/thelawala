CREATE TABLE IF NOT EXISTS public.payment_credentials (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  provider text NOT NULL DEFAULT 'PAYU',
  payu_key text,
  payu_salt text,
  is_live boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.payment_credentials TO authenticated;
GRANT ALL ON public.payment_credentials TO service_role;

ALTER TABLE public.payment_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage payment credentials" ON public.payment_credentials;
CREATE POLICY "Admins manage payment credentials" ON public.payment_credentials
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.payment_credentials (id) VALUES (true) ON CONFLICT (id) DO NOTHING;