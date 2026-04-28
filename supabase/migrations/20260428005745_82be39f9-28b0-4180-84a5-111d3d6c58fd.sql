
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'contratante', 'promotor');
CREATE TYPE public.campanha_status AS ENUM ('rascunho', 'ativa', 'pausada', 'concluida');
CREATE TYPE public.ruptura_status AS ENUM ('aberta', 'resolvida');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  avatar_url TEXT,
  cliente_id UUID,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES (separate table for security) ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_cliente_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cliente_id FROM public.profiles WHERE id = _user_id
$$;

-- ============ CLIENTES ============
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT,
  email_contato TEXT,
  telefone TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_cliente_fk FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE SET NULL;

-- ============ LOJAS ============
CREATE TABLE public.lojas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  codigo TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  raio_metros INTEGER NOT NULL DEFAULT 100,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lojas ENABLE ROW LEVEL SECURITY;

-- ============ PRODUTOS ============
CREATE TABLE public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  sku TEXT,
  marca TEXT,
  categoria TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

-- ============ CAMPANHAS ============
CREATE TABLE public.campanhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  status campanha_status NOT NULL DEFAULT 'rascunho',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.campanhas ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.campanha_lojas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id UUID NOT NULL REFERENCES public.campanhas(id) ON DELETE CASCADE,
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  UNIQUE (campanha_id, loja_id)
);
ALTER TABLE public.campanha_lojas ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.campanha_promotores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id UUID NOT NULL REFERENCES public.campanhas(id) ON DELETE CASCADE,
  promotor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE (campanha_id, promotor_id)
);
ALTER TABLE public.campanha_promotores ENABLE ROW LEVEL SECURITY;

-- ============ CHECK-INS ============
CREATE TABLE public.check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  campanha_id UUID REFERENCES public.campanhas(id) ON DELETE SET NULL,
  hora_entrada TIMESTAMPTZ NOT NULL DEFAULT now(),
  hora_saida TIMESTAMPTZ,
  latitude_entrada DOUBLE PRECISION NOT NULL,
  longitude_entrada DOUBLE PRECISION NOT NULL,
  latitude_saida DOUBLE PRECISION,
  longitude_saida DOUBLE PRECISION,
  selfie_url TEXT NOT NULL,
  distancia_metros INTEGER,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

-- ============ EXECUCOES ============
CREATE TABLE public.execucoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_in_id UUID NOT NULL REFERENCES public.check_ins(id) ON DELETE CASCADE,
  promotor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  loja_organizada BOOLEAN,
  produto_exposto BOOLEAN,
  preco_visivel BOOLEAN,
  material_merchandising BOOLEAN,
  observacoes TEXT,
  score INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.execucoes ENABLE ROW LEVEL SECURITY;

-- ============ FOTOS ============
CREATE TABLE public.fotos_execucao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execucao_id UUID REFERENCES public.execucoes(id) ON DELETE CASCADE,
  check_in_id UUID REFERENCES public.check_ins(id) ON DELETE CASCADE,
  promotor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('antes', 'depois', 'geral')),
  foto_url TEXT NOT NULL,
  legenda TEXT,
  taken_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fotos_execucao ENABLE ROW LEVEL SECURITY;

-- ============ VALIDADES ============
CREATE TABLE public.validades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  promotor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_validade DATE NOT NULL,
  quantidade INTEGER,
  foto_url TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.validades ENABLE ROW LEVEL SECURITY;

-- ============ RUPTURAS ============
CREATE TABLE public.rupturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  promotor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quantidade_atual INTEGER NOT NULL DEFAULT 0,
  status ruptura_status NOT NULL DEFAULT 'aberta',
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolvida_em TIMESTAMPTZ
);
ALTER TABLE public.rupturas ENABLE ROW LEVEL SECURITY;

-- ============ NOTIFICACOES ============
CREATE TABLE public.notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  tipo TEXT,
  lida BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- ============ TRIGGERS ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_clientes_updated BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_lojas_updated BEFORE UPDATE ON public.lojas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_produtos_updated BEFORE UPDATE ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_campanhas_updated BEFORE UPDATE ON public.campanhas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  -- Default role: promotor (admin will reassign)
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'promotor');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ RLS POLICIES ============

-- profiles
CREATE POLICY "Users see own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins see all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Contratantes see profiles of their cliente" ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'contratante') AND cliente_id = public.get_user_cliente_id(auth.uid()));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins update any profile" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert profiles" ON public.profiles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- user_roles
CREATE POLICY "Users see own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins see all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- clientes
CREATE POLICY "Admins manage clientes" ON public.clientes FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Contratantes see own cliente" ON public.clientes FOR SELECT
  USING (public.has_role(auth.uid(), 'contratante') AND id = public.get_user_cliente_id(auth.uid()));
CREATE POLICY "Promotores see clientes of their campanhas" ON public.clientes FOR SELECT
  USING (public.has_role(auth.uid(), 'promotor') AND id IN (
    SELECT c.cliente_id FROM public.campanhas c
    JOIN public.campanha_promotores cp ON cp.campanha_id = c.id
    WHERE cp.promotor_id = auth.uid()
  ));

-- lojas
CREATE POLICY "Admins manage lojas" ON public.lojas FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Contratantes see own lojas" ON public.lojas FOR SELECT
  USING (public.has_role(auth.uid(), 'contratante') AND cliente_id = public.get_user_cliente_id(auth.uid()));
CREATE POLICY "Promotores see lojas of their campanhas" ON public.lojas FOR SELECT
  USING (public.has_role(auth.uid(), 'promotor') AND id IN (
    SELECT cl.loja_id FROM public.campanha_lojas cl
    JOIN public.campanha_promotores cp ON cp.campanha_id = cl.campanha_id
    WHERE cp.promotor_id = auth.uid()
  ));

-- produtos
CREATE POLICY "Admins manage produtos" ON public.produtos FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Contratantes see own produtos" ON public.produtos FOR SELECT
  USING (public.has_role(auth.uid(), 'contratante') AND cliente_id = public.get_user_cliente_id(auth.uid()));
CREATE POLICY "Promotores see produtos of their clientes" ON public.produtos FOR SELECT
  USING (public.has_role(auth.uid(), 'promotor') AND cliente_id IN (
    SELECT c.cliente_id FROM public.campanhas c
    JOIN public.campanha_promotores cp ON cp.campanha_id = c.id
    WHERE cp.promotor_id = auth.uid()
  ));

-- campanhas
CREATE POLICY "Admins manage campanhas" ON public.campanhas FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Contratantes see own campanhas" ON public.campanhas FOR SELECT
  USING (public.has_role(auth.uid(), 'contratante') AND cliente_id = public.get_user_cliente_id(auth.uid()));
CREATE POLICY "Promotores see assigned campanhas" ON public.campanhas FOR SELECT
  USING (public.has_role(auth.uid(), 'promotor') AND id IN (
    SELECT campanha_id FROM public.campanha_promotores WHERE promotor_id = auth.uid()
  ));

-- campanha_lojas
CREATE POLICY "Admins manage campanha_lojas" ON public.campanha_lojas FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Contratantes see own campanha_lojas" ON public.campanha_lojas FOR SELECT
  USING (campanha_id IN (SELECT id FROM public.campanhas WHERE cliente_id = public.get_user_cliente_id(auth.uid())));
CREATE POLICY "Promotores see own campanha_lojas" ON public.campanha_lojas FOR SELECT
  USING (campanha_id IN (SELECT campanha_id FROM public.campanha_promotores WHERE promotor_id = auth.uid()));

-- campanha_promotores
CREATE POLICY "Admins manage campanha_promotores" ON public.campanha_promotores FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Promotores see own assignments" ON public.campanha_promotores FOR SELECT USING (promotor_id = auth.uid());
CREATE POLICY "Contratantes see own campanha_promotores" ON public.campanha_promotores FOR SELECT
  USING (campanha_id IN (SELECT id FROM public.campanhas WHERE cliente_id = public.get_user_cliente_id(auth.uid())));

-- check_ins
CREATE POLICY "Promotores create own check_ins" ON public.check_ins FOR INSERT WITH CHECK (auth.uid() = promotor_id);
CREATE POLICY "Promotores see own check_ins" ON public.check_ins FOR SELECT USING (auth.uid() = promotor_id);
CREATE POLICY "Promotores update own check_ins" ON public.check_ins FOR UPDATE USING (auth.uid() = promotor_id);
CREATE POLICY "Admins see all check_ins" ON public.check_ins FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Contratantes see check_ins of own lojas" ON public.check_ins FOR SELECT
  USING (loja_id IN (SELECT id FROM public.lojas WHERE cliente_id = public.get_user_cliente_id(auth.uid())));

-- execucoes
CREATE POLICY "Promotores manage own execucoes" ON public.execucoes FOR ALL USING (auth.uid() = promotor_id) WITH CHECK (auth.uid() = promotor_id);
CREATE POLICY "Admins see all execucoes" ON public.execucoes FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Contratantes see execucoes of own lojas" ON public.execucoes FOR SELECT
  USING (loja_id IN (SELECT id FROM public.lojas WHERE cliente_id = public.get_user_cliente_id(auth.uid())));

-- fotos_execucao
CREATE POLICY "Promotores manage own fotos" ON public.fotos_execucao FOR ALL USING (auth.uid() = promotor_id) WITH CHECK (auth.uid() = promotor_id);
CREATE POLICY "Admins see all fotos" ON public.fotos_execucao FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Contratantes see fotos of own lojas" ON public.fotos_execucao FOR SELECT
  USING (loja_id IN (SELECT id FROM public.lojas WHERE cliente_id = public.get_user_cliente_id(auth.uid())));

-- validades
CREATE POLICY "Promotores manage own validades" ON public.validades FOR ALL USING (auth.uid() = promotor_id) WITH CHECK (auth.uid() = promotor_id);
CREATE POLICY "Admins see all validades" ON public.validades FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Contratantes see validades of own lojas" ON public.validades FOR SELECT
  USING (loja_id IN (SELECT id FROM public.lojas WHERE cliente_id = public.get_user_cliente_id(auth.uid())));

-- rupturas
CREATE POLICY "Promotores manage own rupturas" ON public.rupturas FOR ALL USING (auth.uid() = promotor_id) WITH CHECK (auth.uid() = promotor_id);
CREATE POLICY "Admins manage all rupturas" ON public.rupturas FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Contratantes see rupturas of own lojas" ON public.rupturas FOR SELECT
  USING (loja_id IN (SELECT id FROM public.lojas WHERE cliente_id = public.get_user_cliente_id(auth.uid())));

-- notificacoes
CREATE POLICY "Users see own notificacoes" ON public.notificacoes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notificacoes" ON public.notificacoes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins create notificacoes" ON public.notificacoes FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ STORAGE BUCKETS ============
INSERT INTO storage.buckets (id, name, public) VALUES
  ('selfies-checkin', 'selfies-checkin', false),
  ('fotos-execucao', 'fotos-execucao', false),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Promotores upload own selfies" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'selfies-checkin' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Promotores read own selfies" ON storage.objects FOR SELECT
  USING (bucket_id = 'selfies-checkin' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins read all selfies" ON storage.objects FOR SELECT
  USING (bucket_id = 'selfies-checkin' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Promotores upload own fotos exec" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'fotos-execucao' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Promotores read own fotos exec" ON storage.objects FOR SELECT
  USING (bucket_id = 'fotos-execucao' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins read all fotos exec" ON storage.objects FOR SELECT
  USING (bucket_id = 'fotos-execucao' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Contratantes read fotos exec" ON storage.objects FOR SELECT
  USING (bucket_id = 'fotos-execucao' AND public.has_role(auth.uid(), 'contratante'));

CREATE POLICY "Avatars public read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users upload own avatar" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own avatar" ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Indexes
CREATE INDEX idx_check_ins_promotor ON public.check_ins(promotor_id);
CREATE INDEX idx_check_ins_loja ON public.check_ins(loja_id);
CREATE INDEX idx_check_ins_data ON public.check_ins(hora_entrada);
CREATE INDEX idx_lojas_cliente ON public.lojas(cliente_id);
CREATE INDEX idx_produtos_cliente ON public.produtos(cliente_id);
CREATE INDEX idx_campanhas_cliente ON public.campanhas(cliente_id);
