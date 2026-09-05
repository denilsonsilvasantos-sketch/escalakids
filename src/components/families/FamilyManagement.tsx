import React, { useState, useEffect } from 'react';
import {
  Heart,
  Plus,
  Users,
  UserPlus,
  Trash2,
  Edit,
  Sliders,
  Check,
  Search,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import { Family, Person, UserAccount } from '../../types';
import { storageService } from '../../services/storageService';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface FamilyManagementProps {
  currentUser: UserAccount;
}

export const FamilyManagement: React.FC<FamilyManagementProps> = ({ currentUser }) => {
  const [families, setFamilies] = useState<Family[]>(storageService.getFamilies());
  const [people, setPeople] = useState<Person[]>(storageService.getPeople());
  const micros = storageService.getMicros();
  const functions = storageService.getFunctions();

  // New / Edit Family Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFamily, setEditingFamily] = useState<Family | null>(null);
  const [familyName, setFamilyName] = useState('');
  const [familyPriority, setFamilyPriority] = useState<Family['priority']>('ALTA');
  const [familySchedulingPreference, setFamilySchedulingPreference] = useState<NonNullable<Family['schedulingPreference']>>('JUNTOS');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  // Member linking state inside modal
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [targetFamilyForLink, setTargetFamilyForLink] = useState<Family | null>(null);
  const [personSearch, setPersonSearch] = useState('');

  // Synchronize data without closing modals
  useEffect(() => {
    const handleSync = () => {
      setFamilies(storageService.getFamilies());
      setPeople(storageService.getPeople());
    };
    window.addEventListener('mevam_data_synced', handleSync);
    return () => window.removeEventListener('mevam_data_synced', handleSync);
  }, []);

  const handleOpenNewFamily = () => {
    setEditingFamily(null);
    setFamilyName('');
    setFamilyPriority('ALTA');
    setFamilySchedulingPreference('JUNTOS');
    setIsModalOpen(true);
  };

  const handleOpenEditFamily = (f: Family) => {
    setEditingFamily(f);
    setFamilyName(f.name);
    setFamilyPriority(f.priority);
    setFamilySchedulingPreference(f.schedulingPreference || 'JUNTOS');
    setIsModalOpen(true);
  };

  const handleSaveFamily = () => {
    if (!familyName.trim()) return;

    const famToSave: Family = {
      id: editingFamily?.id || `fam-${Date.now()}`,
      name: familyName.trim(),
      priority: familyPriority,
      schedulingPreference: familySchedulingPreference,
      createdAt: editingFamily?.createdAt || new Date().toISOString()
    };

    storageService.saveFamily(famToSave);
    setFamilies(storageService.getFamilies());
    setIsModalOpen(false);
  };

  const handleDeleteFamily = (famId: string) => {
    setPendingConfirm({
      title: 'Excluir Núcleo Familiar',
      message: 'Deseja excluir este núcleo familiar? Os voluntários permanecerão no sistema sem vínculo.',
      onConfirm: () => {
        storageService.deleteFamily(famId);
        setFamilies(storageService.getFamilies());
        setPeople(storageService.getPeople());
      }
    });
  };

  const handleUpdatePriority = (family: Family, priority: Family['priority']) => {
    const updated: Family = { ...family, priority };
    storageService.saveFamily(updated);
    setFamilies(storageService.getFamilies());
  };

  const handleUpdateSchedulingPreference = (family: Family, schedulingPreference: Family['schedulingPreference']) => {
    const updated: Family = { ...family, schedulingPreference };
    storageService.saveFamily(updated);
    setFamilies(storageService.getFamilies());
  };

  const handleOpenLinkMember = (family: Family) => {
    setTargetFamilyForLink(family);
    setPersonSearch('');
    setIsLinkModalOpen(true);
  };

  const handleLinkPerson = (person: Person) => {
    if (!targetFamilyForLink) return;

    const applyLink = () => {
      const updatedPerson = { ...person, familyId: targetFamilyForLink.id };
      storageService.savePerson(updatedPerson);
      setPeople(storageService.getPeople());
      setIsLinkModalOpen(false);
    };

    if (person.familyId && person.familyId !== targetFamilyForLink.id) {
      const currentFam = storageService.getFamilyById(person.familyId);
      setPendingConfirm({
        title: 'Transferir Voluntário de Família',
        message: `${person.name} já pertence à ${currentFam?.name}. Deseja transferi-lo para ${targetFamilyForLink.name}?`,
        onConfirm: applyLink
      });
      return;
    }

    applyLink();
  };

  const handleUnlinkPerson = (person: Person) => {
    setPendingConfirm({
      title: 'Remover da Família',
      message: `Remover ${person.name} desta família?`,
      onConfirm: () => {
        const updatedPerson = { ...person, familyId: undefined };
        storageService.savePerson(updatedPerson);
        setPeople(storageService.getPeople());
      }
    });
  };

  const getPriorityBadge = (p: Family['priority']) => {
    switch (p) {
      case 'MUITO_ALTA':
        return { label: 'Prioridade Máxima', bg: 'bg-rose-100 text-rose-800 border-rose-200' };
      case 'ALTA':
        return { label: 'Prioridade Alta', bg: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'MEDIA':
        return { label: 'Prioridade Média', bg: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
      case 'BAIXA':
        return { label: 'Prioridade Baixa', bg: 'bg-slate-100 text-slate-700 border-slate-200' };
      default:
        return { label: 'Desativada', bg: 'bg-slate-100 text-slate-500 border-slate-200' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
              <Heart className="w-5 h-5 fill-rose-500" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 font-display tracking-tight">
                Gestão de Núcleos Familiares
              </h1>
              <p className="text-xs text-slate-700">
                Critério inteligente de preferência para escalar familiares juntos nos mesmos cultos — {families.length} famílias
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenNewFamily}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>+ NOVA FAMÍLIA</span>
        </button>
      </div>

      {/* Families Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {families.map((family) => {
          const members = people.filter((p) => p.familyId === family.id);
          const pBadge = getPriorityBadge(family.priority);

          return (
            <div
              key={family.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4 hover:shadow-md transition-shadow"
            >
              {/* Top Family Row */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-sm">
                    <Heart className="w-5 h-5 fill-rose-500" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 font-display">
                      {family.name}
                    </h3>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${pBadge.bg}`}>
                        {pBadge.label}
                      </span>
                      <span className="text-xs text-slate-700">
                        {members.length} membro(s) cadastrado(s)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleOpenEditFamily(family)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                    title="Editar nome/prioridade"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteFamily(family.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                    title="Excluir Família"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Priority Selector Quick Bar */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 text-[11px]">Prioridade na Escala:</span>
                <select
                  value={family.priority}
                  onChange={(e) => handleUpdatePriority(family, e.target.value as any)}
                  className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                >
                  <option value="MUITO_ALTA">Muito Alta</option>
                  <option value="ALTA">Alta</option>
                  <option value="MEDIA">Média</option>
                  <option value="BAIXA">Baixa</option>
                  <option value="DESATIVADA">Desativada</option>
                </select>
              </div>

              {/* Same-Day Scheduling Preference Quick Bar */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 text-[11px]">Preferência de Escala:</span>
                <select
                  value={family.schedulingPreference || 'JUNTOS'}
                  onChange={(e) => handleUpdateSchedulingPreference(family, e.target.value as any)}
                  className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                >
                  <option value="JUNTOS">Ficar Juntos</option>
                  <option value="SEPARADOS">Ficar Separados</option>
                  <option value="SEM_PREFERENCIA">Sem Preferência</option>
                </select>
              </div>

              {/* Members List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <span>Membros do Núcleo</span>
                  <button
                    onClick={() => handleOpenLinkMember(family)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Vincular Membro</span>
                  </button>
                </div>

                <div className="space-y-1.5">
                  {members.length === 0 ? (
                    <div className="py-3 text-center text-xs text-slate-700 bg-slate-50 rounded-xl">
                      Nenhum membro vinculado a esta família.
                    </div>
                  ) : (
                    members.map((member) => {
                      const memberMicros = member.microIds.map((mId) => micros.find((m) => m.id === mId)).filter(Boolean);

                      return (
                        <div
                          key={member.id}
                          className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                              <span>{member.name}</span>
                              {member.nickname && (
                                <span className="text-slate-700 text-[11px] font-normal">
                                  ({member.nickname})
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {memberMicros.map((m) => (
                                <span
                                  key={m!.id}
                                  className="text-[10px] font-bold px-1.5 py-0.2 rounded text-white"
                                  style={{ backgroundColor: m!.color }}
                                >
                                  {m!.name}
                                </span>
                              ))}
                            </div>
                          </div>

                          <button
                            onClick={() => handleUnlinkPerson(member)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                            title="Desvincular da família"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: New / Edit Family */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-100">
            <h3 className="text-base font-bold text-slate-900 font-display">
              {editingFamily ? 'Editar Família' : 'Cadastrar Nova Família'}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">NOME DA FAMÍLIA *</label>
                <input
                  type="text"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  placeholder="Ex: Família Silva, Família Santos..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">PRIORIDADE DE ESCALAR JUNTOS</label>
                <select
                  value={familyPriority}
                  onChange={(e) => setFamilyPriority(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="MUITO_ALTA">Muito Alta (Casais com bebês/filhos pequenos)</option>
                  <option value="ALTA">Alta (Preferência padrão)</option>
                  <option value="MEDIA">Média (Conveniência)</option>
                  <option value="BAIXA">Baixa</option>
                  <option value="DESATIVADA">Desativada (Indiferente)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">PREFERÊNCIA DE ESCALA</label>
                <select
                  value={familySchedulingPreference}
                  onChange={(e) => setFamilySchedulingPreference(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="JUNTOS">Ficar Juntos (recebe bônus na escala)</option>
                  <option value="SEPARADOS">Ficar Separados (nunca no mesmo dia)</option>
                  <option value="SEM_PREFERENCIA">Sem Preferência</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveFamily}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Salvar Família
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Link Member to Family */}
      {isLinkModalOpen && targetFamilyForLink && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-100">
            <h3 className="text-base font-bold text-slate-900 font-display">
              Vincular Membro à {targetFamilyForLink.name}
            </h3>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={personSearch}
                onChange={(e) => setPersonSearch(e.target.value)}
                placeholder="Buscar voluntário pelo nome..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1 text-xs">
              {people
                .filter(
                  (p) =>
                    p.name.toLowerCase().includes(personSearch.toLowerCase()) &&
                    p.familyId !== targetFamilyForLink.id
                )
                .map((person) => (
                  <div
                    key={person.id}
                    onClick={() => handleLinkPerson(person)}
                    className="p-2.5 bg-slate-50 hover:bg-rose-50 rounded-lg border border-slate-200 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div>
                      <span className="font-bold text-slate-900">{person.name}</span>
                      <span className="text-slate-700 ml-2">({person.birthDate})</span>
                    </div>
                    <span className="text-rose-600 font-bold text-[11px]">+ Vincular</span>
                  </div>
                ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsLinkModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!pendingConfirm}
        title={pendingConfirm?.title || ''}
        message={pendingConfirm?.message || ''}
        onCancel={() => setPendingConfirm(null)}
        onConfirm={() => {
          pendingConfirm?.onConfirm();
          setPendingConfirm(null);
        }}
      />
    </div>
  );
};
