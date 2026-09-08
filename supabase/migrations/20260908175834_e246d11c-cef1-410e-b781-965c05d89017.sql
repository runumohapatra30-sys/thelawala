ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS food_type text NOT NULL DEFAULT 'VEG';
ALTER TABLE public.menu_items DROP CONSTRAINT IF EXISTS menu_items_food_type_check;
ALTER TABLE public.menu_items ADD CONSTRAINT menu_items_food_type_check CHECK (food_type IN ('VEG','NONVEG'));