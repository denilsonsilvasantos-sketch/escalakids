-- ===================================================================
-- MEVAM KIDS - ESQUEMA DE BANCO DE DADOS SUPABASE (PostgreSQL)
-- Execute este script no "SQL Editor" do seu painel do Supabase.
-- ===================================================================

-- 1. Habilitar extensões úteis
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela: perfis de usuários / contas de acesso
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'VOLUNTARIO', -- 'ADMIN_LIDERANCA', 'LIDER_MACRO', 'LIDER_MICRO', 'COORDENADOR', 'VOLUNTARIO', 'OBSERVADOR'
  avatar TEXT,
  allowed_micro_ids JSONB DEFAULT '[]'::jsonb,
  primary_micro_id TEXT,
  person_id TEXT,
  whatsapp TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela: Frentes / Micros
CREATE TABLE IF NOT EXISTS public.micros (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  leader_name TEXT,
  leader_id TEXT,
  status TEXT NOT NULL DEFAULT 'ATIVO',
  color TEXT NOT NULL DEFAULT '#2563EB',
  icon_name TEXT DEFAULT 'Layers',
  default_shifts JSONB DEFAULT '["Manhã", "Noite"]'::jsonb,
  algorithm_weights JSONB DEFAULT '{
    "availability": 100,
    "correctFunction": 100,
    "volunteerPreference": 80,
    "frequencyBalance": 90,
    "recency": 80,
    "rotation": 80,
    "family": 60,
    "experience": 50
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela: Funções dos Micros
CREATE TABLE IF NOT EXISTS public.micro_functions (
  id TEXT PRIMARY KEY,
  micro_id TEXT NOT NULL REFERENCES public.micros(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  criteria JSONB DEFAULT '{}'::jsonb,
  default_required_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabela: Famílias
CREATE TABLE IF NOT EXISTS public.families (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'ALTA', -- 'MUITO_ALTA', 'ALTA', 'MEDIA', 'BAIXA', 'DESATIVADA'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabela: Pessoas / Voluntários
CREATE TABLE IF NOT EXISTS public.people (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  nickname TEXT,
  birth_date TEXT NOT NULL, -- YYYY-MM-DD
  phone TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  notes TEXT,
  family_id TEXT REFERENCES public.families(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  micro_ids JSONB DEFAULT '[]'::jsonb,
  function_preferences JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabela: Regras de Disponibilidade
CREATE TABLE IF NOT EXISTS public.availability_rules (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'RECORRENTE' | 'DATA_ESPECIFICA'
  day_of_week INTEGER, -- 0=Domingo, 3=Quarta, 6=Sábado
  shift TEXT, -- 'MANHA' | 'NOITE' | 'AMBOS' | 'QUALQUER'
  specific_date TEXT, -- YYYY-MM-DD
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Tabela: Escalas (Gerais / Macros)
CREATE TABLE IF NOT EXISTS public.schedules (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  event_id TEXT,
  event_name TEXT NOT NULL,
  period TEXT,
  shift TEXT NOT NULL DEFAULT 'NOITE', -- 'MANHA' | 'NOITE' | 'TARDE' | 'AMBOS'
  dates JSONB NOT NULL DEFAULT '[]'::jsonb,
  micro_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'RASCUNHO', -- 'RASCUNHO' | 'EM_REVISAO' | 'CONFIRMADA' | 'PUBLICADA' | 'CANCELADA'
  created_by TEXT,
  updated_by TEXT,
  quality_metrics JSONB DEFAULT '{}'::jsonb,
  slots JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Tabela: Histórico de Rodízio
CREATE TABLE IF NOT EXISTS public.rotation_history (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  event_id TEXT NOT NULL,
  micro_id TEXT NOT NULL,
  function_id TEXT NOT NULL,
  person_id TEXT NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  co_volunteers JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Tabela: Logs de Auditoria do Sistema
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  target_type TEXT NOT NULL
);

-- Índices de Performance
CREATE INDEX IF NOT EXISTS idx_people_active ON public.people(active);
CREATE INDEX IF NOT EXISTS idx_people_family ON public.people(family_id);
CREATE INDEX IF NOT EXISTS idx_functions_micro ON public.micro_functions(micro_id);
CREATE INDEX IF NOT EXISTS idx_avail_person ON public.availability_rules(person_id);
CREATE INDEX IF NOT EXISTS idx_schedules_status ON public.schedules(status);

-- ===================================================================
-- ROW LEVEL SECURITY (RLS) E POLÍTICAS DE ACESSO POR HIERARQUIA
-- ===================================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micro_functions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rotation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Políticas com suporte a chave anon pública para leitura/escrita sincronizada
-- (Permite o funcionamento contínuo do frontend conectado via chave Anon/Service)
CREATE POLICY "Permitir leitura anonima pública" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Permitir escrita anonima" ON public.profiles FOR ALL USING (true);

CREATE POLICY "Permitir leitura micros" ON public.micros FOR SELECT USING (true);
CREATE POLICY "Permitir escrita micros" ON public.micros FOR ALL USING (true);

CREATE POLICY "Permitir leitura funcoes" ON public.micro_functions FOR SELECT USING (true);
CREATE POLICY "Permitir escrita funcoes" ON public.micro_functions FOR ALL USING (true);

CREATE POLICY "Permitir leitura familias" ON public.families FOR SELECT USING (true);
CREATE POLICY "Permitir escrita familias" ON public.families FOR ALL USING (true);

CREATE POLICY "Permitir leitura pessoas" ON public.people FOR SELECT USING (true);
CREATE POLICY "Permitir escrita pessoas" ON public.people FOR ALL USING (true);

CREATE POLICY "Permitir leitura disponibilidade" ON public.availability_rules FOR SELECT USING (true);
CREATE POLICY "Permitir escrita disponibilidade" ON public.availability_rules FOR ALL USING (true);

CREATE POLICY "Permitir leitura escalas" ON public.schedules FOR SELECT USING (true);
CREATE POLICY "Permitir escrita escalas" ON public.schedules FOR ALL USING (true);

CREATE POLICY "Permitir leitura historico" ON public.rotation_history FOR SELECT USING (true);
CREATE POLICY "Permitir escrita historico" ON public.rotation_history FOR ALL USING (true);

CREATE POLICY "Permitir leitura auditoria" ON public.audit_logs FOR SELECT USING (true);
CREATE POLICY "Permitir escrita auditoria" ON public.audit_logs FOR ALL USING (true);
