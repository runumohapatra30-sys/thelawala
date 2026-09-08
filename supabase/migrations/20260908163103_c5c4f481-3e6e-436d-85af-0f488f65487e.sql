
REVOKE ALL ON FUNCTION public.wallet_debit(numeric, uuid, text) FROM public, anon;
REVOKE ALL ON FUNCTION public.request_refund(uuid, numeric, text, text, text, text, text) FROM public, anon;
REVOKE ALL ON FUNCTION public.decide_refund(uuid, boolean, text) FROM public, anon;
REVOKE ALL ON FUNCTION public.request_wallet_closure() FROM public, anon;
REVOKE ALL ON FUNCTION public.decide_wallet_closure(uuid, boolean, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.wallet_debit(numeric, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_refund(uuid, numeric, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decide_refund(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_wallet_closure() TO authenticated;
GRANT EXECUTE ON FUNCTION public.decide_wallet_closure(uuid, boolean, text) TO authenticated;
