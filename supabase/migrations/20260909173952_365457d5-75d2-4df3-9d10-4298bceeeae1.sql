CREATE TABLE public.cash_deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.delivery_partners(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  method text NOT NULL CHECK (method IN ('ONLINE_UPI','OFFLINE_HANDOVER')),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','VERIFIED','REJECTED')),
  transaction_ref text,
  proof_image_url text,
  verification_otp text,
  admin_note text,
  verified_by_admin uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz
);

GRANT SELECT, INSERT, UPDATE ON public.cash_deposits TO authenticated;
GRANT ALL ON public.cash_deposits TO service_role;

ALTER TABLE public.cash_deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners read own deposits" ON public.cash_deposits
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.delivery_partners d WHERE d.id = partner_id AND d.user_id = auth.uid())
       OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Partners create own deposits" ON public.cash_deposits
FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.delivery_partners d WHERE d.id = partner_id AND d.user_id = auth.uid())
            AND status = 'PENDING');

CREATE POLICY "Admins update deposits" ON public.cash_deposits
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER t_cash_deposits_upd BEFORE UPDATE ON public.cash_deposits
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_cash_deposits_partner ON public.cash_deposits (partner_id, created_at DESC);
CREATE INDEX idx_cash_deposits_status ON public.cash_deposits (status, created_at DESC);

-- Cash the partner still holds: delivered COD orders minus verified/pending deposits.
CREATE OR REPLACE FUNCTION public.rider_cash_in_hand(_partner_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT round(
    coalesce((SELECT sum(o.grand_total) FROM public.orders o
              WHERE o.partner_id = _partner_id AND o.status = 'DELIVERED'
                AND o.payment_mode = 'COD'), 0)
    - coalesce((SELECT sum(c.amount) FROM public.cash_deposits c
                WHERE c.partner_id = _partner_id AND c.status IN ('PENDING','VERIFIED')), 0)
  , 2)
$$;

CREATE OR REPLACE FUNCTION public.decide_cash_deposit(_deposit_id uuid, _approve boolean, _otp text DEFAULT NULL, _note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE d public.cash_deposits;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  SELECT * INTO d FROM public.cash_deposits WHERE id = _deposit_id FOR UPDATE;
  IF d.id IS NULL OR d.status <> 'PENDING' THEN RAISE EXCEPTION 'Deposit is not pending'; END IF;
  IF _approve THEN
    IF d.method = 'OFFLINE_HANDOVER' AND d.verification_otp IS DISTINCT FROM btrim(coalesce(_otp,'')) THEN
      RAISE EXCEPTION 'Wrong handover PIN';
    END IF;
    UPDATE public.cash_deposits
      SET status = 'VERIFIED', verified_by_admin = auth.uid(), verified_at = now(), admin_note = _note
      WHERE id = _deposit_id;
  ELSE
    UPDATE public.cash_deposits
      SET status = 'REJECTED', verified_by_admin = auth.uid(), verified_at = now(), admin_note = _note
      WHERE id = _deposit_id;
  END IF;
END; $$;

REVOKE ALL ON FUNCTION public.decide_cash_deposit(uuid, boolean, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.decide_cash_deposit(uuid, boolean, text, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.rider_cash_in_hand(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rider_cash_in_hand(uuid) TO authenticated, service_role;