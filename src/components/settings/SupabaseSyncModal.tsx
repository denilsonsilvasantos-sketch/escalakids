import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  CloudOff,
  Database,
  ShieldCheck,
  Users,
  Calendar,
  Layers,
  HeartHandshake
} from 'lucide-react';
import { supabaseService } from '../../services/supabaseService';
import { storageService } from '../../services/storageService';
import { UserAccount, SupabaseSyncState } from '../../types';

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
  const [isExporting, setIsExporting] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Live counts
  const peopleCount = storageService.getPeople().length;
  const schedulesCount = storageService.getSchedules().length;
  const familiesCount = storageService.getFamilies().length;
  const microsCount = storageService.getMicros().length;

  useEffect(() => {
    const unsub = supabaseService.subscribe((state) => {
      setSyncState(state);
    });
    return unsub;
  }, []);

  if (!isOpen || currentUser.role !== 'ADMIN_LIDERANCA') return null;

  const handleExportAll = async () => {
    setIsExporting(true);
    setStatusMessage({ type: 'info', text: 'Enviando todos os dados de voluntários, micros e escalas para o Supabase...' });
    const fullData = storageService.getAllDataForExport();
    const result = await supabaseService.exportAllToSupabase(fullData);
    setIsExporting(false);
    if (result.success) {
      setStatusMessage({ type: 'success', text: 'Todos os dados foram sincronizados com sucesso na Nuvem MEVAM Kids!' });
    } else {
      setStatusMessage({ type: 'error', text: result.message + (result.details ? `: ${result.details}` : '') });
    }
  };

  const handlePullRemote = async () => {
    setIsPulling(true);
    setStatusMessage({ type: 'info', text: 'Buscando dados atualizados da Nuvem...' });
    const success = await storageService.syncWithSupabaseRemote();
    setIsPulling(false);
    if (success) {
      setStatusMessage({ type: 'success', text: 'Dados atualizados da nuvem carregados com sucesso!' });
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      setStatusMessage({ type: 'error', text: 'Falha ao buscar dados da nuvem. Verifique a conexão com a internet.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-base text-white">Sincronização em Nuvem (MEVAM Kids)</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-950/80 text-emerald-300 border-emerald-700 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Nuvem Ativa</span>
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Todos os dados estão integrados e operando diretamente na nuvem
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

          {/* Cloud Health Card */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Estado da Integração em Nuvem</span>
              </span>
              <span className="text-[11px] text-emerald-400 font-semibold flex items-center space-x-1">
                <Check className="w-3.5 h-3.5" />
                <span>100% Configurado</span>
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              O banco de dados central do MEVAM Kids já está totalmente operacional. Qualquer novo voluntário, líder, escala ou disponibilidade criada neste ou em outros aparelhos é transmitida em tempo real.
            </p>

            {/* Entity badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 flex items-center space-x-2.5">
                <Users className="w-4 h-4 text-blue-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">Voluntários</div>
                  <div className="text-sm font-bold text-white">{peopleCount}</div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 flex items-center space-x-2.5">
                <Calendar className="w-4 h-4 text-purple-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">Escalas</div>
                  <div className="text-sm font-bold text-white">{schedulesCount}</div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 flex items-center space-x-2.5">
                <Layers className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">Frentes/Micros</div>
                  <div className="text-sm font-bold text-white">{microsCount}</div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 flex items-center space-x-2.5">
                <HeartHandshake className="w-4 h-4 text-rose-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">Famílias</div>
                  <div className="text-sm font-bold text-white">{familiesCount}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Manual Actions */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
              <RefreshCw className="w-4 h-4 text-blue-400" />
              <span>Sincronização Manual Imediata</span>
            </span>

            <p className="text-xs text-slate-400">
              O sistema salva automaticamente tudo em segundo plano, mas você também pode forçar a sincronização a qualquer momento:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                onClick={handleExportAll}
                disabled={isExporting}
                className="p-3.5 bg-slate-800/90 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/50 rounded-xl flex items-center space-x-3 text-left transition-all group active:scale-[0.98]"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-700/60 text-emerald-400 flex items-center justify-center shrink-0">
                  <UploadCloud className={`w-4 h-4 ${isExporting ? 'animate-bounce' : 'group-hover:scale-110 transition-transform'}`} />
                </div>
                <div>
                  <div className="font-bold text-xs text-white">Enviar Todos os Dados</div>
                  <div className="text-[11px] text-slate-400">Salva todos os registros deste aparelho na nuvem</div>
                </div>
              </button>

              <button
                onClick={handlePullRemote}
                disabled={isPulling}
                className="p-3.5 bg-slate-800/90 hover:bg-slate-800 border border-slate-700 hover:border-blue-500/50 rounded-xl flex items-center space-x-3 text-left transition-all group active:scale-[0.98]"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-950 border border-blue-700/60 text-blue-400 flex items-center justify-center shrink-0">
                  <DownloadCloud className={`w-4 h-4 ${isPulling ? 'animate-bounce' : 'group-hover:scale-110 transition-transform'}`} />
                </div>
                <div>
                  <div className="font-bold text-xs text-white">Atualizar da Nuvem</div>
                  <div className="text-[11px] text-slate-400">Puxa alterações feitas em outros aparelhos</div>
                </div>
              </button>
            </div>
          </div>

          {/* Multi-Device Guarantee */}
          <div className="bg-emerald-950/30 border border-emerald-800/50 rounded-xl p-4 space-y-2">
            <div className="flex items-center space-x-2 text-emerald-300 font-semibold text-xs">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Sem necessidade de scripts ou configurações manuais</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              O MEVAM Kids gerencia a persistência automaticamente. Ao abrir o aplicativo em qualquer celular, tablet ou computador, basta fazer login com seu usuário de líder e todos os voluntários, escalas e frentes estarão imediatamente disponíveis.
            </p>
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
