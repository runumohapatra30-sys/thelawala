
REVOKE EXECUTE ON FUNCTION public.notify_order_status() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_referral_code() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.wallet_credit(uuid, numeric, text, uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_referral(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_referral(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.request_refund(uuid, numeric, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_refund(uuid, numeric, text, text, text, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.request_wallet_closure() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_wallet_closure() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.wallet_debit(numeric, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.wallet_debit(numeric, uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.complete_delivery(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_delivery(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.decide_refund(uuid, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decide_refund(uuid, boolean, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.decide_wallet_closure(uuid, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decide_wallet_closure(uuid, boolean, text) TO authenticated;
