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
-- ROW LEVEL SECURITY (RLS)
-- ===================================================================
--
-- IMPORTANTE: o navegador do usuário NUNCA acessa o Supabase diretamente.
-- Toda a sincronização acontece no servidor Node (server.ts), autenticado,
-- usando a chave "service_role" (que ignora RLS por definição e NUNCA deve
-- ser exposta ao navegador — configure-a apenas em SUPABASE_SERVICE_ROLE_KEY
-- no ambiente do servidor).
--
-- Por isso, nenhuma política é criada para "anon"/"authenticated": com RLS
-- habilitado e nenhuma política permissiva, o acesso via chave anônima fica
-- bloqueado por padrão (negar por padrão) em todas as tabelas, incluindo
-- "profiles" (que guarda hashes de senha) e "people" (dados de crianças e
-- famílias). Se uma versão anterior deste schema já foi aplicada no seu
-- projeto, rode os comandos DROP POLICY abaixo para remover as políticas
-- antigas que liberavam leitura/escrita anônima total.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micro_functions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rotation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Remove as políticas antigas (era: "permitir tudo para qualquer um com a chave anon").
-- Seguro rodar mesmo se elas nunca existiram no seu projeto.
DROP POLICY IF EXISTS "Permitir leitura anonima pública" ON public.profiles;
DROP POLICY IF EXISTS "Permitir escrita anonima" ON public.profiles;
DROP POLICY IF EXISTS "Permitir leitura micros" ON public.micros;
DROP POLICY IF EXISTS "Permitir escrita micros" ON public.micros;
DROP POLICY IF EXISTS "Permitir leitura funcoes" ON public.micro_functions;
DROP POLICY IF EXISTS "Permitir escrita funcoes" ON public.micro_functions;
DROP POLICY IF EXISTS "Permitir leitura familias" ON public.families;
DROP POLICY IF EXISTS "Permitir escrita familias" ON public.families;
DROP POLICY IF EXISTS "Permitir leitura pessoas" ON public.people;
DROP POLICY IF EXISTS "Permitir escrita pessoas" ON public.people;
DROP POLICY IF EXISTS "Permitir leitura disponibilidade" ON public.availability_rules;
DROP POLICY IF EXISTS "Permitir escrita disponibilidade" ON public.availability_rules;
DROP POLICY IF EXISTS "Permitir leitura escalas" ON public.schedules;
DROP POLICY IF EXISTS "Permitir escrita escalas" ON public.schedules;
DROP POLICY IF EXISTS "Permitir leitura historico" ON public.rotation_history;
DROP POLICY IF EXISTS "Permitir escrita historico" ON public.rotation_history;
DROP POLICY IF EXISTS "Permitir leitura auditoria" ON public.audit_logs;
DROP POLICY IF EXISTS "Permitir escrita auditoria" ON public.audit_logs;

-- Nenhuma política é (re)criada de propósito: RLS habilitado + zero políticas
-- para anon/authenticated = acesso negado por padrão para o navegador.
-- O servidor (service_role) continua funcionando normalmente, pois esse papel
-- ignora RLS.
