
-- 1) profiles_financeiro
CREATE TABLE public.profiles_financeiro (
  id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  cpf text,
  chave_pix text,
  valor_diaria numeric(10,2) DEFAULT 0,
  valor_hora_extra numeric(10,2) DEFAULT 0,
  permite_dupla_diaria boolean DEFAULT false,
  forma_pagamento text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_financeiro_forma_pagamento_check CHECK (forma_pagamento IS NULL OR forma_pagamento = ANY (ARRAY['pix','transferencia','dinheiro']))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles_financeiro TO authenticated;
GRANT ALL ON public.profiles_financeiro TO service_role;
ALTER TABLE public.profiles_financeiro ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Self select financeiro" ON public.profiles_financeiro
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admin select financeiro" ON public.profiles_financeiro
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admin manage financeiro" ON public.profiles_financeiro
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER trg_financeiro_updated BEFORE UPDATE ON public.profiles_financeiro
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.profiles_financeiro (id, cpf, chave_pix, valor_diaria, valor_hora_extra, permite_dupla_diaria, forma_pagamento)
SELECT id, cpf, chave_pix, COALESCE(valor_diaria,0), COALESCE(valor_hora_extra,0), COALESCE(permite_dupla_diaria,false), forma_pagamento
FROM public.profiles
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.fn_create_profile_financeiro()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles_financeiro (id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END$$;
CREATE TRIGGER trg_create_financeiro AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.fn_create_profile_financeiro();

-- 2) Drop dependent view, drop columns, recreate view
DROP VIEW IF EXISTS public.resumo_financeiro_mensal;

ALTER TABLE public.profiles
  DROP COLUMN cpf,
  DROP COLUMN chave_pix,
  DROP COLUMN valor_diaria,
  DROP COLUMN valor_hora_extra,
  DROP COLUMN permite_dupla_diaria,
  DROP COLUMN forma_pagamento;

CREATE VIEW public.resumo_financeiro_mensal
WITH (security_invoker = true) AS
SELECT to_char(date_trunc('month', e.data::timestamp with time zone), 'YYYY-MM') AS mes,
  COALESCE(sum(e.diarias * COALESCE(pf.valor_diaria, 0)), 0) AS total_pagar_promotores,
  COALESCE(sum(e.diarias * COALESCE(c.valor_diaria_cobrada, 0)), 0) AS total_receber_clientes,
  COALESCE(sum(e.diarias * COALESCE(c.valor_diaria_cobrada, 0)) - sum(e.diarias * COALESCE(pf.valor_diaria, 0)), 0) AS lucro
FROM public.escalas e
LEFT JOIN public.profiles_financeiro pf ON pf.id = e.promotor_id
LEFT JOIN public.lojas l ON l.id = e.loja_id
LEFT JOIN public.clientes c ON c.id = l.cliente_id
WHERE e.status = ANY (ARRAY['concluido','em_andamento','agendado'])
GROUP BY to_char(date_trunc('month', e.data::timestamp with time zone), 'YYYY-MM')
ORDER BY 1 DESC;
GRANT SELECT ON public.resumo_financeiro_mensal TO authenticated, service_role;

-- 3) Block self-modification of privileged profile fields
CREATE OR REPLACE FUNCTION public.fn_block_self_privileged_profile_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::public.app_role) THEN RETURN NEW; END IF;
  IF NEW.cliente_id IS DISTINCT FROM OLD.cliente_id
     OR NEW.tipo_promotor IS DISTINCT FROM OLD.tipo_promotor
     OR NEW.loja_fixa_id IS DISTINCT FROM OLD.loja_fixa_id
     OR NEW.jornada_horas IS DISTINCT FROM OLD.jornada_horas
     OR NEW.ativo IS DISTINCT FROM OLD.ativo THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar campos privilegiados do perfil';
  END IF;
  RETURN NEW;
END$$;
CREATE TRIGGER trg_block_self_priv_profile BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.fn_block_self_privileged_profile_change();

-- 4) Tighten contratante read on fotos-execucao bucket
DROP POLICY IF EXISTS "Contratantes read fotos exec" ON storage.objects;
CREATE POLICY "Contratantes read fotos exec" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'fotos-execucao'
    AND public.has_role(auth.uid(), 'contratante'::public.app_role)
    AND EXISTS (
      SELECT 1
      FROM public.campanha_promotores cp
      JOIN public.campanha_lojas cl ON cl.campanha_id = cp.campanha_id
      JOIN public.lojas l ON l.id = cl.loja_id
      WHERE cp.promotor_id::text = (storage.foldername(name))[1]
        AND l.cliente_id = public.get_user_cliente_id(auth.uid())
    )
  );

-- 5) DELETE policies for private buckets
CREATE POLICY "Promotores delete own selfies" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'selfies-checkin' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins delete selfies" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'selfies-checkin' AND public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Promotores delete own fotos exec" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'fotos-execucao' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins delete fotos exec" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'fotos-execucao' AND public.has_role(auth.uid(), 'admin'::public.app_role));
