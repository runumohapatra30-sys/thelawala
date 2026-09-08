
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'runumohapatra30@gmail.com'
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.wallet_credit(_user_id uuid, _amount numeric, _source text, _order_id uuid DEFAULT NULL, _note text DEFAULT NULL, _ref text DEFAULT NULL)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_bal numeric;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
  INSERT INTO public.wallets (user_id) VALUES (_user_id) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.wallets SET balance = balance + _amount, updated_at = now()
    WHERE user_id = _user_id RETURNING balance INTO v_bal;
  INSERT INTO public.wallet_transactions (user_id, amount, transaction_type, source, order_id, note, gateway_reference_id)
    VALUES (_user_id, _amount, 'CREDIT', _source, _order_id, _note, _ref);
  RETURN v_bal;
END; $$;

CREATE OR REPLACE FUNCTION public.wallet_debit(_amount numeric, _order_id uuid DEFAULT NULL, _note text DEFAULT NULL)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_bal numeric; v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
  UPDATE public.wallets SET balance = balance - _amount, updated_at = now()
    WHERE user_id = v_user AND status = 'ACTIVE' AND balance >= _amount
    RETURNING balance INTO v_bal;
  IF v_bal IS NULL THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;
  INSERT INTO public.wallet_transactions (user_id, amount, transaction_type, source, order_id, note)
    VALUES (v_user, _amount, 'DEBIT', 'ORDER', _order_id, _note);
  RETURN v_bal;
END; $$;

CREATE OR REPLACE FUNCTION public.request_refund(_order_id uuid, _amount numeric, _reason text, _method text DEFAULT 'WALLET', _bank_account_no text DEFAULT NULL, _bank_ifsc text DEFAULT NULL, _bank_holder text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid(); v_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.orders WHERE id = _order_id AND user_id = v_user) THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  INSERT INTO public.refund_requests (user_id, order_id, amount, reason, method, bank_account_no, bank_ifsc, bank_holder, status)
    VALUES (v_user, _order_id, _amount, _reason, _method, _bank_account_no, _bank_ifsc, _bank_holder, 'PENDING')
    RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.decide_refund(_request_id uuid, _approve boolean, _admin_note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.refund_requests;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  SELECT * INTO r FROM public.refund_requests WHERE id = _request_id FOR UPDATE;
  IF r.id IS NULL OR r.status <> 'PENDING' THEN RAISE EXCEPTION 'Request not pending'; END IF;
  IF _approve THEN
    IF r.method = 'WALLET' THEN
      PERFORM public.wallet_credit(r.user_id, r.amount, 'REFUND', r.order_id, 'Order refund');
    END IF;
    UPDATE public.refund_requests SET status = 'APPROVED', admin_note = _admin_note, updated_at = now() WHERE id = _request_id;
  ELSE
    UPDATE public.refund_requests SET status = 'REJECTED', admin_note = _admin_note, updated_at = now() WHERE id = _request_id;
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.request_wallet_closure()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid(); v_bal numeric; v_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT balance INTO v_bal FROM public.wallets WHERE user_id = v_user;
  IF COALESCE(v_bal,0) <= 0 THEN RAISE EXCEPTION 'Wallet is already empty'; END IF;
  INSERT INTO public.wallet_closure_requests (user_id, amount, status) VALUES (v_user, v_bal, 'PENDING') RETURNING id INTO v_id;
  UPDATE public.wallets SET status = 'CLOSURE_REQUESTED', updated_at = now() WHERE user_id = v_user;
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.decide_wallet_closure(_request_id uuid, _approve boolean, _refund_ref text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.wallet_closure_requests;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  SELECT * INTO r FROM public.wallet_closure_requests WHERE id = _request_id FOR UPDATE;
  IF r.id IS NULL OR r.status <> 'PENDING' THEN RAISE EXCEPTION 'Request not pending'; END IF;
  IF _approve THEN
    UPDATE public.wallets SET balance = 0, status = 'CLOSED', updated_at = now() WHERE user_id = r.user_id;
    INSERT INTO public.wallet_transactions (user_id, amount, transaction_type, source, note, gateway_reference_id)
      VALUES (r.user_id, r.amount, 'DEBIT', 'CLOSURE', 'Wallet closed and balance returned', _refund_ref);
    UPDATE public.wallet_closure_requests SET status = 'APPROVED', gateway_refund_id = _refund_ref, processed_at = now() WHERE id = _request_id;
  ELSE
    UPDATE public.wallets SET status = 'ACTIVE', updated_at = now() WHERE user_id = r.user_id;
    UPDATE public.wallet_closure_requests SET status = 'REJECTED', processed_at = now() WHERE id = _request_id;
  END IF;
END; $$;

REVOKE ALL ON FUNCTION public.wallet_credit(uuid, numeric, text, uuid, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_debit(numeric, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_refund(uuid, numeric, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decide_refund(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_wallet_closure() TO authenticated;
GRANT EXECUTE ON FUNCTION public.decide_wallet_closure(uuid, boolean, text) TO authenticated;
