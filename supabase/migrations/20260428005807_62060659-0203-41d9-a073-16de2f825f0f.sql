
-- Fix search_path on all functions
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- Revoke public/anon execute on security definer functions
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_cliente_id(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_cliente_id(UUID) TO authenticated;

-- Restrict avatars bucket listing: only allow reading own avatar folder
DROP POLICY IF EXISTS "Avatars public read" ON storage.objects;
CREATE POLICY "Avatars read own or by url" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin')
  ));
