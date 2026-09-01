import React, { useState } from 'react';
import {
  Cake,
  Calendar,
  MessageCircle,
  Phone,
  Copy,
  Check,
  Search,
  Sparkles,
  Gift,
  Clock
} from 'lucide-react';
import { BirthdayNotification, UserAccount } from '../../types';
import { storageService } from '../../services/storageService';
import { formatDateBR } from '../../utils/dateUtils';

interface BirthdayTrackerProps {
  currentUser: UserAccount;
}

export const BirthdayTracker: React.FC<BirthdayTrackerProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'ALL' | 'HOJE' | 'AMANHA' | 'PROXIMOS_7' | 'ESTE_MES'>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const birthdays = storageService.calculateBirthdays();

  const filtered = birthdays.filter((b) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'HOJE') return b.category === 'HOJE';
    if (activeTab === 'AMANHA') return b.category === 'AMANHA';
    if (activeTab === 'PROXIMOS_7') return b.category === 'HOJE' || b.category === 'AMANHA' || b.category === 'PROXIMOS_7';
    if (activeTab === 'ESTE_MES') return b.category === 'ESTE_MES' || b.category === 'HOJE' || b.category === 'AMANHA' || b.category === 'PROXIMOS_7';
    return true;
  });

  const getGreetingMessage = (b: BirthdayNotification) => {
    return `Olá ${b.personName}! 🎉 Parabéns pelo seu aniversário hoje! Que Deus abençoe ricamente a sua vida e seu ministério precioso no MEVAM Kids. Somos muito gratos por ter você servindo conosco! 🎂✨`;
  };

  const handleCopyMessage = (b: BirthdayNotification) => {
    const text = getGreetingMessage(b);
    navigator.clipboard.writeText(text);
    setCopiedId(b.personId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleOpenWhatsApp = (b: BirthdayNotification) => {
    const phone = b.whatsapp?.replace(/\D/g, '') || b.phone?.replace(/\D/g, '');
    if (!phone) {
      alert('Telefone/WhatsApp não informado para este voluntário.');
      return;
    }
    const msg = encodeURIComponent(getGreetingMessage(b));
    window.open(`https://wa.me/55${phone}?text=${msg}`, '_blank');
  };

  const getCategoryBadge = (cat: BirthdayNotification['category']) => {
    switch (cat) {
      case 'HOJE':
        return { label: '🎉 É HOJE!', bg: 'bg-rose-500 text-white animate-pulse' };
      case 'AMANHA':
        return { label: 'Amanhã', bg: 'bg-amber-500 text-white' };
      case 'PROXIMOS_7':
        return { label: 'Próximos 7 dias', bg: 'bg-indigo-100 text-indigo-800' };
      case 'ESTE_MES':
        return { label: 'Este mês', bg: 'bg-slate-100 text-slate-700' };
      default:
        return { label: 'Em breve', bg: 'bg-slate-100 text-slate-500' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
              <Cake className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 font-display tracking-tight">
                Aniversariantes do MEVAM Kids
              </h1>
              <p className="text-xs text-slate-700">
                Acompanhamento contínuo e mensagens personalizadas de carinho e gratidão
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { id: 'ALL', label: 'Todos os Próximos' },
          { id: 'HOJE', label: '🎉 Hoje' },
          { id: 'AMANHA', label: 'Amanhã' },
          { id: 'PROXIMOS_7', label: 'Próximos 7 Dias' },
          { id: 'ESTE_MES', label: 'Este Mês' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Birthday Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-700 bg-white rounded-2xl border border-slate-200">
            Nenhum aniversariante encontrado neste período.
          </div>
        ) : (
          filtered.map((b) => {
            const badge = getCategoryBadge(b.category);
            const isToday = b.category === 'HOJE';

            return (
              <div
                key={b.personId}
                className={`bg-white rounded-2xl border p-5 space-y-4 shadow-xs transition-all ${
                  isToday
                    ? 'border-2 border-rose-500 ring-4 ring-rose-50 shadow-md'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center font-extrabold text-base ${
                        isToday
                          ? 'bg-rose-500 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {b.personName.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{b.personName}</h3>
                      <div className="flex items-center space-x-1.5 text-slate-700 text-xs mt-0.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatDateBR(b.birthDate)}</span>
                        {b.ageTurning && (
                          <span className="font-semibold text-blue-600">({b.ageTurning} anos)</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.bg}`}>
                    {badge.label}
                  </span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                  <span className="text-slate-700 text-[11px] block">Atuação no MEVAM Kids:</span>
                  <span className="font-semibold text-slate-800">
                    {b.micros.join(', ') || 'Voluntário Geral'}
                  </span>
                </div>

                {/* Actions: Send WhatsApp & Copy Greeting */}
                <div className="flex items-center space-x-2 pt-1">
                  <button
                    onClick={() => handleOpenWhatsApp(b)}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center justify-center space-x-1.5"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    onClick={() => handleCopyMessage(b)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center space-x-1"
                    title="Copiar mensagem personalizada"
                  >
                    {copiedId === b.personId ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
