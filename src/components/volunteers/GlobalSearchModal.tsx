import React, { useState, useEffect } from 'react';
import {
  Search,
  X,
  User,
  Users,
  Briefcase,
  Heart,
  Calendar,
  Phone,
  ArrowRight
} from 'lucide-react';
import { Person, Micro, MicroFunction, Family } from '../../types';
import { storageService } from '../../services/storageService';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPerson: (person: Person) => void;
  onNavigate: (view: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectPerson,
  onNavigate
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // toggle handled by parent
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const people = storageService.getPeople();
  const micros = storageService.getMicros();
  const functions = storageService.getFunctions();
  const families = storageService.getFamilies();

  const term = searchTerm.trim().toLowerCase();

  const matchedPeople = term
    ? people.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          (p.nickname && p.nickname.toLowerCase().includes(term)) ||
          p.birthDate.includes(term) ||
          p.phone.includes(term) ||
          p.whatsapp.includes(term) ||
          (p.email && p.email.toLowerCase().includes(term))
      )
    : [];

  const matchedMicros = term
    ? micros.filter((m) => m.name.toLowerCase().includes(term) || m.description.toLowerCase().includes(term))
    : [];

  const matchedFunctions = term
    ? functions.filter((f) => f.name.toLowerCase().includes(term) || (f.category && f.category.toLowerCase().includes(term)))
    : [];

  const matchedFamilies = term
    ? families.filter((f) => f.name.toLowerCase().includes(term))
    : [];

  const totalResults = matchedPeople.length + matchedMicros.length + matchedFunctions.length + matchedFamilies.length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-4 pt-20 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-200 flex items-center space-x-3 bg-slate-50">
          <Search className="w-5 h-5 text-indigo-600 shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, apelido, data, telefone, micro, função ou família..."
            className="w-full bg-transparent text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-hidden"
            autoFocus
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-xs text-slate-400 hover:text-slate-600 px-1.5 py-0.5"
            >
              Limpar
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-4 space-y-4">
          {!searchTerm && (
            <div className="py-8 text-center text-xs text-slate-700 space-y-1">
              <p className="font-semibold text-slate-700">Digite termos para busca instantânea</p>
              <p>Busque voluntários, frentes, funções específicas ou núcleos familiares.</p>
            </div>
          )}

          {searchTerm && totalResults === 0 && (
            <div className="py-8 text-center text-xs text-slate-700">
              Nenhum resultado encontrado para "{searchTerm}".
            </div>
          )}

          {/* People Section */}
          {matchedPeople.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                <span>Voluntários ({matchedPeople.length})</span>
              </div>
              <div className="space-y-1">
                {matchedPeople.map((person) => (
                  <div
                    key={person.id}
                    onClick={() => {
                      onSelectPerson(person);
                      onClose();
                    }}
                    className="p-2.5 rounded-xl hover:bg-indigo-50/70 border border-transparent hover:border-indigo-200 cursor-pointer flex items-center justify-between transition-colors group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center">
                        {person.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-900">
                          {person.name} {person.nickname && `(${person.nickname})`}
                        </div>
                        <div className="text-[11px] text-slate-700">
                          Nasc: {person.birthDate} • Tel: {person.phone}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Micros Section */}
          {matchedMicros.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                <span>Micros / Frentes ({matchedMicros.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {matchedMicros.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => {
                      onNavigate('micros-functions');
                      onClose();
                    }}
                    className="p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 cursor-pointer flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{m.name}</div>
                      <div className="text-[11px] text-slate-700">{m.description}</div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Families Section */}
          {matchedFamilies.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-600" />
                <span>Famílias ({matchedFamilies.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {matchedFamilies.map((f) => (
                  <div
                    key={f.id}
                    onClick={() => {
                      onNavigate('families');
                      onClose();
                    }}
                    className="p-2.5 rounded-xl bg-slate-50 hover:bg-rose-50 border border-slate-200 cursor-pointer flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{f.name}</div>
                      <div className="text-[11px] text-slate-700">Prioridade: {f.priority}</div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-rose-600" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 text-[11px] text-slate-700 flex items-center justify-between">
          <span>Pressione ESC para fechar</span>
          <span>MEVAM Kids Gestão Global</span>
        </div>
      </div>
    </div>
  );
};
