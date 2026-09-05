-- ===================================================================
-- TRAVA DE EMERGÊNCIA DE RLS — projeto Supabase em produção
-- ===================================================================
-- Gerado a partir do resultado real da consulta de políticas do seu
-- projeto (18 políticas "PERMISSIVE ... {public} ... true" encontradas).
-- Isso remove TODAS as políticas que liberam acesso público e garante
-- RLS ligado em cada tabela. Depois disso, só o servidor (via chave
-- service_role, que ignora RLS) consegue ler/escrever — o navegador
-- não terá mais acesso direto nenhum a essas tabelas.
--
-- Seguro rodar mesmo se algum nome de política não existir (usa
-- "IF EXISTS" em tudo).
-- ===================================================================

-- 1) Remover todas as políticas públicas encontradas
DROP POLICY IF EXISTS "Acesso completo anon audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow all operations for anon" ON public.audit_logs;

DROP POLICY IF EXISTS "Acesso completo anon availability_rules" ON public.availability_rules;

DROP POLICY IF EXISTS "Acesso completo anon families" ON public.families;
DROP POLICY IF EXISTS "Allow all operations for anon" ON public.families;

DROP POLICY IF EXISTS "Allow all operations for anon" ON public.macro_teams;

DROP POLICY IF EXISTS "Acesso completo anon micro_functions" ON public.micro_functions;

DROP POLICY IF EXISTS "Allow all operations for anon" ON public.micro_teams;

DROP POLICY IF EXISTS "Acesso completo anon micros" ON public.micros;

DROP POLICY IF EXISTS "Acesso completo anon people" ON public.people;
DROP POLICY IF EXISTS "Allow all operations for anon" ON public.people;

DROP POLICY IF EXISTS "Acesso completo anon profiles" ON public.profiles;

DROP POLICY IF EXISTS "Acesso completo anon rotation_history" ON public.rotation_history;

DROP POLICY IF EXISTS "Acesso completo anon schedules" ON public.schedules;
DROP POLICY IF EXISTS "Allow all operations for anon" ON public.schedules;

DROP POLICY IF EXISTS "Allow all operations for anon" ON public.sync_metadata;

DROP POLICY IF EXISTS "Allow all operations for anon" ON public.users;

DROP POLICY IF EXISTS "Allow all operations for anon" ON public.volunteer_restrictions;

-- 2) Garantir RLS ligado em TODAS as tabelas (idempotente — não faz
--    nada se já estiver ligado). Sem nenhuma política, RLS ligado
--    significa "negar tudo por padrão" para anon/authenticated.
ALTER TABLE public.audit_logs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_rules     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.families               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.macro_teams            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micro_functions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micro_teams            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micros                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rotation_history       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_metadata          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_restrictions ENABLE ROW LEVEL SECURITY;

-- 3) Conferir que não sobrou nenhuma política pública.
-- Espera-se ZERO linhas depois de rodar o script acima.
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public';
