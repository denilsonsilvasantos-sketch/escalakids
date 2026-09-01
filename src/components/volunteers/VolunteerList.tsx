import React, { useState } from 'react';
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
  Phone,
  MessageSquare
} from 'lucide-react';
import { Person, Micro, MicroFunction, Family, UserAccount } from '../../types';
import { storageService } from '../../services/storageService';
import { formatDateBR } from '../../utils/dateUtils';

interface VolunteerListProps {
  currentUser: UserAccount;
  onOpenWizard: (person?: Person) => void;
  onViewDetail: (person: Person) => void;
}

export const VolunteerList: React.FC<VolunteerListProps> = ({
  currentUser,
  onOpenWizard,
  onViewDetail
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMicroFilter, setSelectedMicroFilter] = useState<string>('ALL');
  const [selectedFamilyFilter, setSelectedFamilyFilter] = useState<string>('ALL');

  const micros = storageService.getMicros();
  const functions = storageService.getFunctions();
  const families = storageService.getFamilies();
  const people = storageService.getPeople();

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

  const handleDelete = (person: Person) => {
    if (confirm(`Deseja realmente desativar o cadastro de ${person.name}?`)) {
      storageService.deletePerson(person.id);
      window.location.reload(); // Refresh local view
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 font-display tracking-tight">
                Voluntários MEVAM Kids
              </h1>
              <p className="text-xs text-slate-600">
                Cadastro centralizado e único — {visiblePeople.length} voluntários ativos no seu escopo
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => onOpenWizard()}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-[0.98]"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ CADASTRAR PESSOA</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, função, telefone ou data..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
        </div>

        <div>
          <select
            value={selectedMicroFilter}
            onChange={(e) => setSelectedMicroFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
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
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
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

      {/* People Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
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
              {visiblePeople.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-700">
                    Nenhum voluntário encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                visiblePeople.map((person) => {
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
                              onClick={() => handleDelete(person)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Desativar Voluntário"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
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
