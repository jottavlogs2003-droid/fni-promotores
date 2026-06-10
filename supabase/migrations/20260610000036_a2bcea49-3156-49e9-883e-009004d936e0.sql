
-- Expand tipo_promotor to allow rota_fixa, loja_fixa, marca (keep legacy fixo/rotativo)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_tipo_promotor_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_tipo_promotor_check
  CHECK (tipo_promotor IS NULL OR tipo_promotor = ANY (ARRAY['fixo','rotativo','rota_fixa','loja_fixa','marca']));

-- Add fields for promoter scope
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS marcas_atendidas text[] DEFAULT '{}'::text[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rota_lojas uuid[] DEFAULT '{}'::uuid[];
