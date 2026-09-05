import React, { useState, useEffect } from 'react';
import { CalendarOff, Search, Phone } from 'lucide-react';
import { Person, UserAccount } from '../../types';
import { storageService } from '../../services/storageService';
import { AvailabilityRulesEditor } from './AvailabilityRulesEditor';

interface AvailabilityManagementViewProps {
  currentUser: UserAccount;
}

// Dedicated page (as opposed to the availability section buried inside each
// volunteer's detail modal) so a leader can quickly pick any volunteer and
// register the days/shifts they can't serve, without navigating the full
// volunteer list first.
export const AvailabilityManagementView: React.FC<AvailabilityManagementViewProps> = ({ currentUser }) => {
  const [people, setPeople] = useState<Person[]>(storageService.getPeople());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');

  useEffect(() => {
    const handleSync = () => setPeople(storageService.getPeople());
    window.addEventListener('mevam_data_synced', handleSync);
    return () => window.removeEventListener('mevam_data_synced', handleSync);
  }, []);

  // Same RBAC scoping used by the main volunteer list: a micro leader only
  // manages their own frente's people, a macro leader only their allowed frentes.
  const visiblePeople = people.filter((p) => {
    if (!p.active) return false;
    if (currentUser.role === 'LIDER_MICRO' && currentUser.primaryMicroId) {
      if (!p.microIds.includes(currentUser.primaryMicroId)) return false;
    }
    if (currentUser.role === 'LIDER_MACRO' && currentUser.allowedMicroIds) {
      const hasAllowed = p.microIds.some((mId) => currentUser.allowedMicroIds!.includes(mId));
      if (!hasAllowed) return false;
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      return p.name.toLowerCase().includes(term) || (p.nickname && p.nickname.toLowerCase().includes(term));
    }
    return true;
  });

  const selectedPerson = people.find((p) => p.id === selectedPersonId) || null;
  const micros = storageService.getMicros();

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex items-center space-x-2.5 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
          <CalendarOff className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 font-display tracking-tight">
            Indisponibilidade dos Voluntários
          </h1>
          <p className="text-xs text-slate-700">
            Selecione um voluntário e registre as datas ou dias fixos em que ele não poderá servir.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Volunteer Selector Column */}
        <div className="lg:col-span-4 space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome ou apelido..."
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-0.5">
            {visiblePeople.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-600 bg-white rounded-xl border border-slate-200">
                Nenhum voluntário encontrado.
              </div>
            ) : (
              visiblePeople.map((p) => {
                const isSelected = selectedPersonId === p.id;
                const rulesCount = storageService.getPersonAvailabilities(p.id).length;
                const microNames = p.microIds
                  .map((mId) => micros.find((m) => m.id === mId)?.name)
                  .filter(Boolean) as string[];

                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPersonId(p.id)}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">
                        {p.name}
                        {p.nickname && <span className="font-normal text-slate-500"> ({p.nickname})</span>}
                      </span>
                      {rulesCount > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 shrink-0">
                          {rulesCount} regra{rulesCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    {microNames.length > 0 && (
                      <div className="text-[11px] text-slate-600 mt-0.5 truncate">{microNames.join(', ')}</div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Volunteer's Availability Editor */}
        <div className="lg:col-span-8">
          {selectedPerson ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
              <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-500 to-rose-500 flex items-center justify-center text-white font-extrabold text-lg shrink-0">
                  {selectedPerson.name.charAt(0)}
                </div>
                <div>
                  <div className="font-extrabold text-slate-900 text-sm font-display">
                    {selectedPerson.name}
                    {selectedPerson.nickname && (
                      <span className="text-slate-500 font-normal"> ({selectedPerson.nickname})</span>
                    )}
                  </div>
                  {(selectedPerson.whatsapp || selectedPerson.phone) && (
                    <div className="text-[11px] text-slate-600 flex items-center space-x-1 mt-0.5">
                      <Phone className="w-3 h-3" />
                      <span>{selectedPerson.whatsapp || selectedPerson.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <AvailabilityRulesEditor person={selectedPerson} />
            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
              <CalendarOff className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-xs text-slate-600">
                Selecione um voluntário na lista ao lado para ver ou registrar indisponibilidades.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
