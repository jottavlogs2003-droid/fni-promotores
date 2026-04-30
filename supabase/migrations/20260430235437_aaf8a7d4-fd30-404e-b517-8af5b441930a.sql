
REVOKE EXECUTE ON FUNCTION public.fn_audit_trigger() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_trava_pagamentos() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_trava_faturas() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_trava_escalas() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_mes_fechado(date) FROM anon;
