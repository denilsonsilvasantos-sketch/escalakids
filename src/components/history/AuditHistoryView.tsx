import React, { useState } from 'react';
import {
  History,
  Shield,
  Search,
  Calendar,
  User,
  Filter,
  RefreshCw
} from 'lucide-react';
import { AuditLog, UserAccount } from '../../types';
import { storageService } from '../../services/storageService';

interface AuditHistoryViewProps {
  currentUser: UserAccount;
}

export const AuditHistoryView: React.FC<AuditHistoryViewProps> = ({ currentUser }) => {
  const [logs, setLogs] = useState<AuditLog[]>(storageService.getAuditLogs());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  const filteredLogs = logs.filter((log) => {
    if (filterType !== 'ALL' && log.targetType !== filterType) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      return (
        log.action.toLowerCase().includes(term) ||
        log.details.toLowerCase().includes(term) ||
        log.userName.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const getBadgeForType = (type: AuditLog['targetType']) => {
    switch (type) {
      case 'SCHEDULE':
        return { label: 'Escala', bg: 'bg-indigo-100 text-indigo-800' };
      case 'PERSON':
        return { label: 'Voluntário', bg: 'bg-emerald-100 text-emerald-800' };
      case 'MICRO':
        return { label: 'Micro', bg: 'bg-purple-100 text-purple-800' };
      case 'FAMILY':
        return { label: 'Família', bg: 'bg-rose-100 text-rose-800' };
      case 'FUNCTION':
        return { label: 'Função', bg: 'bg-amber-100 text-amber-800' };
      default:
        return { label: 'Sistema', bg: 'bg-slate-100 text-slate-700' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 font-display tracking-tight">
                Auditoria & Histórico de Operações
              </h1>
              <p className="text-xs text-slate-700">
                Rastreabilidade completa de todas as alterações realizadas por líderes autorizados
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setLogs(storageService.getAuditLogs())}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Atualizar Logs</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por usuário, ação ou detalhe..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
        </div>

        <div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          >
            <option value="ALL">Todas as Categorias de Auditoria</option>
            <option value="SCHEDULE">Alterações em Escalas</option>
            <option value="PERSON">Cadastros de Voluntários</option>
            <option value="FAMILY">Vínculos Familiares</option>
            <option value="MICRO">Micros & Frentes</option>
            <option value="FUNCTION">Funções & Vagas</option>
            <option value="SYSTEM">Sistema & Sessão</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <th className="py-3 px-4">Data / Hora</th>
                <th className="py-3 px-4">Responsável</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4">Ação</th>
                <th className="py-3 px-4">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-700">
                    Nenhum registro de auditoria encontrado.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const badge = getBadgeForType(log.targetType);
                  const dateStr = new Date(log.timestamp).toLocaleString('pt-BR');

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-700 text-[11px] whitespace-nowrap">
                        {dateStr}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{log.userName}</div>
                        <div className="text-[10px] text-slate-700">{log.userRole}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {log.action}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-md">
                        {log.details}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
