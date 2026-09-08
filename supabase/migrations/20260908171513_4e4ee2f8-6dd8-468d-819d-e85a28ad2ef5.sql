ALTER TABLE public.vendors DROP CONSTRAINT IF EXISTS vendors_status_check;
ALTER TABLE public.vendors ADD CONSTRAINT vendors_status_check CHECK (status = ANY (ARRAY['PENDING','APPROVED','REJECTED','UNDER_REVIEW','SUSPENDED']));
ALTER TABLE public.delivery_partners DROP CONSTRAINT IF EXISTS delivery_partners_status_check;
ALTER TABLE public.delivery_partners ADD CONSTRAINT delivery_partners_status_check CHECK (status = ANY (ARRAY['PENDING','APPROVED','REJECTED','UNDER_REVIEW','SUSPENDED']));