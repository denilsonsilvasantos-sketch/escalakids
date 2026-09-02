import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  PlusCircle,
  Eye,
  Edit,
  Trash2,
  Calendar,
  Heart,
  Briefcase,
  AlertCircle,
  AlertTriangle,
  Phone,
  MessageSquare,
  X,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { Person, Micro, MicroFunction, Family, UserAccount } from '../../types';
import { storageService } from '../../services/storageService';
import { formatDateBR } from '../../utils/dateUtils';

interface VolunteerListProps {
  currentUser: UserAccount;
  onOpenWizard: (person?: Person) => void;
  onViewDetail: (person: Person) => void;
  onPersonDeleted?: () => void;
}

export const VolunteerList: React.FC<VolunteerListProps> = ({
  currentUser,
  onOpenWizard,
  onViewDetail,
  onPersonDeleted
}) => {
  const [people, setPeople] = useState<Person[]>(() => storageService.getPeople());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMicroFilter, setSelectedMicroFilter] = useState<string>('ALL');
  const [selectedFamilyFilter, setSelectedFamilyFilter] = useState<string>('ALL');
  const [personToDelete, setPersonToDelete] = useState<Person | null>(null);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const micros = storageService.getMicros();
  const functions = storageService.getFunctions();
  const families = storageService.getFamilies();

  // Keep list updated if storage changes
  const reloadPeople = () => {
    setPeople(storageService.getPeople());
  };

  useEffect(() => {
    reloadPeople();
    const handleSync = () => reloadPeople();
    window.addEventListener('mevam_data_synced', handleSync);
    return () => window.removeEventListener('mevam_data_synced', handleSync);
  }, []);

  const handlePromptDelete = (person: Person) => {
    setPersonToDelete(person);
  };

  const handleConfirmDelete = () => {
    if (!personToDelete) return;
    const name = personToDelete.name;
    storageService.deletePerson(personToDelete.id);
    setPeople(storageService.getPeople());
    setPersonToDelete(null);
    onPersonDeleted?.();
    setToastMessage(`Voluntário ${name} excluído com sucesso.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleForceSync = async () => {
    setIsSyncing(true);
    try {
      const res = await storageService.forcePullFromServer();
      setPeople(storageService.getPeople());
      setToastMessage(`Sincronizado! O servidor central possui ${res.count} voluntários.`);
    } catch {
      setToastMessage('Falha ao sincronizar com o servidor.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleConfirmClearAll = async () => {
    setIsSyncing(true);
    setIsClearAllModalOpen(false);
    try {
      await storageService.clearAllVolunteers();
      setPeople([]);
      setToastMessage('Base de voluntários zerada e sincronizada para todos os dispositivos.');
    } catch {
      setToastMessage('Erro ao zerar voluntários.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  // Filter based on user's authorized micros
  const visiblePeople = people.filter((p) => {
    // RBAC check: Leader can only view people who serve in their allowed micros
    if (currentUser.role === 'LIDER_MICRO' && currentUser.primaryMicroId) {
      if (!p.microIds.includes(currentUser.primaryMicroId)) return false;
    }
    if (currentUser.role === 'LIDER_MACRO' && currentUser.allowedMicroIds) {
      const hasAllowed = p.microIds.some((mId) => currentUser.allowedMicroIds!.includes(mId));
      if (!hasAllowed) return false;
    }

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchName = p.name.toLowerCase().includes(term) || (p.nickname && p.nickname.toLowerCase().includes(term));
      const matchPhone = p.phone.includes(term) || p.whatsapp.includes(term);
      const matchDate = p.birthDate.includes(term) || formatDateBR(p.birthDate).includes(term);
      const matchFn = p.functionPreferences.some((fp) => {
        const fn = functions.find((f) => f.id === fp.functionId);
        return fn?.name.toLowerCase().includes(term);
      });
      if (!matchName && !matchPhone && !matchDate && !matchFn) return false;
    }

    // Micro filter
    if (selectedMicroFilter !== 'ALL' && !p.microIds.includes(selectedMicroFilter)) {
      return false;
    }

    // Family filter
    if (selectedFamilyFilter !== 'ALL' && p.familyId !== selectedFamilyFilter) {
      return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-800 flex items-center space-x-2.5 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 font-display tracking-tight">
                  Voluntários MEVAM Kids
                </h1>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[11px] font-extrabold">
                  {visiblePeople.length}
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Cadastro unificado em tempo real entre todos os dispositivos
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleForceSync}
            disabled={isSyncing}
            className="inline-flex items-center justify-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all active:scale-[0.98]"
            title="Puxar dados atualizados do servidor"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
            <span>Sincronizar</span>
          </button>

          {currentUser.role === 'ADMIN_LIDERANCA' && (
            <button
              onClick={() => setIsClearAllModalOpen(true)}
              className="inline-flex items-center justify-center space-x-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-all"
              title="Zerar todos os voluntários em todos os dispositivos"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
              <span>Zerar Voluntários</span>
            </button>
          )}

          <button
            onClick={() => onOpenWizard()}
            className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ CADASTRAR PESSOA</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, função, telefone..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
        </div>

        <div>
          <select
            value={selectedMicroFilter}
            onChange={(e) => setSelectedMicroFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          >
            <option value="ALL">Todos os Micros / Frentes</option>
            {micros.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedFamilyFilter}
            onChange={(e) => setSelectedFamilyFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          >
            <option value="ALL">Todas as Famílias</option>
            {families.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Empty State */}
      {visiblePeople.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3 border border-blue-100">
            <Users className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 font-display">
            Nenhum voluntário encontrado
          </h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto mt-1 mb-5">
            A lista está zerada e sincronizada com o servidor central. Comece cadastrando uma nova pessoa ou importe os dados.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => onOpenWizard()}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Cadastrar Primeiro Voluntário</span>
            </button>
            <button
              onClick={handleForceSync}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Sincronizar com Servidor</span>
            </button>
          </div>
        </div>
      )}

      {/* MOBILE CARDS VIEW (Responsive on Smartphone screens) */}
      {visiblePeople.length > 0 && (
        <div className="md:hidden space-y-3">
          {visiblePeople.map((person) => {
            const family = person.familyId ? families.find((f) => f.id === person.familyId) : null;
            const personMicros = person.microIds.map((mId) => micros.find((m) => m.id === mId)).filter(Boolean);
            const cleanPhone = (person.whatsapp || person.phone).replace(/\D/g, '');

            return (
              <div
                key={person.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3"
              >
                {/* Header info */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 text-white font-bold text-sm flex items-center justify-center shrink-0">
                      {person.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm flex items-center space-x-1.5">
                        <span>{person.name}</span>
                        {person.nickname && (
                          <span className="text-xs text-slate-500 font-medium">({person.nickname})</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">{person.email || 'Sem e-mail'}</div>
                    </div>
                  </div>

                  {family && (
                    <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-md shrink-0">
                      <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
                      <span>{family.name}</span>
                    </span>
                  )}
                </div>

                {/* Birthdate & Contact Links */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-xs">
                  {person.birthDate && (
                    <div className="flex items-center space-x-1 text-slate-600 bg-slate-50 px-2 py-1 rounded-lg">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatDateBR(person.birthDate)}</span>
                    </div>
                  )}

                  {person.phone && (
                    <a
                      href={`tel:${person.phone.replace(/\D/g, '')}`}
                      className="flex items-center space-x-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-lg font-medium"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>{person.phone}</span>
                    </a>
                  )}

                  {cleanPhone && (
                    <a
                      href={`https://wa.me/55${cleanPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1 text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg font-bold"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WhatsApp</span>
                    </a>
                  )}
                </div>

                {/* Micros & Functions */}
                <div className="space-y-1.5 pt-1 border-t border-slate-100">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Micros & Funções
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {personMicros.map((m) => (
                      <span
                        key={m!.id}
                        className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md text-white shadow-2xs"
                        style={{ backgroundColor: m!.color }}
                      >
                        {m!.name}
                      </span>
                    ))}
                  </div>
                  <div className="text-xs text-slate-600 line-clamp-2">
                    {person.functionPreferences.map((fp) => {
                      const fn = functions.find((f) => f.id === fp.functionId);
                      return fn?.name;
                    }).filter(Boolean).join(' • ')}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => onViewDetail(person)}
                    className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center space-x-1 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Detalhes</span>
                  </button>
                  <button
                    onClick={() => onOpenWizard(person)}
                    className="flex-1 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl flex items-center justify-center space-x-1 transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>
                  {currentUser.role === 'ADMIN_LIDERANCA' && (
                    <button
                      onClick={() => handlePromptDelete(person)}
                      className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DESKTOP TABLE VIEW (Visible on tablet and desktop screens) */}
      {visiblePeople.length > 0 && (
        <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  <th className="py-3 px-4">Voluntário</th>
                  <th className="py-3 px-4">Nascimento / Contato</th>
                  <th className="py-3 px-4">Micros & Funções</th>
                  <th className="py-3 px-4">Família</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {visiblePeople.map((person) => {
                  const family = person.familyId ? families.find((f) => f.id === person.familyId) : null;
                  const personMicros = person.microIds.map((mId) => micros.find((m) => m.id === mId)).filter(Boolean);

                  return (
                    <tr key={person.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {person.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                              <span>{person.name}</span>
                              {person.nickname && (
                                <span className="text-[11px] text-slate-700 font-medium">
                                  ({person.nickname})
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-700">{person.email || 'Sem e-mail'}</div>
                          </div>
                        </div>
                      </td>

                      {/* Birthdate & Phone */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-1 text-slate-700 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDateBR(person.birthDate)}</span>
                        </div>
                        <div className="flex items-center space-x-1.5 text-slate-700 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{person.phone}</span>
                        </div>
                      </td>

                      {/* Micros & Functions */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex flex-wrap gap-1.5">
                          {personMicros.map((m) => (
                            <span
                              key={m!.id}
                              className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md text-white shadow-2xs"
                              style={{ backgroundColor: m!.color }}
                            >
                              {m!.name}
                            </span>
                          ))}
                        </div>
                        <div className="text-[11px] text-slate-700 mt-1 line-clamp-1">
                          {person.functionPreferences.map((fp) => {
                            const fn = functions.find((f) => f.id === fp.functionId);
                            return fn?.name;
                          }).filter(Boolean).join(' • ')}
                        </div>
                      </td>

                      {/* Family */}
                      <td className="py-3.5 px-4">
                        {family ? (
                          <span className="inline-flex items-center space-x-1 text-[11px] font-bold px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-md">
                            <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
                            <span>{family.name}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Não informada</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center space-x-1">
                          <button
                            onClick={() => onViewDetail(person)}
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Ver Cadastro Completo & Disponibilidade"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onOpenWizard(person)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {currentUser.role === 'ADMIN_LIDERANCA' && (
                            <button
                              onClick={() => handlePromptDelete(person)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Excluir Voluntário"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* In-App Delete Confirmation Modal */}
      {personToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-display">
                  Excluir Voluntário
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Tem certeza que deseja excluir o cadastro de{' '}
                  <strong className="text-slate-900 font-semibold">{personToDelete.name}</strong>?
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 space-y-1">
              <p>• O cadastro do voluntário será removido da base.</p>
              <p>• Suas regras de disponibilidade e indisponibilidade serão apagadas.</p>
              <p>• O histórico de auditoria registrará esta exclusão.</p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setPersonToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sim, Excluir</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Clear All Volunteers Confirmation Modal */}
      {isClearAllModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-display">
                  Zerar Lista de Voluntários
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Esta ação limpará a lista de voluntários em <strong>todos os navegadores e dispositivos</strong> conectados (Chrome, Brave, Opera, celular, etc).
                </p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 space-y-1">
              <p className="font-bold">O que acontecerá:</p>
              <p>• O número de voluntários passará a ser <strong>0</strong> em todos os dispositivos.</p>
              <p>• Os slots atribuídos nas escalas serão limpos.</p>
              <p>• Você poderá cadastrar ou importar os voluntários reais do zero.</p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsClearAllModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAll}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sim, Zerar Todos</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
