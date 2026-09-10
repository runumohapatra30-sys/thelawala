CREATE TABLE IF NOT EXISTS public.settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_type text NOT NULL CHECK (party_type IN ('VENDOR','PARTNER')),
  vendor_id uuid REFERENCES public.vendors(id),
  partner_id uuid REFERENCES public.delivery_partners(id),
  amount numeric NOT NULL CHECK (amount > 0),
  period_from date,
  period_to date,
  reference text,
  note text,
  created_by uuid REFERENCES auth.users(id),
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.settlements TO authenticated;
GRANT ALL ON public.settlements TO service_role;

ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage settlements" ON public.settlements
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Stall owners read own settlements" ON public.settlements
  FOR SELECT TO authenticated
  USING (vendor_id IN (SELECT id FROM public.vendors WHERE owner_id = auth.uid()));

CREATE POLICY "Riders read own settlements" ON public.settlements
  FOR SELECT TO authenticated
  USING (partner_id IN (SELECT id FROM public.delivery_partners WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS settlements_vendor_idx ON public.settlements(vendor_id, paid_at DESC);
CREATE INDEX IF NOT EXISTS settlements_partner_idx ON public.settlements(partner_id, paid_at DESC);

CREATE TRIGGER t_settlements_upd BEFORE UPDATE ON public.settlements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.refund_requests
  ADD COLUMN IF NOT EXISTS admin_response text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

CREATE OR REPLACE FUNCTION public.advance_refund(_request_id uuid, _status text, _response text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE r public.refund_requests;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  IF _status NOT IN ('REQUESTED','UNDER_REVIEW','IN_PROGRESS','APPROVED','REJECTED','COMPLETED','PENDING') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;
  SELECT * INTO r FROM public.refund_requests WHERE id = _request_id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF r.status = 'COMPLETED' THEN RAISE EXCEPTION 'Refund already completed'; END IF;

  IF _status = 'COMPLETED' AND r.method = 'WALLET' THEN
    PERFORM public.wallet_credit(r.user_id, r.amount, 'REFUND', r.order_id, 'Order refund');
  END IF;

  UPDATE public.refund_requests
     SET status = _status,
         admin_response = COALESCE(_response, admin_response),
         admin_note = COALESCE(_response, admin_note),
         reviewed_at = CASE WHEN reviewed_at IS NULL AND _status <> 'REQUESTED' THEN now() ELSE reviewed_at END,
         completed_at = CASE WHEN _status = 'COMPLETED' THEN now() ELSE completed_at END,
         updated_at = now()
   WHERE id = _request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.advance_refund(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.advance_refund(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.vendor_settled(_vendor_id uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT coalesce((SELECT sum(amount) FROM public.settlements WHERE party_type='VENDOR' AND vendor_id=_vendor_id),0)
$$;

CREATE OR REPLACE FUNCTION public.partner_settled(_partner_id uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT coalesce((SELECT sum(amount) FROM public.settlements WHERE party_type='PARTNER' AND partner_id=_partner_id),0)
$$;

REVOKE ALL ON FUNCTION public.vendor_settled(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.partner_settled(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vendor_settled(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.partner_settled(uuid) TO authenticated;