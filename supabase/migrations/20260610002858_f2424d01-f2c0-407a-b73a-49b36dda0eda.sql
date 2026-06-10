
-- Admin pode subir/editar foto de qualquer promotor no bucket avatars
CREATE POLICY "Admins manage any avatar (insert)"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins manage any avatar (update)"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins manage any avatar (delete)"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND public.has_role(auth.uid(), 'admin'::public.app_role));
