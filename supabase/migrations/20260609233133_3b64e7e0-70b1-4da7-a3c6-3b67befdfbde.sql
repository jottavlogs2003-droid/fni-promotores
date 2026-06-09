
-- 1) Restrict clientes: drop promotor-wide SELECT, expose only minimal data via a SECURITY DEFINER view if needed (not required by app currently)
DROP POLICY IF EXISTS "Promotores see clientes of their campanhas" ON public.clientes;

-- 2) Tighten fechamentos_mensais SELECT to admin + contratante only
DROP POLICY IF EXISTS "Todos autenticados veem fechamentos" ON public.fechamentos_mensais;
CREATE POLICY "Admins e contratantes veem fechamentos" ON public.fechamentos_mensais
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'contratante'::public.app_role)
  );

-- 3) Server-side geofence enforcement on check_ins
CREATE OR REPLACE FUNCTION public.fn_enforce_checkin_geofence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lat double precision;
  v_lon double precision;
  v_raio integer;
  v_dist double precision;
  R constant double precision := 6371000;
  dLat double precision;
  dLon double precision;
  a double precision;
BEGIN
  SELECT latitude, longitude, COALESCE(raio_metros, 100)
    INTO v_lat, v_lon, v_raio
  FROM public.lojas WHERE id = NEW.loja_id;

  IF v_lat IS NULL OR v_lon IS NULL THEN
    RAISE EXCEPTION 'Loja sem coordenadas configuradas';
  END IF;

  IF NEW.latitude_entrada IS NULL OR NEW.longitude_entrada IS NULL THEN
    RAISE EXCEPTION 'Check-in requer coordenadas de entrada';
  END IF;

  dLat := radians(NEW.latitude_entrada - v_lat);
  dLon := radians(NEW.longitude_entrada - v_lon);
  a := sin(dLat/2)^2 + cos(radians(v_lat)) * cos(radians(NEW.latitude_entrada)) * sin(dLon/2)^2;
  v_dist := 2 * R * asin(sqrt(a));

  NEW.distancia_metros := v_dist;

  IF v_dist > v_raio THEN
    RAISE EXCEPTION 'Fora do raio permitido da loja (% m > % m)', round(v_dist::numeric, 0), v_raio;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_checkin_geofence ON public.check_ins;
CREATE TRIGGER trg_enforce_checkin_geofence
  BEFORE INSERT ON public.check_ins
  FOR EACH ROW EXECUTE FUNCTION public.fn_enforce_checkin_geofence();
