-- ==============================================================================
-- SISTEMA MEVAM KIDS - ESQUEMA COMPLETO DO BANCO DE DADOS SUPABASE (POSTGRESQL)
-- Versão: 2.0 • Suporte a Hierarquia de Acesso & Autenticação
--
-- Instruções de Execução:
-- 1. Abra o painel do seu projeto no Supabase (https://supabase.com/dashboard)
-- 2. Navegue até "SQL Editor" no menu lateral esquerdo
-- 3. Clique em "+ New Query", cole todo o conteúdo deste arquivo e clique em "Run" (Executar)
-- ==============================================================================

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- TABELA: public.profiles (Usuários, Credenciais e Hierarquia de Acesso)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT UNIQUE,
  email TEXT,
  password TEXT NOT NULL DEFAULT '123',
  role TEXT NOT NULL DEFAULT 'VOLUNTARIO' CHECK (role IN (
    'ADMIN_LIDERANCA',
    'LIDER_MACRO',
    'LIDER_MICRO',
    'COORDENADOR',
    'VOLUNTARIO',
    'OBSERVADOR'
  )),
  avatar TEXT,
  allowed_micro_ids JSONB DEFAULT '[]'::jsonb,
  primary_micro_id TEXT,
  person_id TEXT,
  whatsapp TEXT,
  created_by TEXT,
  created_by_name TEXT,
  must_change_password BOOLEAN DEFAULT FALSE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- TABELA: public.micros (Frentes / Departamentos de Atuação do MEVAM Kids)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.micros (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  leader_name TEXT,
  leader_id TEXT,
  status TEXT NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'INATIVO', 'CONFIGURANDO')),
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

-- ==============================================================================
-- TABELA: public.micro_functions (Funções específicas dentro de cada Micro)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.micro_functions (
  id TEXT PRIMARY KEY,
  micro_id TEXT NOT NULL REFERENCES public.micros(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  criteria JSONB DEFAULT '{
    "requiresExperience": false,
    "genderPreference": "QUALQUER",
    "minAge": 14,
    "maxConsecutiveScales": 2,
    "idealScaleIntervalDays": 14
  }'::jsonb,
  default_required_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- TABELA: public.families (Núcleos Familiares para Escala Casada/Unificada)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.families (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'ALTA' CHECK (priority IN ('MUITO_ALTA', 'ALTA', 'MEDIA', 'BAIXA', 'DESATIVADA')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- TABELA: public.people (Voluntários Únicos do MEVAM Kids)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.people (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  nickname TEXT,
  birth_date TEXT NOT NULL,
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

-- ==============================================================================
-- TABELA: public.availability_rules (Regras de Disponibilidade & Bloqueio)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.availability_rules (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('DIA_SEMANA_RECORRENTE', 'DATA_ESPECIFICA', 'TURNO_ESPECIFICO')),
  day_of_week INTEGER,
  shift TEXT,
  specific_date TEXT,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- TABELA: public.schedules (Escalas de Culto e Eventos)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.schedules (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  event_id TEXT,
  event_name TEXT NOT NULL,
  period TEXT,
  shift TEXT NOT NULL DEFAULT 'NOITE' CHECK (shift IN ('MANHA', 'NOITE', 'AMBOS', 'ESPECIAL')),
  dates JSONB NOT NULL DEFAULT '[]'::jsonb,
  micro_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'RASCUNHO' CHECK (status IN ('RASCUNHO', 'EM_REVISAO', 'CONFIRMADA', 'PUBLICADA', 'CANCELADA')),
  created_by TEXT,
  updated_by TEXT,
  quality_metrics JSONB DEFAULT '{
    "totalSlots": 0,
    "filledSlots": 0,
    "emptySlots": 0,
    "satisfactionScore": 100,
    "conflictsCount": 0
  }'::jsonb,
  slots JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- TABELA: public.rotation_history (Histórico de Alocação de Voluntários)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.rotation_history (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL,
  person_name TEXT NOT NULL,
  micro_id TEXT NOT NULL,
  micro_name TEXT NOT NULL,
  function_id TEXT NOT NULL,
  function_name TEXT NOT NULL,
  date TEXT NOT NULL,
  shift TEXT NOT NULL,
  schedule_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- TABELA: public.audit_logs (Trilha de Auditoria e Segurança)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  user_id TEXT,
  user_name TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ÍNDICES DE PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_micro_functions_micro ON public.micro_functions(micro_id);
CREATE INDEX IF NOT EXISTS idx_people_family ON public.people(family_id);
CREATE INDEX IF NOT EXISTS idx_people_active ON public.people(active);
CREATE INDEX IF NOT EXISTS idx_availability_person ON public.availability_rules(person_id);
CREATE INDEX IF NOT EXISTS idx_schedules_status ON public.schedules(status);
CREATE INDEX IF NOT EXISTS idx_rotation_history_person ON public.rotation_history(person_id);
CREATE INDEX IF NOT EXISTS idx_rotation_history_date ON public.rotation_history(date);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micro_functions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rotation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso Público Sincronizado para Aplicação Web
CREATE POLICY "Permitir leitura para todos" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Permitir insercao/atualizacao de perfis" ON public.profiles FOR ALL USING (true);

CREATE POLICY "Permitir gerenciamento de micros" ON public.micros FOR ALL USING (true);
CREATE POLICY "Permitir gerenciamento de funcoes" ON public.micro_functions FOR ALL USING (true);
CREATE POLICY "Permitir gerenciamento de familias" ON public.families FOR ALL USING (true);
CREATE POLICY "Permitir gerenciamento de pessoas" ON public.people FOR ALL USING (true);
CREATE POLICY "Permitir gerenciamento de disponibilidade" ON public.availability_rules FOR ALL USING (true);
CREATE POLICY "Permitir gerenciamento de escalas" ON public.schedules FOR ALL USING (true);
CREATE POLICY "Permitir leitura de historico" ON public.rotation_history FOR ALL USING (true);
CREATE POLICY "Permitir auditoria" ON public.audit_logs FOR ALL USING (true);

-- ==============================================================================
-- DADOS INICIAIS (SEED DATA) COM ADMIN (SENHA: ADMIN) E LÍDERES
-- ==============================================================================

-- 1. Inserir Usuário ADMIN Principal (Senha: ADMIN) e Líderes Iniciais
INSERT INTO public.profiles (id, name, username, email, password, role, avatar, allowed_micro_ids, primary_micro_id, person_id, whatsapp, created_by, created_by_name)
VALUES
  (
    'user-admin',
    'Denilson Santos',
    'admin',
    'denilson.silva.santos@gmail.com',
    'ADMIN',
    'ADMIN_LIDERANCA',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    '["micro-lideranca", "micro-louvor", "micro-professor", "micro-acolhimento", "micro-refeitorio", "micro-seguranca", "micro-teatro"]'::jsonb,
    NULL,
    'p-denilson',
    '47998871122',
    NULL,
    'Sistema MEVAM Kids'
  ),
  (
    'user-macro-joao',
    'João Silva',
    'joao',
    'joao.silva@mevamkids.org',
    '123',
    'LIDER_MACRO',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    '["micro-louvor", "micro-teatro", "micro-refeitorio", "micro-seguranca"]'::jsonb,
    NULL,
    NULL,
    '47997762233',
    'user-admin',
    'Denilson Santos (ADMIN)'
  ),
  (
    'user-micro-louvor',
    'Denilson Louvor',
    'denilson',
    'louvor@mevamkids.org',
    '123',
    'LIDER_MICRO',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    '[]'::jsonb,
    'micro-louvor',
    'p-denilson',
    '47998871122',
    'user-macro-joao',
    'João Silva (Líder Macro)'
  ),
  (
    'user-micro-prof',
    'Roberta Lima',
    'roberta',
    'professores@mevamkids.org',
    '123',
    'LIDER_MICRO',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    '[]'::jsonb,
    'micro-professor',
    'p-roberta',
    '47991122334',
    'user-admin',
    'Denilson Santos (ADMIN)'
  ),
  (
    'user-vol-lucas',
    'Lucas Oliveira',
    'lucas',
    'lucas.oliveira@mevamkids.org',
    '123',
    'VOLUNTARIO',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    '[]'::jsonb,
    NULL,
    'p-lucas',
    '47993344556',
    'user-micro-louvor',
    'Denilson Louvor'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  username = EXCLUDED.username,
  password = EXCLUDED.password,
  role = EXCLUDED.role,
  allowed_micro_ids = EXCLUDED.allowed_micro_ids,
  primary_micro_id = EXCLUDED.primary_micro_id;

-- 2. Inserir Micros / Frentes Padrão
INSERT INTO public.micros (id, name, description, leader_name, leader_id, status, color, icon_name)
VALUES
  ('micro-lideranca', 'Liderança & Coordenação', 'Coordenação geral, acolhimento de famílias e suporte às frentes.', 'Pr. Denilson Santos', 'user-admin', 'ATIVO', '#6366F1', 'Crown'),
  ('micro-louvor', 'Louvor Kids', 'Equipe responsável pela ministração do louvor e adoração no MEVAM Kids.', 'Denilson Louvor', 'user-micro-louvor', 'ATIVO', '#EC4899', 'Music'),
  ('micro-professor', 'Professores & Salas', 'Ensino bíblico ministrado por faixas etárias nas salinhas temáticas.', 'Roberta Lima', 'user-micro-prof', 'ATIVO', '#3B82F6', 'BookOpen'),
  ('micro-acolhimento', 'Acolhimento & Recepção', 'Primeiro contato com pais e crianças, check-in, crachás e recepção.', 'Mariana Souza', 'user-macro-joao', 'ATIVO', '#10B981', 'HeartHandshake'),
  ('micro-refeitorio', 'Refeitório & Lanche', 'Preparo e distribuição do lanche e hidratação das crianças.', 'Carla Mendes', 'user-macro-joao', 'ATIVO', '#F59E0B', 'Utensils'),
  ('micro-seguranca', 'Segurança & Apoio', 'Monitoramento dos corredores, controle de acesso e segurança das crianças.', 'Marcos Rocha', 'user-macro-joao', 'ATIVO', '#8B5CF6', 'ShieldCheck'),
  ('micro-teatro', 'Teatro & Expressão', 'Artes cênicas, fantoches e dinâmicas criativas das lições bíblicas.', 'Juliana Rios', 'user-macro-joao', 'ATIVO', '#14B8A6', 'Sparkles')
ON CONFLICT (id) DO NOTHING;

-- FIM DO SCRIPT
