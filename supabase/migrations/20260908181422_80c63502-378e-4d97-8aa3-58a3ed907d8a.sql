CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.orders_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, extensions
AS $function$
BEGIN
  IF NEW.qr_hash IS NULL THEN NEW.qr_hash := encode(extensions.gen_random_bytes(16), 'hex'); END IF;
  IF NEW.delivery_otp IS NULL OR length(NEW.delivery_otp) <> 4 THEN
    NEW.delivery_otp := lpad((floor(random()*10000))::int::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$function$;