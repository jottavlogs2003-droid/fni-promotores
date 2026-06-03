ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS maps_link text;
ALTER TABLE public.lojas ALTER COLUMN raio_metros SET DEFAULT 100;
UPDATE public.lojas SET raio_metros = 100 WHERE raio_metros IS NULL OR raio_metros = 0;