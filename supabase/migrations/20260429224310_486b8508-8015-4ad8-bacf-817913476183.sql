DROP VIEW IF EXISTS public.resumo_financeiro_mensal;
CREATE VIEW public.resumo_financeiro_mensal
WITH (security_invoker = true) AS
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