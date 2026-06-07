CREATE OR REPLACE FUNCTION public.user_can_access_campanha(_campanha_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.campanhas c
      WHERE c.id = _campanha_id
        AND (
          c.cliente_id = public.get_user_cliente_id(auth.uid())
          OR EXISTS (
            SELECT 1
            FROM public.campanha_promotores cp
            WHERE cp.campanha_id = c.id
              AND cp.promotor_id = auth.uid()
          )
        )
    )
$$;

REVOKE ALL ON FUNCTION public.user_can_access_campanha(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_can_access_campanha(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_access_campanha(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.user_can_access_campanha_promotor(_campanha_id uuid, _promotor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR _promotor_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.campanhas c
      WHERE c.id = _campanha_id
        AND c.cliente_id = public.get_user_cliente_id(auth.uid())
    )
$$;

REVOKE ALL ON FUNCTION public.user_can_access_campanha_promotor(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_can_access_campanha_promotor(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_access_campanha_promotor(uuid, uuid) TO service_role;

DROP POLICY IF EXISTS "Contratantes see own campanhas" ON public.campanhas;
DROP POLICY IF EXISTS "Promotores see assigned campanhas" ON public.campanhas;
CREATE POLICY "Users see allowed campanhas"
ON public.campanhas
FOR SELECT
TO authenticated
USING (public.user_can_access_campanha(id));

DROP POLICY IF EXISTS "Contratantes see own campanha_promotores" ON public.campanha_promotores;
DROP POLICY IF EXISTS "Promotores see own assignments" ON public.campanha_promotores;
CREATE POLICY "Users see allowed campanha_promotores"
ON public.campanha_promotores
FOR SELECT
TO authenticated
USING (public.user_can_access_campanha_promotor(campanha_id, promotor_id));