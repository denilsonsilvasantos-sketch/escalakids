import React, { useState, useEffect } from 'react';
import {
  Database,
  Cloud,
  CloudCheck,
  CloudOff,
  RefreshCw,
  Copy,
  Check,
  UploadCloud,
  DownloadCloud,
  ExternalLink,
  ShieldCheck,
  Key,
  Layers,
  Sparkles,
  X
} from 'lucide-react';
import { supabaseService } from '../../services/supabaseService';
import { storageService } from '../../services/storageService';
import {
  setCustomSupabaseConfig,
  SUPABASE_URL,
  SUPABASE_ANON_KEY
} from '../../services/supabaseClient';
import { SupabaseSyncState, UserAccount } from '../../types';

interface SupabaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
}

export const SupabaseSyncModal: React.FC<SupabaseSyncModalProps> = ({
  isOpen,
  onClose,
  currentUser
}) => {
  const [syncState, setSyncState] = useState<SupabaseSyncState>(supabaseService.getSyncState());
  const [urlInput, setUrlInput] = useState<string>(SUPABASE_URL || '');
  const [keyInput, setKeyInput] = useState<string>(SUPABASE_ANON_KEY || '');
  const [copiedSql, setCopiedSql] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    const unsub = supabaseService.subscribe((state) => {
      setSyncState(state);
    });
    return unsub;
  }, []);

  if (!isOpen || currentUser.role !== 'ADMIN_LIDERANCA') return null;

  const handleTestAndSave = async () => {
    setStatusMessage({ type: 'info', text: 'Testando conexão com o Supabase...' });
    setCustomSupabaseConfig(urlInput, keyInput);
    const result = await supabaseService.testConnection();
    if (result.success) {
      setStatusMessage({ type: 'success', text: 'Conexão estabelecida com sucesso com o Supabase Cloud!' });
    } else {
      setStatusMessage({ type: 'error', text: result.message });
    }
  };

  const handleExportAll = async () => {
    setIsExporting(true);
    setStatusMessage({ type: 'info', text: 'Enviando todos os dados de voluntários, micros e escalas para o Supabase...' });
    const fullData = storageService.getAllDataForExport();
    const result = await supabaseService.exportAllToSupabase(fullData);
    setIsExporting(false);
    if (result.success) {
      setStatusMessage({ type: 'success', text: 'Todos os dados foram salvos no Supabase com sucesso!' });
    } else {
      setStatusMessage({ type: 'error', text: result.message + (result.details ? `: ${result.details}` : '') });
    }
  };

  const handlePullRemote = async () => {
    setIsPulling(true);
    setStatusMessage({ type: 'info', text: 'Buscando dados atualizados do Supabase...' });
    const success = await storageService.syncWithSupabaseRemote();
    setIsPulling(false);
    if (success) {
      setStatusMessage({ type: 'success', text: 'Dados atualizados do Supabase carregados na sua sessão!' });
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      setStatusMessage({ type: 'error', text: 'Falha ao buscar dados do Supabase. Verifique a conexão e as tabelas.' });
    }
  };

  const sqlCode = `-- ==============================================================================
-- SISTEMA MEVAM KIDS - ESQUEMA COMPLETO DO BANCO DE DADOS SUPABASE (POSTGRESQL)
-- Versão: 2.0 • Suporte a Hierarquia de Acesso & Autenticação
--
-- Instruções de Execução:
-- 1. Abra o painel do seu projeto no Supabase (https://supabase.com/dashboard)
-- 2. Navegue até "SQL Editor" no menu lateral esquerdo
-- 3. Clique em "+ New Query", cole todo o conteúdo deste script e clique em "Run"
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABELA: public.profiles (Usuários, Credenciais e Hierarquia de Acesso)
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT UNIQUE,
  email TEXT,
  password TEXT NOT NULL DEFAULT '123',
  role TEXT NOT NULL DEFAULT 'VOLUNTARIO' CHECK (role IN (
    'ADMIN_LIDERANCA', 'LIDER_MACRO', 'LIDER_MICRO', 'COORDENADOR', 'VOLUNTARIO', 'OBSERVADOR'
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

-- 2. TABELA: public.micros (Frentes / Departamentos do MEVAM Kids)
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
    "availability": 100, "correctFunction": 100, "volunteerPreference": 80,
    "frequencyBalance": 90, "recency": 80, "rotation": 80, "family": 60, "experience": 50
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABELA: public.micro_functions (Funções específicas dentro de cada Micro)
CREATE TABLE IF NOT EXISTS public.micro_functions (
  id TEXT PRIMARY KEY,
  micro_id TEXT NOT NULL REFERENCES public.micros(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  criteria JSONB DEFAULT '{
    "requiresExperience": false, "genderPreference": "QUALQUER", "minAge": 14,
    "maxConsecutiveScales": 2, "idealScaleIntervalDays": 14
  }'::jsonb,
  default_required_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABELA: public.families (Núcleos Familiares para Escala Casada)
CREATE TABLE IF NOT EXISTS public.families (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'ALTA' CHECK (priority IN ('MUITO_ALTA', 'ALTA', 'MEDIA', 'BAIXA', 'DESATIVADA')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABELA: public.people (Voluntários Únicos do MEVAM Kids)
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

-- 6. TABELA: public.availability_rules (Disponibilidade & Bloqueios)
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

-- 7. TABELA: public.schedules (Escalas de Culto e Eventos)
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
  quality_metrics JSONB DEFAULT '{"totalSlots": 0, "filledSlots": 0, "emptySlots": 0, "satisfactionScore": 100, "conflictsCount": 0}'::jsonb,
  slots JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABELA: public.rotation_history (Histórico de Rotação)
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

-- 9. TABELA: public.audit_logs (Trilha de Auditoria)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  user_id TEXT,
  user_name TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_micro_functions_micro ON public.micro_functions(micro_id);
CREATE INDEX IF NOT EXISTS idx_people_family ON public.people(family_id);
CREATE INDEX IF NOT EXISTS idx_availability_person ON public.availability_rules(person_id);
CREATE INDEX IF NOT EXISTS idx_schedules_status ON public.schedules(status);

-- POLÍTICAS DE RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micro_functions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rotation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura para todos" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Permitir sincronizacao de perfis" ON public.profiles FOR ALL USING (true);
CREATE POLICY "Permitir gerenciamento de micros" ON public.micros FOR ALL USING (true);
CREATE POLICY "Permitir gerenciamento de funcoes" ON public.micro_functions FOR ALL USING (true);
CREATE POLICY "Permitir gerenciamento de familias" ON public.families FOR ALL USING (true);
CREATE POLICY "Permitir gerenciamento de pessoas" ON public.people FOR ALL USING (true);
CREATE POLICY "Permitir gerenciamento de disponibilidade" ON public.availability_rules FOR ALL USING (true);
CREATE POLICY "Permitir gerenciamento de escalas" ON public.schedules FOR ALL USING (true);
CREATE POLICY "Permitir leitura de historico" ON public.rotation_history FOR ALL USING (true);
CREATE POLICY "Permitir auditoria" ON public.audit_logs FOR ALL USING (true);

-- SEED DATA COM ADMIN MASTER (SENHA: ADMIN) E LÍDERES
INSERT INTO public.profiles (id, name, username, email, password, role, allowed_micro_ids)
VALUES
  ('user-admin', 'Denilson Santos', 'admin', 'denilson.silva.santos@gmail.com', 'ADMIN', 'ADMIN_LIDERANCA', '["micro-lideranca", "micro-louvor", "micro-professor", "micro-acolhimento", "micro-refeitorio", "micro-seguranca", "micro-teatro"]'::jsonb),
  ('user-macro-joao', 'João Silva', 'joao', 'joao.silva@mevamkids.org', '123', 'LIDER_MACRO', '["micro-louvor", "micro-teatro", "micro-refeitorio", "micro-seguranca"]'::jsonb),
  ('user-micro-louvor', 'Denilson Louvor', 'denilson', 'louvor@mevamkids.org', '123', 'LIDER_MICRO', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  username = EXCLUDED.username,
  password = EXCLUDED.password;`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleDownloadSql = () => {
    const blob = new Blob([sqlCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'supabase-schema.sql';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-base text-white">Nuvem Supabase & Deploy Vercel</h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    syncState.isConnected
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                      : 'bg-amber-950/80 text-amber-300 border-amber-700'
                  }`}
                >
                  {syncState.isConnected ? '● Conectado ao Supabase' : '○ Modo Local (Offline)'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Sincronização em tempo real de voluntários, escalas e controle de acesso por hierarquia
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm">
          {/* Status Message Notification */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-xl border flex items-start space-x-3 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/50 border-emerald-800 text-emerald-200'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-950/50 border-rose-800 text-rose-200'
                  : 'bg-blue-950/50 border-blue-800 text-blue-200'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {statusMessage.type === 'success' ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : statusMessage.type === 'error' ? (
                  <CloudOff className="w-4 h-4 text-rose-400" />
                ) : (
                  <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
                )}
              </div>
              <p className="text-xs font-medium">{statusMessage.text}</p>
            </div>
          )}

          {/* 1. Supabase Credentials Inputs */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                <Key className="w-4 h-4 text-blue-400" />
                <span>Credenciais da Nuvem Supabase</span>
              </span>
              <span className="text-[11px] text-slate-400">Settings &gt; API no painel do Supabase</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Project URL (VITE_SUPABASE_URL)
                </label>
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://xyzproject.supabase.co"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Anon / Public Key (VITE_SUPABASE_ANON_KEY)
                </label>
                <input
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6Ik..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400">
                Salvo localmente e compatível com variáveis de ambiente da Vercel.
              </span>
              <button
                onClick={handleTestAndSave}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition-all shadow-md active:scale-95"
              >
                Salvar & Conectar
              </button>
            </div>
          </div>

          {/* 2. Cloud Sync Actions */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
              <UploadCloud className="w-4 h-4 text-emerald-400" />
              <span>Ações de Sincronização em Nuvem</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                onClick={handleExportAll}
                disabled={isExporting}
                className="p-3.5 bg-slate-800/90 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/50 rounded-xl flex items-center space-x-3 text-left transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-700/60 text-emerald-400 flex items-center justify-center shrink-0">
                  <UploadCloud className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </div>
                <div>
                  <div className="font-bold text-xs text-white">Exportar Dados para o Supabase</div>
                  <div className="text-[11px] text-slate-400">Envia todos os voluntários e escalas locais para o banco</div>
                </div>
              </button>

              <button
                onClick={handlePullRemote}
                disabled={isPulling}
                className="p-3.5 bg-slate-800/90 hover:bg-slate-800 border border-slate-700 hover:border-blue-500/50 rounded-xl flex items-center space-x-3 text-left transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-950 border border-blue-700/60 text-blue-400 flex items-center justify-center shrink-0">
                  <DownloadCloud className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </div>
                <div>
                  <div className="font-bold text-xs text-white">Carregar Dados do Supabase</div>
                  <div className="text-[11px] text-slate-400">Puxa o banco remoto mais recente para o navegador</div>
                </div>
              </button>
            </div>
          </div>

          {/* 3. SQL Schema Script */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                <Database className="w-4 h-4 text-purple-400" />
                <span>Script SQL Completo (PostgreSQL Supabase)</span>
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleDownloadSql}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-all"
                  title="Baixar arquivo supabase-schema.sql"
                >
                  <DownloadCloud className="w-3.5 h-3.5 text-blue-400" />
                  <span>Baixar .SQL</span>
                </button>
                <button
                  onClick={handleCopySql}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-purple-950 border border-purple-800 text-purple-300 hover:bg-purple-900 rounded-lg text-xs font-semibold transition-all shadow-sm"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'Copiado!' : 'Copiar Script SQL'}</span>
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Copie este script e execute no <strong>SQL Editor</strong> do painel Supabase para criar automaticamente todas as tabelas (<code className="text-purple-300">profiles</code>, <code className="text-purple-300">micros</code>, <code className="text-purple-300">micro_functions</code>, <code className="text-purple-300">families</code>, <code className="text-purple-300">people</code>, <code className="text-purple-300">availability_rules</code>, <code className="text-purple-300">schedules</code>), índices, políticas RLS e os usuários iniciais com o <strong className="text-amber-400 font-mono">ADMIN</strong>.
            </p>
            <div className="max-h-44 overflow-y-auto bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300">
              <pre className="whitespace-pre">{sqlCode}</pre>
            </div>
          </div>

          {/* 4. Vercel & Hierarchy Deployment Checklist */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2.5">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Hierarquia de Acesso & Deploy na Vercel</span>
            </span>

            <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
              <li>
                <strong>Liderança Principal (Admin):</strong> Visão total de todas as escalas, todas as frentes/micros, todos os voluntários e configuração do banco.
              </li>
              <li>
                <strong>Líderes de Micro/Frente:</strong> Acesso focado aos voluntários e vagas de sua própria área (ex.: Louvor, Recepção, Professores).
              </li>
              <li>
                <strong>Voluntários:</strong> Acesso às suas próprias datas escaladas, confirmação de presença e gestão da sua própria disponibilidade.
              </li>
              <li>
                <strong>Vercel Deployment:</strong> Adicione as variáveis <code className="text-emerald-400">VITE_SUPABASE_URL</code> e <code className="text-emerald-400">VITE_SUPABASE_ANON_KEY</code> nas configurações de projeto na Vercel para sincronização instantânea em produção.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-medium">
            MEVAM Kids • Gestão Unificada de Escalas & Voluntários
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
