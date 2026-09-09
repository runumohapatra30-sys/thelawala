ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Admins manage profiles" ON public.profiles;
CREATE POLICY "Admins manage profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins read profiles" ON public.profiles;
CREATE POLICY "Admins read profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_type text NOT NULL CHECK (party_type IN ('VENDOR','PARTNER')),
  vendor_id uuid REFERENCES public.vendors(id),
  partner_id uuid REFERENCES public.delivery_partners(id),
  requested_by uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  method text NOT NULL DEFAULT 'BANK' CHECK (method IN ('BANK','UPI')),
  bank_holder text,
  bank_account_no text,
  bank_ifsc text,
  upi_id text,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  admin_note text,
  payment_reference text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  processed_at timestamp with time zone
);

GRANT SELECT, INSERT ON public.payout_requests TO authenticated;
GRANT ALL ON public.payout_requests TO service_role;

ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read their payouts" ON public.payout_requests
  FOR SELECT TO authenticated
  USING (
    requested_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR vendor_id IN (SELECT id FROM public.vendors WHERE owner_id = auth.uid())
    OR partner_id IN (SELECT id FROM public.delivery_partners WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins update payouts" ON public.payout_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER t_payout_requests_upd BEFORE UPDATE ON public.payout_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.vendor_balance(_vendor_id uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce((SELECT sum(amount) FROM public.payout_ledgers WHERE party_type='VENDOR' AND vendor_id=_vendor_id),0)
       - coalesce((SELECT sum(amount) FROM public.payout_requests WHERE party_type='VENDOR' AND vendor_id=_vendor_id AND status IN ('PENDING','APPROVED')),0)
$$;

CREATE OR REPLACE FUNCTION public.partner_balance(_partner_id uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce((SELECT sum(amount) FROM public.payout_ledgers WHERE party_type='PARTNER' AND partner_id=_partner_id),0)
       - coalesce((SELECT sum(amount) FROM public.payout_requests WHERE party_type='PARTNER' AND partner_id=_partner_id AND status IN ('PENDING','APPROVED')),0)
$$;

CREATE OR REPLACE FUNCTION public.request_payout(
  _party_type text, _amount numeric, _method text DEFAULT 'BANK',
  _bank_holder text DEFAULT NULL, _bank_account_no text DEFAULT NULL,
  _bank_ifsc text DEFAULT NULL, _upi_id text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid(); v_vendor uuid; v_partner uuid; v_bal numeric; v_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
  IF _party_type = 'VENDOR' THEN
    SELECT id INTO v_vendor FROM public.vendors WHERE owner_id = v_user LIMIT 1;
    IF v_vendor IS NULL THEN RAISE EXCEPTION 'No stall found for this account'; END IF;
    v_bal := public.vendor_balance(v_vendor);
  ELSIF _party_type = 'PARTNER' THEN
    SELECT id INTO v_partner FROM public.delivery_partners WHERE user_id = v_user LIMIT 1;
    IF v_partner IS NULL THEN RAISE EXCEPTION 'No delivery partner found for this account'; END IF;
    v_bal := public.partner_balance(v_partner);
  ELSE RAISE EXCEPTION 'Invalid party type'; END IF;

  IF _amount > v_bal THEN RAISE EXCEPTION 'Amount is more than the available balance'; END IF;

  INSERT INTO public.payout_requests (party_type, vendor_id, partner_id, requested_by, amount, method, bank_holder, bank_account_no, bank_ifsc, upi_id)
  VALUES (_party_type, v_vendor, v_partner, v_user, _amount, _method, _bank_holder, _bank_account_no, _bank_ifsc, _upi_id)
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.decide_payout(_request_id uuid, _approve boolean, _reference text DEFAULT NULL, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.payout_requests;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  SELECT * INTO r FROM public.payout_requests WHERE id = _request_id FOR UPDATE;
  IF r.id IS NULL OR r.status <> 'PENDING' THEN RAISE EXCEPTION 'Request not pending'; END IF;
  UPDATE public.payout_requests
     SET status = CASE WHEN _approve THEN 'APPROVED' ELSE 'REJECTED' END,
         payment_reference = _reference, admin_note = _note, processed_at = now()
   WHERE id = _request_id;
END; $$;

REVOKE ALL ON FUNCTION public.vendor_balance(uuid) FROM public;
REVOKE ALL ON FUNCTION public.partner_balance(uuid) FROM public;
REVOKE ALL ON FUNCTION public.request_payout(text,numeric,text,text,text,text,text) FROM public;
REVOKE ALL ON FUNCTION public.decide_payout(uuid,boolean,text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.vendor_balance(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.partner_balance(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_payout(text,numeric,text,text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decide_payout(uuid,boolean,text,text) TO authenticated;