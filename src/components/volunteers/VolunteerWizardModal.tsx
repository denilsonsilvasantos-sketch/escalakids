import React, { useState } from 'react';
import {
  X,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  UserPlus,
  Users,
  Briefcase,
  Sliders,
  Heart,
  ChevronRight,
  ChevronLeft,
  Search,
  Check,
  Sparkles
} from 'lucide-react';
import { Person, Micro, MicroFunction, Family, PersonMicroFunctionPreference } from '../../types';
import { storageService } from '../../services/storageService';
import { formatDateBR, parseDateBRToISO, maskDateBRInput, isValidDateBR } from '../../utils/dateUtils';

interface VolunteerWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (person: Person) => void;
  initialPerson?: Person | null;
}

export const VolunteerWizardModal: React.FC<VolunteerWizardModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialPerson
}) => {
  if (!isOpen) return null;

  const micros = storageService.getMicros().filter((m) => m.status === 'ATIVO');
  const allFunctions = storageService.getFunctions();
  const allPeople = storageService.getPeople();
  const allFamilies = storageService.getFamilies();

  // Wizard Step: 1 to 8
  const [step, setStep] = useState<number>(initialPerson ? 4 : 1);

  // Form State: birthDate stored in YYYY-MM-DD for consistency
  const [birthDate, setBirthDate] = useState(initialPerson?.birthDate || '');
  const [birthDateBRInput, setBirthDateBRInput] = useState(
    initialPerson?.birthDate ? formatDateBR(initialPerson.birthDate) : ''
  );
  const [matchingBirthDatePeople, setMatchingBirthDatePeople] = useState<Person[]>([]);
  const [potentialNameDuplicates, setPotentialNameDuplicates] = useState<Person[]>([]);
  const [isDuplicateNameWarningDismissed, setIsDuplicateNameWarningDismissed] = useState(false);

  const [name, setName] = useState(initialPerson?.name || '');
  const [nickname, setNickname] = useState(initialPerson?.nickname || '');
  const [phone, setPhone] = useState(initialPerson?.phone || '');
  const [whatsapp, setWhatsapp] = useState(initialPerson?.whatsapp || '');
  const [email, setEmail] = useState(initialPerson?.email || '');
  const [notes, setNotes] = useState(initialPerson?.notes || '');
  const [avatarUrl, setAvatarUrl] = useState(initialPerson?.avatarUrl || '');

  // Selected Micros & Functions
  const [selectedMicroIds, setSelectedMicroIds] = useState<string[]>(initialPerson?.microIds || []);
  const [functionPreferences, setFunctionPreferences] = useState<PersonMicroFunctionPreference[]>(
    initialPerson?.functionPreferences || []
  );

  // Family Linkage
  const [hasFamilyMember, setHasFamilyMember] = useState<boolean>(!!initialPerson?.familyId);
  const [familySearchTerm, setFamilySearchTerm] = useState('');
  const [selectedFamilyMember, setSelectedFamilyMember] = useState<Person | null>(null);
  const [targetFamily, setTargetFamily] = useState<Family | null>(
    initialPerson?.familyId ? storageService.getFamilyById(initialPerson.familyId) || null : null
  );

  // --- Step 1: Birthdate verification ---
  const handleBirthDateSubmit = () => {
    let resolvedIso = birthDate;
    if (!resolvedIso && birthDateBRInput) {
      resolvedIso = parseDateBRToISO(birthDateBRInput);
      setBirthDate(resolvedIso);
    }
    if (!resolvedIso) return;

    const matches = storageService.findPeopleByBirthDate(resolvedIso);
    setMatchingBirthDatePeople(matches);
    if (matches.length > 0) {
      setStep(2); // Show matching candidates step
    } else {
      setStep(4); // Direct to general data
    }
  };

  // --- Step 3: Name duplicate check ---
  const handleNameChange = (val: string) => {
    setName(val);
    if (val.trim().length >= 3) {
      const dups = storageService.findPotentialNameDuplicates(val, initialPerson?.id);
      setPotentialNameDuplicates(dups);
    } else {
      setPotentialNameDuplicates([]);
    }
  };

  // Toggle Micro selection
  const handleToggleMicro = (microId: string) => {
    if (selectedMicroIds.includes(microId)) {
      setSelectedMicroIds(selectedMicroIds.filter((id) => id !== microId));
      // remove functions belonging to this micro
      setFunctionPreferences(functionPreferences.filter((fp) => fp.microId !== microId));
    } else {
      setSelectedMicroIds([...selectedMicroIds, microId]);
    }
  };

  // Toggle Function selection
  const handleToggleFunction = (microId: string, functionId: string) => {
    const existing = functionPreferences.find((fp) => fp.microId === microId && fp.functionId === functionId);
    if (existing) {
      setFunctionPreferences(functionPreferences.filter((fp) => !(fp.microId === microId && fp.functionId === functionId)));
    } else {
      const newPref: PersonMicroFunctionPreference = {
        microId,
        functionId,
        experienceLevel: 'INTERMEDIARIO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo'],
        preferredAgeGroups: []
      };
      setFunctionPreferences([...functionPreferences, newPref]);
    }
  };

  // Update Function criteria
  const handleUpdatePref = (
    microId: string,
    functionId: string,
    field: keyof PersonMicroFunctionPreference,
    value: any
  ) => {
    setFunctionPreferences((prev) =>
      prev.map((fp) => {
        if (fp.microId === microId && fp.functionId === functionId) {
          return { ...fp, [field]: value };
        }
        return fp;
      })
    );
  };

  // Select a matched existing volunteer to edit
  const handleSelectExistingPerson = (p: Person) => {
    setName(p.name);
    setNickname(p.nickname || '');
    setPhone(p.phone || '');
    setWhatsapp(p.whatsapp || '');
    setEmail(p.email || '');
    setNotes(p.notes || '');
    setAvatarUrl(p.avatarUrl || '');
    setSelectedMicroIds(p.microIds || []);
    setFunctionPreferences(p.functionPreferences || []);
    if (p.familyId) {
      setHasFamilyMember(true);
      setTargetFamily(storageService.getFamilyById(p.familyId) || null);
    }
    setStep(5); // Jump straight to adding more micros/functions!
  };

  // Handle Family member selection
  const handleSelectFamilyMember = (member: Person) => {
    setSelectedFamilyMember(member);
    if (member.familyId) {
      const fam = storageService.getFamilyById(member.familyId);
      setTargetFamily(fam || null);
    } else {
      const lastName = member.name.split(' ').slice(-1)[0] || 'Silva';
      setTargetFamily({
        id: `fam-temp-${Date.now()}`,
        name: `Família ${lastName}`,
        priority: 'ALTA',
        createdAt: new Date().toISOString()
      });
    }
  };

  // Final Save
  const handleSaveVolunteer = () => {
    if (!name || !birthDate) {
      alert('Nome e Data de Nascimento são obrigatórios.');
      return;
    }

    let finalFamilyId = targetFamily?.id;

    // If family was newly created
    if (hasFamilyMember && targetFamily && selectedFamilyMember) {
      if (!targetFamily.id.startsWith('fam-temp-') && storageService.getFamilyById(targetFamily.id)) {
        finalFamilyId = targetFamily.id;
      } else {
        const newFam = storageService.linkPersonsToFamily(
          initialPerson?.id || `p-${Date.now()}`,
          selectedFamilyMember.id,
          targetFamily.name
        );
        finalFamilyId = newFam.id;
      }
    }

    const newPerson: Person = {
      id: initialPerson?.id || `p-${Date.now()}`,
      name: name.trim(),
      nickname: nickname.trim() || undefined,
      birthDate,
      phone: phone.trim(),
      whatsapp: whatsapp.trim() || phone.replace(/\D/g, ''),
      email: email.trim(),
      avatarUrl: avatarUrl.trim() || undefined,
      notes: notes.trim() || undefined,
      familyId: hasFamilyMember ? finalFamilyId : undefined,
      active: true,
      microIds: selectedMicroIds,
      functionPreferences,
      createdAt: initialPerson?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    storageService.savePerson(newPerson);
    onSaved(newPerson);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-300">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-display tracking-tight">
                {initialPerson ? 'Editar Cadastro Único de Voluntário' : 'Novo Cadastro de Voluntário — MEVAM Kids'}
              </h2>
              <p className="text-xs text-slate-300">
                Regra Fundamental: Perfil único sem duplicidades em múltiplos micros
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Progress Bar */}
        <div className="bg-slate-100 px-6 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600 font-semibold overflow-x-auto">
          <div className="flex items-center space-x-2 shrink-0">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${step >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-300 text-slate-700'}`}>
              1
            </span>
            <span className={step === 1 ? 'text-indigo-900 font-bold' : ''}>Nascimento</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 mx-1" />
          <div className="flex items-center space-x-2 shrink-0">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${step >= 4 ? 'bg-indigo-600 text-white' : 'bg-slate-300 text-slate-700'}`}>
              2
            </span>
            <span className={step === 4 ? 'text-indigo-900 font-bold' : ''}>Dados</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 mx-1" />
          <div className="flex items-center space-x-2 shrink-0">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${step >= 5 ? 'bg-indigo-600 text-white' : 'bg-slate-300 text-slate-700'}`}>
              3
            </span>
            <span className={step === 5 ? 'text-indigo-900 font-bold' : ''}>Micros</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 mx-1" />
          <div className="flex items-center space-x-2 shrink-0">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${step >= 6 ? 'bg-indigo-600 text-white' : 'bg-slate-300 text-slate-700'}`}>
              4
            </span>
            <span className={step === 6 ? 'text-indigo-900 font-bold' : ''}>Funções</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 mx-1" />
          <div className="flex items-center space-x-2 shrink-0">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${step >= 7 ? 'bg-indigo-600 text-white' : 'bg-slate-300 text-slate-700'}`}>
              5
            </span>
            <span className={step === 7 ? 'text-indigo-900 font-bold' : ''}>Critérios</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 mx-1" />
          <div className="flex items-center space-x-2 shrink-0">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${step >= 8 ? 'bg-indigo-600 text-white' : 'bg-slate-300 text-slate-700'}`}>
              6
            </span>
            <span className={step === 8 ? 'text-indigo-900 font-bold' : ''}>Família</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[65vh] overflow-y-auto">
          {/* ================= STEP 1: Birthdate First Step ================= */}
          {step === 1 && (
            <div className="space-y-4 max-w-lg mx-auto py-4">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-indigo-100">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-800">
                  Etapa 1: Qual é a Data de Nascimento do Voluntário?
                </h3>
                <p className="text-xs text-slate-700">
                  A data de nascimento é o <strong>primeiro mecanismo de identificação</strong> para verificar se a pessoa já possui cadastro no MEVAM Kids e evitar duplicidades.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-700">
                  DATA DE NASCIMENTO (PADRÃO BRASIL DD/MM/AAAA) *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="text-[11px] text-slate-500 font-semibold block mb-1">Digitação Rápida (DD/MM/AAAA):</span>
                    <input
                      type="text"
                      value={birthDateBRInput}
                      onChange={(e) => {
                        const masked = maskDateBRInput(e.target.value);
                        setBirthDateBRInput(masked);
                        if (masked.length === 10 && isValidDateBR(masked)) {
                          setBirthDate(parseDateBRToISO(masked));
                        }
                      }}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      placeholder="Ex: 15/04/1990"
                      maxLength={10}
                      autoFocus
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 font-semibold block mb-1">Ou Seletor de Calendário:</span>
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(e) => {
                        setBirthDate(e.target.value);
                        setBirthDateBRInput(formatDateBR(e.target.value));
                      }}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>
                {birthDate && (
                  <p className="text-xs text-blue-700 font-bold">
                    ✓ Data selecionada: {formatDateBR(birthDate)}
                  </p>
                )}
              </div>

              <button
                onClick={handleBirthDateSubmit}
                disabled={!birthDate && !birthDateBRInput}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2 active:scale-[0.98]"
              >
                <span>VERIFICAR NO BANCO DE DADOS</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ================= STEP 2: Matching Birthdate Preview ================= */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-900">
                      Encontramos {matchingBirthDatePeople.length} pessoa(s) com esta data de nascimento ({formatDateBR(birthDate)})
                    </h4>
                    <p className="text-xs text-amber-800 mt-0.5">
                      Para não duplicar cadastros, verifique se a pessoa que você está cadastrando já é uma das listadas abaixo:
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                {matchingBirthDatePeople.map((p) => {
                  const personMicros = p.microIds.map((mId) => micros.find((m) => m.id === mId)?.name).filter(Boolean);
                  return (
                    <div
                      key={p.id}
                      className="p-4 border-2 border-slate-200 hover:border-blue-500 rounded-xl flex items-center justify-between transition-all bg-white"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-slate-900">{p.name}</span>
                          {p.nickname && (
                            <span className="text-xs text-slate-700">({p.nickname})</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-700 flex items-center space-x-1">
                          <span className="font-semibold text-slate-700">Micros atuais:</span>
                          <span>{personMicros.join(', ') || 'Nenhum'}</span>
                        </div>
                        <div className="text-[11px] text-slate-700">
                          {p.functionPreferences.map((fp) => {
                            const fnName = allFunctions.find((f) => f.id === fp.functionId)?.name || 'Função';
                            return `${fnName} (${fp.experienceLevel})`;
                          }).join(' • ')}
                        </div>
                      </div>

                      <button
                        onClick={() => handleSelectExistingPerson(p)}
                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-xs transition-all shrink-0 ml-3"
                      >
                        ✓ É esta pessoa (Usar cadastro)
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center space-x-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Alterar Data de Nascimento</span>
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
                >
                  Não é nenhuma dessas pessoas — Criar novo cadastro
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 4: Personal Information ================= */}
          {step === 4 && (
            <div className="space-y-4">
              {potentialNameDuplicates.length > 0 && !isDuplicateNameWarningDismissed && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex items-start space-x-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-900">
                        ⚠️ Possível cadastro duplicado detectado por nome similar
                      </h4>
                      <p className="text-xs text-amber-800">
                        Já existe(m) pessoa(s) com nome parecido no MEVAM Kids:
                      </p>
                    </div>
                  </div>
                  <div className="pl-7 space-y-1 text-xs">
                    {potentialNameDuplicates.map((dup) => (
                      <div key={dup.id} className="flex items-center justify-between bg-white/70 p-2 rounded-lg border border-amber-200">
                        <div>
                          <strong>{dup.name}</strong> ({formatDateBR(dup.birthDate)})
                        </div>
                        <button
                          onClick={() => handleSelectExistingPerson(dup)}
                          className="text-[11px] font-bold text-blue-700 hover:underline"
                        >
                          Usar cadastro existente
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="pl-7">
                    <button
                      onClick={() => setIsDuplicateNameWarningDismissed(true)}
                      className="text-[11px] text-amber-900 font-semibold underline"
                    >
                      Ignorar alerta (É uma pessoa diferente / homônimo)
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    NOME COMPLETO *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Ex: João Silva"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    APELIDO / COMO GOSTA DE SER CHAMADO(A)
                  </label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Ex: João"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    DATA DE NASCIMENTO (DD/MM/AAAA) *
                  </label>
                  <div className="space-y-1">
                    <input
                      type="text"
                      value={birthDateBRInput}
                      onChange={(e) => {
                        const masked = maskDateBRInput(e.target.value);
                        setBirthDateBRInput(masked);
                        if (masked.length === 10 && isValidDateBR(masked)) {
                          setBirthDate(parseDateBRToISO(masked));
                        }
                      }}
                      placeholder="DD/MM/AAAA (Ex: 15/04/1990)"
                      maxLength={10}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(e) => {
                        setBirthDate(e.target.value);
                        setBirthDateBRInput(formatDateBR(e.target.value));
                      }}
                      className="w-full text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    WHATSAPP / TELEFONE *
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setWhatsapp(e.target.value.replace(/\D/g, ''));
                    }}
                    placeholder="Ex: (47) 99123-4567"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      E-MAIL
                    </label>
                    <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-1.5 py-0.2 rounded">
                      Opcional / Não obrigatório
                    </span>
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Opcional (não obrigatório)"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    FOTO / AVATAR (URL)
                  </label>
                  <input
                    type="text"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  OBSERVAÇÕES PRIVADAS DA LIDERANÇA
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Informações relevantes para coordenação..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>
          )}

          {/* ================= STEP 5: Select Micros ================= */}
          {step === 5 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Em quais Micros / Frentes esta pessoa pode servir?
                </h3>
                <p className="text-xs text-slate-700">
                  Uma pessoa pode servir em vários micros (Ex: Louvor + Segurança + Mídia).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {micros.map((micro) => {
                  const isChecked = selectedMicroIds.includes(micro.id);
                  return (
                    <div
                      key={micro.id}
                      onClick={() => handleToggleMicro(micro.id)}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-start space-x-3 ${
                        isChecked
                          ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center mt-0.5 shrink-0 ${
                          isChecked ? 'bg-indigo-600 text-white' : 'border border-slate-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900">{micro.name}</div>
                        <p className="text-[11px] text-slate-700 line-clamp-2 mt-0.5">{micro.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= STEP 6: Select Functions per Micro ================= */}
          {step === 6 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Quais funções {name || 'o voluntário'} desempenha em cada micro?
                </h3>
                <p className="text-xs text-slate-700">
                  Selecione as funções específicas configuradas para cada micro selecionado.
                </p>
              </div>

              {selectedMicroIds.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-700 bg-slate-50 rounded-xl">
                  Nenhum micro selecionado na etapa anterior. Volte e selecione pelo menos um micro.
                </div>
              ) : (
                selectedMicroIds.map((microId) => {
                  const micro = micros.find((m) => m.id === microId);
                  const microFunctions = allFunctions.filter((f) => f.microId === microId);

                  return (
                    <div key={microId} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex items-center space-x-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: micro?.color || '#4f46e5' }} />
                        <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                          {micro?.name}
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {microFunctions.map((fn) => {
                          const isFnSelected = functionPreferences.some(
                            (fp) => fp.microId === microId && fp.functionId === fn.id
                          );
                          return (
                            <div
                              key={fn.id}
                              onClick={() => handleToggleFunction(microId, fn.id)}
                              className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                                isFnSelected
                                  ? 'border-indigo-600 bg-white shadow-2xs text-indigo-900 font-bold'
                                  : 'border-slate-200 bg-white/70 hover:border-slate-300 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center space-x-2 text-xs">
                                <div
                                  className={`w-4 h-4 rounded flex items-center justify-center ${
                                    isFnSelected ? 'bg-indigo-600 text-white' : 'border border-slate-300'
                                  }`}
                                >
                                  {isFnSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                                <span>{fn.name}</span>
                              </div>
                              {fn.category && (
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-normal">
                                  {fn.category}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ================= STEP 7: Function-Specific Criteria Configuration ================= */}
          {step === 7 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Configurar Critérios e Preferências por Função
                </h3>
                <p className="text-xs text-slate-700">
                  Cada função possui critérios individuais de experiência, turno e faixa etária.
                </p>
              </div>

              {functionPreferences.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-700 bg-slate-50 rounded-xl">
                  Nenhuma função selecionada. Volte e marque as funções desejadas.
                </div>
              ) : (
                functionPreferences.map((pref) => {
                  const micro = micros.find((m) => m.id === pref.microId);
                  const fn = allFunctions.find((f) => f.id === pref.functionId);

                  return (
                    <div key={`${pref.microId}-${pref.functionId}`} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-extrabold text-indigo-700">{micro?.name}</span>
                          <span className="text-slate-400">→</span>
                          <span className="text-xs font-bold text-slate-900">{fn?.name}</span>
                        </div>
                        <span className="text-[11px] text-slate-700 font-medium">
                          Critérios do Assistente de Escala
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        {/* Experience Level */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            NÍVEL DE EXPERIÊNCIA
                          </label>
                          <select
                            value={pref.experienceLevel}
                            onChange={(e) => handleUpdatePref(pref.microId, pref.functionId, 'experienceLevel', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                          >
                            <option value="INICIANTE">Iniciante</option>
                            <option value="INTERMEDIARIO">Intermediário</option>
                            <option value="AVANCADO">Avançado</option>
                          </select>
                        </div>

                        {/* Preferred Shift */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            PREFERÊNCIA DE TURNO
                          </label>
                          <div className="flex items-center space-x-2 pt-1">
                            {['Manhã', 'Noite'].map((shift) => {
                              const isChecked = pref.preferredShifts.includes(shift);
                              return (
                                <button
                                  key={shift}
                                  type="button"
                                  onClick={() => {
                                    const next = isChecked
                                      ? pref.preferredShifts.filter((s) => s !== shift)
                                      : [...pref.preferredShifts, shift];
                                    handleUpdatePref(pref.microId, pref.functionId, 'preferredShifts', next);
                                  }}
                                  className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                                    isChecked
                                      ? 'bg-indigo-600 text-white border-indigo-600'
                                      : 'bg-white text-slate-700 border-slate-300'
                                  }`}
                                >
                                  {shift}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Preferred Days */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            PREFERÊNCIA DE DIA
                          </label>
                          <div className="flex items-center space-x-1.5 pt-1">
                            {['Domingo', 'Quarta'].map((day) => {
                              const isChecked = pref.preferredDays.includes(day);
                              return (
                                <button
                                  key={day}
                                  type="button"
                                  onClick={() => {
                                    const next = isChecked
                                      ? pref.preferredDays.filter((d) => d !== day)
                                      : [...pref.preferredDays, day];
                                    handleUpdatePref(pref.microId, pref.functionId, 'preferredDays', next);
                                  }}
                                  className={`px-2 py-1 rounded-md text-xs font-semibold border ${
                                    isChecked
                                      ? 'bg-indigo-600 text-white border-indigo-600'
                                      : 'bg-white text-slate-700 border-slate-300'
                                  }`}
                                >
                                  {day}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Age group criteria if function is teacher/auxiliary */}
                      {fn?.criteria?.hasAgeGroupPreference && (
                        <div className="pt-2 border-t border-slate-200">
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            FAIXAS ETÁRIAS PREFERENCIAIS EM SALA:
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              '3 a 6 anos',
                              '5 anos',
                              '6 anos',
                              '7 anos',
                              '8 anos',
                              '9 e 10 anos',
                              '11 e 12 anos'
                            ].map((ag) => {
                              const isAgChecked = pref.preferredAgeGroups?.includes(ag);
                              return (
                                <button
                                  key={ag}
                                  type="button"
                                  onClick={() => {
                                    const current = pref.preferredAgeGroups || [];
                                    const next = isAgChecked
                                      ? current.filter((g) => g !== ag)
                                      : [...current, ag];
                                    handleUpdatePref(pref.microId, pref.functionId, 'preferredAgeGroups', next);
                                  }}
                                  className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                                    isAgChecked
                                      ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                                  }`}
                                >
                                  {ag}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ================= STEP 8: Family Linkage ================= */}
          {step === 8 && (
            <div className="space-y-4">
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Heart className="w-5 h-5 text-rose-600" />
                    <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wider">
                      Vínculo Familiar no MEVAM Kids
                    </h4>
                  </div>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasFamilyMember}
                      onChange={(e) => setHasFamilyMember(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <span className="text-xs font-bold text-slate-800">
                      Possui familiar no MEVAM Kids
                    </span>
                  </label>
                </div>
                <p className="text-xs text-rose-800">
                  O sistema utiliza o vínculo familiar para pontuar positivamente que a família sirva no mesmo dia/culto quando ambos estiverem disponíveis.
                </p>
              </div>

              {hasFamilyMember && (
                <div className="space-y-4 pt-2">
                  {targetFamily && (
                    <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="text-xs text-indigo-900 font-semibold">Família Vinculada:</div>
                        <div className="text-sm font-bold text-indigo-950">{targetFamily.name}</div>
                        <div className="text-[11px] text-indigo-700">
                          Prioridade de servirem juntos: {targetFamily.priority}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setTargetFamily(null);
                          setSelectedFamilyMember(null);
                        }}
                        className="text-xs font-bold text-rose-600 hover:underline"
                      >
                        Trocar Familiar
                      </button>
                    </div>
                  )}

                  {!targetFamily && (
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700">
                        BUSCAR FAMILIAR JÁ CADASTRADO:
                      </label>
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          value={familySearchTerm}
                          onChange={(e) => setFamilySearchTerm(e.target.value)}
                          placeholder="Digite o nome do familiar (Ex: João Silva)..."
                          className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                        />
                      </div>

                      {familySearchTerm.trim().length > 1 && (
                        <div className="max-h-40 overflow-y-auto space-y-1.5 border border-slate-200 p-2 rounded-xl bg-slate-50">
                          {allPeople
                            .filter(
                              (p) =>
                                p.id !== initialPerson?.id &&
                                p.name.toLowerCase().includes(familySearchTerm.toLowerCase())
                            )
                            .map((p) => {
                              const pFam = p.familyId ? allFamilies.find((f) => f.id === p.familyId) : null;
                              return (
                                <div
                                  key={p.id}
                                  onClick={() => handleSelectFamilyMember(p)}
                                  className="p-2 bg-white rounded-lg border border-slate-200 hover:border-indigo-500 cursor-pointer flex items-center justify-between text-xs"
                                >
                                  <div>
                                    <span className="font-bold text-slate-900">{p.name}</span>
                                    <span className="text-slate-700 ml-2">({formatDateBR(p.birthDate)})</span>
                                    {pFam && (
                                      <span className="ml-2 text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded font-bold">
                                        {pFam.name}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-indigo-600 font-bold text-[11px]">Selecionar</span>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Navigation */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <div>
            {step > 1 && (
              <button
                onClick={() => setStep((prev) => (prev === 4 && matchingBirthDatePeople.length === 0 ? 1 : prev - 1))}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors flex items-center space-x-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Voltar</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Cancelar
            </button>

            {step < 8 ? (
              <button
                onClick={() => {
                  if (step === 1) handleBirthDateSubmit();
                  else if (step === 4 && (!name || !birthDate)) alert('Nome e Nascimento são obrigatórios.');
                  else setStep(step + 1);
                }}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-1.5"
              >
                <span>Avançar</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSaveVolunteer}
                className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition-all flex items-center space-x-1.5 active:scale-[0.98]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>FINALIZAR CADASTRO ÚNICO</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
