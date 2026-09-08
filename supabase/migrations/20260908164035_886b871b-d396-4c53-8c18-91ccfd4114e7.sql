ALTER TABLE public.delivery_partners ADD COLUMN IF NOT EXISTS dl_number text;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS fssai_number text;

ALTER TABLE public.delivery_partners DROP CONSTRAINT IF EXISTS delivery_partners_dl_format;
ALTER TABLE public.delivery_partners ADD CONSTRAINT delivery_partners_dl_format
  CHECK (dl_number IS NULL OR dl_number ~ '^[A-Z]{2}[0-9]{2}[ -]?[0-9]{11}$');

ALTER TABLE public.vendors DROP CONSTRAINT IF EXISTS vendors_fssai_format;
ALTER TABLE public.vendors ADD CONSTRAINT vendors_fssai_format
  CHECK (fssai_number IS NULL OR fssai_number ~ '^[1-2][0-9]{13}$');

CREATE OR REPLACE FUNCTION public.dl_change_review()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.dl_number IS DISTINCT FROM OLD.dl_number AND NEW.dl_number IS NOT NULL THEN
    NEW.status := 'UNDER_REVIEW';
    NEW.is_online := false;
    NEW.is_busy := false;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS t_partners_dl_review ON public.delivery_partners;
CREATE TRIGGER t_partners_dl_review
  BEFORE UPDATE ON public.delivery_partners
  FOR EACH ROW EXECUTE FUNCTION public.dl_change_review();