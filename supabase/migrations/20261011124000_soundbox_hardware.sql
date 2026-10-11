CREATE TABLE public.soundbox_product_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  front_image_url text,
  back_image_url text,
  packaging_image_url text,
  is_in_stock boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.soundbox_product_settings (id) VALUES (true);

GRANT SELECT ON public.soundbox_product_settings TO authenticated;
GRANT INSERT, UPDATE ON public.soundbox_product_settings TO authenticated;
GRANT ALL ON public.soundbox_product_settings TO service_role;

ALTER TABLE public.soundbox_product_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read Soundbox product"
  ON public.soundbox_product_settings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins manage Soundbox product"
  ON public.soundbox_product_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_soundbox_product_settings_updated_at
  BEFORE UPDATE ON public.soundbox_product_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.soundbox_hardware_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_plan text NOT NULL CHECK (payment_plan IN ('ONE_TIME', 'SPLIT_PAY')),
  total_amount numeric NOT NULL CHECK (
    (payment_plan = 'ONE_TIME' AND total_amount = 499)
    OR (payment_plan = 'SPLIT_PAY' AND total_amount = 490)
  ),
  delivery_address text NOT NULL CHECK (length(trim(delivery_address)) > 0),
  status text NOT NULL DEFAULT 'REQUESTED'
    CHECK (status IN ('REQUESTED', 'CONFIRMED', 'DISPATCHED', 'DELIVERED', 'CANCELLED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.soundbox_hardware_orders TO authenticated;
GRANT UPDATE ON public.soundbox_hardware_orders TO authenticated;
GRANT ALL ON public.soundbox_hardware_orders TO service_role;

ALTER TABLE public.soundbox_hardware_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors and admins read Soundbox orders"
  ON public.soundbox_hardware_orders FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Approved vendors request an in-stock Soundbox"
  ON public.soundbox_hardware_orders FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND status = 'REQUESTED'
    AND EXISTS (
      SELECT 1
      FROM public.vendors v
      WHERE v.id = vendor_id
        AND v.owner_id = auth.uid()
        AND v.status = 'APPROVED'
    )
    AND EXISTS (
      SELECT 1
      FROM public.soundbox_product_settings s
      WHERE s.id = true
        AND s.is_in_stock
    )
  );

CREATE POLICY "Admins manage Soundbox orders"
  ON public.soundbox_hardware_orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_soundbox_hardware_orders_updated_at
  BEFORE UPDATE ON public.soundbox_hardware_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.soundbox_product_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.soundbox_hardware_orders;

NOTIFY pgrst, 'reload schema';
