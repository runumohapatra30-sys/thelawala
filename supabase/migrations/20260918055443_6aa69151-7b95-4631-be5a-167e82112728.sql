CREATE OR REPLACE FUNCTION public.guard_order_abuse()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE recent integer;
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = NEW.user_id AND p.is_blocked) THEN
    RAISE EXCEPTION 'This account is blocked. Please contact support.';
  END IF;
  SELECT count(*) INTO recent FROM public.orders o
   WHERE o.user_id = NEW.user_id AND o.created_at > now() - interval '5 minutes';
  IF recent >= 5 THEN
    RAISE EXCEPTION 'Too many orders in a short time. Please wait a few minutes.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS t_orders_guard_abuse ON public.orders;
CREATE TRIGGER t_orders_guard_abuse BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.guard_order_abuse();