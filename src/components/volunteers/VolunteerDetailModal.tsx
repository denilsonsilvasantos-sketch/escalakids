import React, { useState } from 'react';
import {
  X,
  User,
  Calendar,
  Phone,
  Mail,
  Heart,
  Briefcase,
  Shield,
  Trash2,
  AlertTriangle,
  History
} from 'lucide-react';
import { Person, UserAccount } from '../../types';
import { storageService } from '../../services/storageService';
import { formatDateBR } from '../../utils/dateUtils';
import { AvailabilityRulesEditor } from './AvailabilityRulesEditor';

interface VolunteerDetailModalProps {
  person: Person | null;
  onClose: () => void;
  onEdit: (person: Person) => void;
  onDeleted?: () => void;
  currentUser?: UserAccount;
}

export const VolunteerDetailModal: React.FC<VolunteerDetailModalProps> = ({
  person,
  onClose,
  onEdit,
  onDeleted,
  currentUser
}) => {
  if (!person) return null;

  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  const micros = storageService.getMicros();
  const functions = storageService.getFunctions();
  const family = person.familyId ? storageService.getFamilyById(person.familyId) : null;
  const familyMembers = person.familyId ? storageService.getFamilyMembers(person.familyId) : [];
  const rotHistory = storageService.getRotationHistory().filter((h) => h.personId === person.id);

  const handleConfirmDeletePerson = () => {
    storageService.deletePerson(person.id);
    setIsConfirmDeleteOpen(false);
    onClose();
    onDeleted?.();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-rose-500 flex items-center justify-center text-white font-extrabold text-2xl shadow-md border-2 border-white/20 overflow-hidden shrink-0">
              {person.avatarUrl ? (
                <img src={person.avatarUrl} alt={person.name} className="w-full h-full object-cover" />
              ) : (
                person.name.charAt(0)
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold font-display">{person.name}</h2>
                {person.nickname && (
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium">
                    {person.nickname}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Nascimento: {formatDateBR(person.birthDate)} • Cadastro Único MEVAM Kids
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onEdit(person)}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-colors"
            >
              Editar Perfil
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
          {/* Personal Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center space-x-2 text-slate-700">
              <Phone className="w-4 h-4 text-slate-400" />
              <span>{person.phone}</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-700">
              <Mail className="w-4 h-4 text-slate-400" />
              <span className="truncate">{person.email || 'Não informado'}</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-700">
              <Heart className="w-4 h-4 text-rose-500" />
              <span>{family ? `${family.name} (${family.priority})` : 'Sem vínculo familiar'}</span>
            </div>
          </div>

          {/* Family Section */}
          {family && (
            <div className="bg-rose-50/60 border border-rose-200 p-4 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-900 uppercase tracking-wider flex items-center space-x-1.5">
                  <Heart className="w-4 h-4 text-rose-600 fill-rose-600" />
                  <span>Núcleo Familiar: {family.name}</span>
                </span>
                <span className="text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                  Prioridade de Escalar Juntos: {family.priority}
                </span>
              </div>
              <div className="text-xs text-rose-800">
                Outros membros da família:{' '}
                {familyMembers
                  .filter((m) => m.id !== person.id)
                  .map((m) => m.name)
                  .join(', ') || 'Apenas este membro cadastrado'}
              </div>
            </div>
          )}

          {/* Micros & Functions */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
              <Briefcase className="w-4 h-4 text-indigo-600" />
              <span>Micros e Funções Atribuídas</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {person.microIds.map((mId) => {
                const micro = micros.find((m) => m.id === mId);
                const prefs = person.functionPreferences.filter((fp) => fp.microId === mId);

                return (
                  <div key={mId} className="border border-slate-200 rounded-xl p-3.5 bg-white space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: micro?.color || '#4f46e5' }} />
                      <span className="font-bold text-xs text-slate-900">{micro?.name}</span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      {prefs.map((fp) => {
                        const fn = functions.find((f) => f.id === fp.functionId);
                        return (
                          <div key={fp.functionId} className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <div className="flex items-center justify-between font-semibold text-slate-800">
                              <span>{fn?.name}</span>
                              <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0.2 rounded">
                                {fp.experienceLevel}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-700 mt-1">
                              Turno: {fp.preferredShifts?.join(', ') || 'Qualquer'} • Dias:{' '}
                              {fp.preferredDays?.join(', ') || 'Domingo'}
                            </div>
                            {fp.preferredAgeGroups && fp.preferredAgeGroups.length > 0 && (
                              <div className="text-[10px] text-emerald-700 mt-0.5 font-medium">
                                Faixas: {fp.preferredAgeGroups.join(', ')}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Availability & Unavailability Calendar Rules */}
          <AvailabilityRulesEditor person={person} />

          {/* Serving History */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
              <History className="w-4 h-4 text-slate-600" />
              <span>Histórico de Escalas Realizadas</span>
            </h3>

            {rotHistory.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-700 bg-slate-50 rounded-xl">
                Ainda não constam participações arquivadas para este voluntário.
              </div>
            ) : (
              <div className="space-y-1.5 text-xs">
                {rotHistory.map((item) => {
                  const m = micros.find((micro) => micro.id === item.microId);
                  const fn = functions.find((f) => f.id === item.functionId);
                  return (
                    <div
                      key={item.id}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-slate-900">{item.date}</span>
                        <span className="text-slate-700 ml-2">
                          {m?.name} → {fn?.name}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-700">Concluído</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Danger Zone: Delete Volunteer */}
          {(!currentUser || currentUser.role === 'ADMIN_LIDERANCA') && (
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between bg-rose-50/50 p-4 rounded-xl border border-rose-100">
              <div>
                <h4 className="text-xs font-bold text-rose-900">Excluir Cadastro</h4>
                <p className="text-[11px] text-rose-700">
                  Remove permanentemente este voluntário e suas disponibilidades.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsConfirmDeleteOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Voluntário</span>
              </button>
            </div>
          )}
        </div>

        {/* In-App Delete Confirmation Dialog */}
        {isConfirmDeleteOpen && (
          <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Confirmar Exclusão de {person.name}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Esta ação removerá definitivamente o voluntário da base de dados do MEVAM Kids.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmDeleteOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeletePerson}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Confirmar Exclusão</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
