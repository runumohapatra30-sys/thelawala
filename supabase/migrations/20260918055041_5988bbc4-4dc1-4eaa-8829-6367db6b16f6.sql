DROP POLICY IF EXISTS "orders read" ON public.orders;
CREATE POLICY "orders read" ON public.orders FOR SELECT
USING (
  (user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (EXISTS (SELECT 1 FROM vendors v WHERE v.id = orders.vendor_id AND v.owner_id = auth.uid()))
  OR (EXISTS (SELECT 1 FROM delivery_partners d WHERE d.user_id = auth.uid() AND (d.id = orders.partner_id OR d.id = orders.offered_to)))
  OR (
    orders.partner_id IS NULL
    AND orders.broadcast_at IS NOT NULL
    AND orders.status IN ('SEARCHING_RIDER','READY_FOR_PICKUP','ORDER_ACCEPTED')
    AND EXISTS (
      SELECT 1 FROM delivery_partners d
      WHERE d.user_id = auth.uid() AND d.status = 'APPROVED' AND d.is_online = true
    )
  )
);