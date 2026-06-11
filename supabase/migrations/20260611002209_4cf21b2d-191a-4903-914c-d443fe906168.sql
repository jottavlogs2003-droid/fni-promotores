ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS tipo_atendimento text NOT NULL DEFAULT 'loja',
  ADD COLUMN IF NOT EXISTS marcas text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.clientes DROP CONSTRAINT IF EXISTS clientes_tipo_atendimento_check;
ALTER TABLE public.clientes ADD CONSTRAINT clientes_tipo_atendimento_check
  CHECK (tipo_atendimento IN ('loja','marca'));