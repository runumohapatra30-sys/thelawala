REVOKE EXECUTE ON FUNCTION public.vendor_balance(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.partner_balance(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.request_payout(text,numeric,text,text,text,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.decide_payout(uuid,boolean,text,text) FROM anon;