
-- ============================================
-- BLOCO 1: Fechamento mensal, travas e auditoria
-- ============================================

-- 1) Tabela de fechamentos mensais
CREATE TABLE public.fechamentos_mensais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ano int NOT NULL,
  mes int NOT NULL CHECK (mes BETWEEN 1 AND 12),
  fechado_em timestamptz NOT NULL DEFAULT now(),
  fechado_por uuid NOT NULL,
  observacoes text,
  reaberto_em timestamptz,
  reaberto_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ano, mes)
);

ALTER TABLE public.fechamentos_mensais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins gerenciam fechamentos"
ON public.fechamentos_mensais FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Todos autenticados veem fechamentos"
ON public.fechamentos_mensais FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 2) Função: mês está fechado?
CREATE OR REPLACE FUNCTION public.is_mes_fechado(_data date)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.fechamentos_mensais
    WHERE ano = EXTRACT(YEAR FROM _data)::int
      AND mes = EXTRACT(MONTH FROM _data)::int
      AND reaberto_em IS NULL
  )
$$;

-- 3) Tabela de audit log
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela text NOT NULL,
  registro_id uuid,
  acao text NOT NULL CHECK (acao IN ('INSERT','UPDATE','DELETE')),
  user_id uuid,
  user_email text,
  dados_antes jsonb,
  dados_depois jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_tabela ON public.audit_log(tabela, registro_id);
CREATE INDEX idx_audit_log_created ON public.audit_log(created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins veem audit log"
ON public.audit_log FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- audit log nunca pode ser modificado/deletado, nem por admin (append-only)
-- não criamos policies de UPDATE/DELETE/INSERT para usuários; INSERT vem dos triggers (security definer)

-- 4) Função genérica de audit trigger
CREATE OR REPLACE FUNCTION public.fn_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_email text;
BEGIN
  SELECT email INTO v_user_email FROM public.profiles WHERE id = auth.uid();

  IF (TG_OP = 'DELETE') THEN
    INSERT INTO public.audit_log(tabela, registro_id, acao, user_id, user_email, dados_antes)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', auth.uid(), v_user_email, to_jsonb(OLD));
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.audit_log(tabela, registro_id, acao, user_id, user_email, dados_antes, dados_depois)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', auth.uid(), v_user_email, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO public.audit_log(tabela, registro_id, acao, user_id, user_email, dados_depois)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', auth.uid(), v_user_email, to_jsonb(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- 5) Função de trava: bloqueia alteração em mês fechado / status pago
CREATE OR REPLACE FUNCTION public.fn_trava_pagamentos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Trava se mês do período está fechado
  IF public.is_mes_fechado(COALESCE(NEW.periodo_fim, OLD.periodo_fim)) THEN
    RAISE EXCEPTION 'Mês fechado: pagamento não pode ser alterado';
  END IF;
  -- Trava se já foi pago (e está tentando reverter sem ser admin via reabertura)
  IF TG_OP = 'UPDATE' AND OLD.status = 'pago' AND NEW.status <> 'pago' THEN
    RAISE EXCEPTION 'Pagamento já efetuado não pode ser revertido';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_trava_faturas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_mes_fechado(COALESCE(NEW.periodo_fim, OLD.periodo_fim)) THEN
    RAISE EXCEPTION 'Mês fechado: fatura não pode ser alterada';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'pago' AND NEW.status <> 'pago' THEN
    RAISE EXCEPTION 'Fatura paga não pode ser revertida';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_trava_escalas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_mes_fechado(COALESCE(NEW.data, OLD.data)) THEN
    RAISE EXCEPTION 'Mês fechado: escala não pode ser alterada';
  END IF;
  RETURN NEW;
END;
$$;

-- 6) Aplicar triggers de TRAVA (BEFORE)
CREATE TRIGGER trg_trava_pagamentos
BEFORE UPDATE OR DELETE ON public.pagamentos_promotores
FOR EACH ROW EXECUTE FUNCTION public.fn_trava_pagamentos();

CREATE TRIGGER trg_trava_faturas
BEFORE UPDATE OR DELETE ON public.faturas_clientes
FOR EACH ROW EXECUTE FUNCTION public.fn_trava_faturas();

CREATE TRIGGER trg_trava_escalas
BEFORE UPDATE OR DELETE ON public.escalas
FOR EACH ROW EXECUTE FUNCTION public.fn_trava_escalas();

-- 7) Aplicar triggers de AUDIT (AFTER) nas tabelas financeiras e operacionais sensíveis
CREATE TRIGGER trg_audit_pagamentos
AFTER INSERT OR UPDATE OR DELETE ON public.pagamentos_promotores
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

CREATE TRIGGER trg_audit_faturas
AFTER INSERT OR UPDATE OR DELETE ON public.faturas_clientes
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

CREATE TRIGGER trg_audit_escalas
AFTER INSERT OR UPDATE OR DELETE ON public.escalas
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

CREATE TRIGGER trg_audit_clientes
AFTER INSERT OR UPDATE OR DELETE ON public.clientes
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

CREATE TRIGGER trg_audit_profiles
AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

CREATE TRIGGER trg_audit_fechamentos
AFTER INSERT OR UPDATE OR DELETE ON public.fechamentos_mensais
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();
