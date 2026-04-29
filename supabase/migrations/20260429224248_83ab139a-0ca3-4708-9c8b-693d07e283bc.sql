-- =====================================================
-- FNI: Módulo Financeiro + Escala Inteligente
-- =====================================================

-- Extender promotores (profiles) com dados operacionais e financeiros
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cpf TEXT,
  ADD COLUMN IF NOT EXISTS tipo_promotor TEXT CHECK (tipo_promotor IN ('fixo','rotativo')),
  ADD COLUMN IF NOT EXISTS jornada_horas INTEGER CHECK (jornada_horas IN (6,12)),
  ADD COLUMN IF NOT EXISTS permite_dupla_diaria BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS valor_diaria NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_hora_extra NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loja_fixa_id UUID,
  ADD COLUMN IF NOT EXISTS forma_pagamento TEXT CHECK (forma_pagamento IN ('pix','transferencia','dinheiro')),
  ADD COLUMN IF NOT EXISTS chave_pix TEXT;

-- Extender clientes com dados financeiros
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS responsavel TEXT,
  ADD COLUMN IF NOT EXISTS valor_diaria_cobrada NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_hora_cobrada NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tipo_cobranca TEXT CHECK (tipo_cobranca IN ('diaria','hora','mensal')) DEFAULT 'diaria',
  ADD COLUMN IF NOT EXISTS valor_mensal NUMERIC(10,2) DEFAULT 0;

-- =====================================================
-- ESCALAS: turno individual de um promotor em uma loja/data
-- =====================================================
CREATE TABLE IF NOT EXISTS public.escalas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id UUID,
  promotor_id UUID NOT NULL,
  loja_id UUID NOT NULL,
  data DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  duracao_horas NUMERIC(4,2) NOT NULL,
  diarias NUMERIC(4,2) NOT NULL DEFAULT 1,
  turno INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'agendado' CHECK (status IN ('agendado','em_andamento','concluido','faltou','cancelado')),
  check_in_id UUID,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_escalas_promotor_data ON public.escalas(promotor_id, data);
CREATE INDEX IF NOT EXISTS idx_escalas_loja_data ON public.escalas(loja_id, data);
CREATE INDEX IF NOT EXISTS idx_escalas_campanha ON public.escalas(campanha_id);

ALTER TABLE public.escalas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage escalas" ON public.escalas FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Promotores see own escalas" ON public.escalas FOR SELECT
  USING (promotor_id = auth.uid());
CREATE POLICY "Contratantes see escalas of own lojas" ON public.escalas FOR SELECT
  USING (loja_id IN (SELECT id FROM public.lojas WHERE cliente_id = public.get_user_cliente_id(auth.uid())));

CREATE TRIGGER trg_escalas_updated BEFORE UPDATE ON public.escalas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- PAGAMENTOS A PROMOTORES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.pagamentos_promotores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotor_id UUID NOT NULL,
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  total_diarias NUMERIC(6,2) NOT NULL DEFAULT 0,
  total_turnos INTEGER NOT NULL DEFAULT 0,
  horas_extras NUMERIC(6,2) NOT NULL DEFAULT 0,
  valor_diarias NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_extras NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','pago','cancelado')),
  forma_pagamento TEXT,
  data_pagamento DATE,
  comprovante_url TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pag_prom_promotor ON public.pagamentos_promotores(promotor_id);
CREATE INDEX IF NOT EXISTS idx_pag_prom_status ON public.pagamentos_promotores(status);

ALTER TABLE public.pagamentos_promotores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage pagamentos promotores" ON public.pagamentos_promotores FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Promotores veem proprios pagamentos" ON public.pagamentos_promotores FOR SELECT
  USING (promotor_id = auth.uid());

CREATE TRIGGER trg_pag_prom_updated BEFORE UPDATE ON public.pagamentos_promotores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- FATURAS / COBRANÇAS DE CLIENTES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.faturas_clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL,
  campanha_id UUID,
  numero_fatura TEXT,
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  total_diarias NUMERIC(6,2) NOT NULL DEFAULT 0,
  total_horas NUMERIC(8,2) NOT NULL DEFAULT 0,
  valor_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','enviada','paga','vencida','cancelada')),
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento DATE,
  data_pagamento DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fat_cli_cliente ON public.faturas_clientes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_fat_cli_status ON public.faturas_clientes(status);

ALTER TABLE public.faturas_clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage faturas" ON public.faturas_clientes FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Contratantes veem proprias faturas" ON public.faturas_clientes FOR SELECT
  USING (cliente_id = public.get_user_cliente_id(auth.uid()));

CREATE TRIGGER trg_fat_cli_updated BEFORE UPDATE ON public.faturas_clientes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- VIEW: resumo financeiro mensal (lucro)
-- =====================================================
CREATE OR REPLACE VIEW public.resumo_financeiro_mensal AS
SELECT
  to_char(date_trunc('month', e.data),'YYYY-MM') AS mes,
  COALESCE(SUM(e.diarias * COALESCE(p.valor_diaria,0)), 0) AS total_pagar_promotores,
  COALESCE(SUM(e.diarias * COALESCE(c.valor_diaria_cobrada,0)), 0) AS total_receber_clientes,
  COALESCE(SUM(e.diarias * COALESCE(c.valor_diaria_cobrada,0)) - SUM(e.diarias * COALESCE(p.valor_diaria,0)), 0) AS lucro
FROM public.escalas e
LEFT JOIN public.profiles p ON p.id = e.promotor_id
LEFT JOIN public.lojas l ON l.id = e.loja_id
LEFT JOIN public.clientes c ON c.id = l.cliente_id
WHERE e.status IN ('concluido','em_andamento','agendado')
GROUP BY 1
ORDER BY 1 DESC;

GRANT SELECT ON public.resumo_financeiro_mensal TO authenticated;