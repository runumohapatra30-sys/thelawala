
REVOKE EXECUTE ON FUNCTION public.notify_order_status() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_referral_code() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_referral(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.wallet_credit(uuid, numeric, text, uuid, text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decide_refund(uuid, boolean, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.decide_wallet_closure(uuid, boolean, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.request_refund(uuid, numeric, text, text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.request_wallet_closure() FROM anon;
REVOKE EXECUTE ON FUNCTION public.wallet_debit(numeric, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.complete_delivery(uuid, text) FROM anon;
