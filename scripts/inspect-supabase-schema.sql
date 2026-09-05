-- ===================================================================
-- INSPEÇÃO DO BANCO SUPABASE (somente leitura — não altera nada)
-- ===================================================================
-- Rode este script inteiro no SQL Editor do seu projeto Supabase
-- (https://supabase.com/dashboard/project/_/sql/new) e copie os
-- resultados de cada uma das 4 consultas abaixo para eu analisar.
--
-- Ele NÃO modifica nenhuma tabela, política ou dado — só consulta os
-- catálogos internos do Postgres para listar o que existe hoje.
-- ===================================================================


-- 1) TABELAS E COLUNAS
-- Lista toda tabela do schema "public" com suas colunas, tipos,
-- se aceita nulo e o valor padrão.
SELECT
  t.table_name,
  c.ordinal_position AS "#",
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default
FROM information_schema.tables t
JOIN information_schema.columns c
  ON c.table_schema = t.table_schema AND c.table_name = t.table_name
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name, c.ordinal_position;


-- 2) CHAVES PRIMÁRIAS E ESTRANGEIRAS
-- Mostra os relacionamentos entre tabelas (FKs) e qual coluna é PK.
SELECT
  tc.table_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name  AS references_table,
  ccu.column_name AS references_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
WHERE tc.table_schema = 'public'
  AND tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY')
ORDER BY tc.table_name, tc.constraint_type;


-- 3) ROW LEVEL SECURITY: está habilitado em cada tabela?
-- "rls_enabled" precisa ser TRUE em todas as tabelas listadas.
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
ORDER BY c.relname;


-- 4) POLÍTICAS DE RLS EXISTENTES
-- O ponto mais importante: isso mostra se ainda existe alguma política
-- antiga liberando leitura/escrita para "anon" ou "public" com "true".
-- O esperado, após o script de segurança, é essa consulta retornar
-- ZERO linhas (nenhuma política = acesso negado por padrão via chave anônima).
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd AS command,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
