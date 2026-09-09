CREATE OR REPLACE FUNCTION public.admin_daily_report(_from date, _to date)
RETURNS TABLE(day date, orders_count bigint, collected numeric, food_total numeric, vendor_payout numeric, rider_payout numeric, charges numeric, discounts numeric, profit numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE pct numeric;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  SELECT coalesce(vendor_commission_pct,0) INTO pct FROM public.system_settings WHERE id = true;
  RETURN QUERY
  SELECT o.created_at::date AS day,
         count(*)::bigint,
         round(sum(o.grand_total + coalesce(o.tip_amount,0)),2),
         round(sum(o.food_total),2),
         round(sum(o.food_total - o.food_total * coalesce(pct,0)/100.0),2),
         round(sum(coalesce(o.delivery_fee,0) + coalesce(o.tip_amount,0)),2),
         round(sum(coalesce(o.platform_fee,0)+coalesce(o.handling_fee,0)+coalesce(o.packing_fee,0)+coalesce(o.surge_fee,0)+coalesce(o.penalty_fee,0)),2),
         round(sum(coalesce(o.discount_amount,0)),2),
         round(sum(o.food_total * coalesce(pct,0)/100.0
                 + coalesce(o.platform_fee,0)+coalesce(o.handling_fee,0)+coalesce(o.packing_fee,0)+coalesce(o.surge_fee,0)+coalesce(o.penalty_fee,0)
                 - coalesce(o.discount_amount,0)),2)
  FROM public.orders o
  WHERE o.status = 'DELIVERED'
    AND o.created_at::date BETWEEN _from AND _to
  GROUP BY 1
  ORDER BY 1 DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_daily_report(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_daily_report(date, date) TO authenticated, service_role;