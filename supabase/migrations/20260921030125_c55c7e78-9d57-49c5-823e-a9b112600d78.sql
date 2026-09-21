ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS delivery_fee_mode text NOT NULL DEFAULT 'PER_KM',
  ADD COLUMN IF NOT EXISTS delivery_fee_slabs jsonb NOT NULL DEFAULT '[{"upto_km":1.5,"fee":15},{"upto_km":3,"fee":18},{"upto_km":4,"fee":22},{"upto_km":5,"fee":25},{"upto_km":15,"fee":85}]'::jsonb;

ALTER TABLE public.system_settings
  DROP CONSTRAINT IF EXISTS system_settings_delivery_fee_mode_check;
ALTER TABLE public.system_settings
  ADD CONSTRAINT system_settings_delivery_fee_mode_check
  CHECK (delivery_fee_mode IN ('FIXED','PER_KM','SLAB'));

CREATE OR REPLACE FUNCTION public.validate_delivery_fee_slabs()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  slab jsonb;
  previous_km numeric := 0;
BEGIN
  IF NEW.delivery_fee_mode = 'SLAB' THEN
    IF jsonb_typeof(NEW.delivery_fee_slabs) <> 'array' OR jsonb_array_length(NEW.delivery_fee_slabs) = 0 THEN
      RAISE EXCEPTION 'At least one delivery distance slab is required';
    END IF;
    FOR slab IN SELECT value FROM jsonb_array_elements(NEW.delivery_fee_slabs)
    LOOP
      IF NOT (slab ? 'upto_km' AND slab ? 'fee')
         OR (slab->>'upto_km')::numeric <= previous_km
         OR (slab->>'fee')::numeric < 0 THEN
        RAISE EXCEPTION 'Delivery slabs must use increasing distances and non-negative fees';
      END IF;
      previous_km := (slab->>'upto_km')::numeric;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_delivery_fee_slabs_trigger ON public.system_settings;
CREATE TRIGGER validate_delivery_fee_slabs_trigger
BEFORE INSERT OR UPDATE OF delivery_fee_mode, delivery_fee_slabs ON public.system_settings
FOR EACH ROW EXECUTE FUNCTION public.validate_delivery_fee_slabs();

REVOKE ALL ON FUNCTION public.validate_delivery_fee_slabs() FROM PUBLIC, anon, authenticated;

CREATE TABLE public.vendor_onboarding_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  gateway_order_id text NOT NULL UNIQUE,
  gateway_reference text UNIQUE,
  amount numeric(10,2) NOT NULL CHECK (amount IN (99,199)),
  has_fssai boolean NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','SUCCESS','FAILED')),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vendor_onboarding_payments TO authenticated;
GRANT ALL ON public.vendor_onboarding_payments TO service_role;
ALTER TABLE public.vendor_onboarding_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can view onboarding payments"
ON public.vendor_onboarding_payments FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX vendor_onboarding_payments_user_created_idx
ON public.vendor_onboarding_payments(user_id, created_at DESC);
CREATE TRIGGER vendor_onboarding_payments_updated_at
BEFORE UPDATE ON public.vendor_onboarding_payments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();