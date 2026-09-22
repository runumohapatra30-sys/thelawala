CREATE OR REPLACE FUNCTION public.require_onboarding_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pay_id uuid;
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  SELECT id INTO pay_id
  FROM public.vendor_onboarding_payments
  WHERE user_id = NEW.owner_id
    AND status = 'SUCCESS'
    AND vendor_id IS NULL
  ORDER BY paid_at NULLS LAST, created_at
  LIMIT 1
  FOR UPDATE;

  IF pay_id IS NULL THEN
    RAISE EXCEPTION 'onboarding_fee_required';
  END IF;

  UPDATE public.vendor_onboarding_payments SET vendor_id = NEW.id WHERE id = pay_id;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.require_onboarding_payment() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS vendors_require_onboarding_payment ON public.vendors;
CREATE TRIGGER vendors_require_onboarding_payment
AFTER INSERT ON public.vendors
FOR EACH ROW EXECUTE FUNCTION public.require_onboarding_payment();