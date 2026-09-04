import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  UserPlus,
  Heart,
  ChevronRight,
  ChevronLeft,
  Search,
  Check,
  Briefcase,
  Layers,
  Sparkles,
  Plus,
  Trash2
} from 'lucide-react';
import { Person, Micro, MicroFunction, Family, PersonMicroFunctionPreference } from '../../types';
import { storageService } from '../../services/storageService';
import { formatDateBR, parseDateBRToISO, maskDateBRInput, isValidDateBR } from '../../utils/dateUtils';

interface VolunteerWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (person: Person) => void;
  onDeleted?: () => void;
  initialPerson?: Person | null;
}

export const VolunteerWizardModal: React.FC<VolunteerWizardModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  onDeleted,
  initialPerson
}) => {
  if (!isOpen) return null;

  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  // Always load live fresh micros and functions from storage
  const [micros, setMicros] = useState<Micro[]>([]);
  const [allFunctions, setAllFunctions] = useState<MicroFunction[]>([]);
  const [allPeople, setAllPeople] = useState<Person[]>([]);
  const [allFamilies, setAllFamilies] = useState<Family[]>([]);

  // Wizard Step: 1 = Dados Pessoais, 2 = Micros / Frentes, 3 = Funções & Preferências, 4 = Família & Finalização
  const [step, setStep] = useState<number>(1);

  // Form State
  const [name, setName] = useState(initialPerson?.name || '');
  const [nickname, setNickname] = useState(initialPerson?.nickname || '');
  const [birthDate, setBirthDate] = useState(initialPerson?.birthDate || '');
  const [birthDateInput, setBirthDateInput] = useState(
    initialPerson?.birthDate ? formatDateBR(initialPerson.birthDate) : ''
  );
  const [phone, setPhone] = useState(initialPerson?.phone || '');
  const [whatsapp, setWhatsapp] = useState(initialPerson?.whatsapp || '');
  const [email, setEmail] = useState(initialPerson?.email || '');
  const [notes, setNotes] = useState(initialPerson?.notes || '');
  const [avatarUrl, setAvatarUrl] = useState(initialPerson?.avatarUrl || '');

  // Live duplicate matches
  const [matchingBirthDatePeople, setMatchingBirthDatePeople] = useState<Person[]>([]);
  const [potentialNameDuplicates, setPotentialNameDuplicates] = useState<Person[]>([]);
  const [dismissedDuplicate, setDismissedDuplicate] = useState(false);

  // Selected Micros & Functions
  const [selectedMicroIds, setSelectedMicroIds] = useState<string[]>(initialPerson?.microIds || []);
  const [functionPreferences, setFunctionPreferences] = useState<PersonMicroFunctionPreference[]>(
    initialPerson?.functionPreferences || []
  );

  // Quick inline function addition
  const [newFunctionName, setNewFunctionName] = useState('');
  const [activeMicroForNewFn, setActiveMicroForNewFn] = useState<string | null>(null);

  // Family Linkage
  const [hasFamilyMember, setHasFamilyMember] = useState<boolean>(!!initialPerson?.familyId);
  const [familySearchTerm, setFamilySearchTerm] = useState('');
  const [selectedFamilyMember, setSelectedFamilyMember] = useState<Person | null>(null);
  const [targetFamily, setTargetFamily] = useState<Family | null>(
    initialPerson?.familyId ? storageService.getFamilyById(initialPerson.familyId) || null : null
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  // Reload data when opening modal
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setValidationError(null);
      return;
    }
    const loadedMicros = storageService.getMicros().filter((m) => m.status === 'ATIVO');
    const loadedFunctions = storageService.getFunctions();
    const loadedPeople = storageService.getPeople();
    const loadedFamilies = storageService.getFamilies();

    setMicros(loadedMicros);
    setAllFunctions(loadedFunctions);
    setAllPeople(loadedPeople);
    setAllFamilies(loadedFamilies);

    if (initialPerson) {
      setName(initialPerson.name || '');
      setNickname(initialPerson.nickname || '');
      setBirthDate(initialPerson.birthDate || '');
      setBirthDateInput(initialPerson.birthDate ? formatDateBR(initialPerson.birthDate) : '');
      setPhone(initialPerson.phone || '');
      setWhatsapp(initialPerson.whatsapp || '');
      setEmail(initialPerson.email || '');
      setNotes(initialPerson.notes || '');
      setAvatarUrl(initialPerson.avatarUrl || '');
      setSelectedMicroIds(initialPerson.microIds || []);
      setFunctionPreferences(initialPerson.functionPreferences || []);
      setHasFamilyMember(!!initialPerson.familyId);
      setTargetFamily(initialPerson.familyId ? storageService.getFamilyById(initialPerson.familyId) || null : null);
    } else {
      setName('');
      setNickname('');
      setBirthDate('');
      setBirthDateInput('');
      setPhone('');
      setWhatsapp('');
      setEmail('');
      setNotes('');
      setAvatarUrl('');
      setSelectedMicroIds([]);
      setFunctionPreferences([]);
      setHasFamilyMember(false);
      setTargetFamily(null);
    }
  }, [isOpen, initialPerson?.id]);

  // Handle Birth Date Changes (Single unified handler)
  const handleBirthDateChange = (val: string) => {
    const masked = maskDateBRInput(val);
    setBirthDateInput(masked);

    if (masked.length === 10 && isValidDateBR(masked)) {
      const iso = parseDateBRToISO(masked);
      setBirthDate(iso);
      const matches = storageService.findPeopleByBirthDate(iso).filter((p) => p.id !== initialPerson?.id);
      setMatchingBirthDatePeople(matches);
    } else {
      if (masked.length < 10) {
        setBirthDate('');
        setMatchingBirthDatePeople([]);
      }
    }
  };

  // Handle native date picker selection
  const handleNativeDateChange = (isoDate: string) => {
    setBirthDate(isoDate);
    setBirthDateInput(formatDateBR(isoDate));
    if (isoDate) {
      const matches = storageService.findPeopleByBirthDate(isoDate).filter((p) => p.id !== initialPerson?.id);
      setMatchingBirthDatePeople(matches);
    }
  };

  // Handle Name Changes
  const handleNameChange = (val: string) => {
    setName(val);
    if (val.trim().length >= 3) {
      const dups = storageService.findPotentialNameDuplicates(val, initialPerson?.id);
      setPotentialNameDuplicates(dups);
    } else {
      setPotentialNameDuplicates([]);
    }
  };

  // Select a matched existing volunteer to edit
  const handleLoadExistingPerson = (p: Person) => {
    setName(p.name);
    setNickname(p.nickname || '');
    setBirthDate(p.birthDate);
    setBirthDateInput(formatDateBR(p.birthDate));
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
    setMatchingBirthDatePeople([]);
    setPotentialNameDuplicates([]);
    setDismissedDuplicate(true);
  };

  // Toggle Micro selection
  const handleToggleMicro = (microId: string) => {
    if (selectedMicroIds.includes(microId)) {
      setSelectedMicroIds(selectedMicroIds.filter((id) => id !== microId));
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
        preferredShifts: ['Manhã', 'Noite'],
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

  // Quick add function
  const handleAddQuickFunction = (microId: string) => {
    if (!newFunctionName.trim()) return;
    const newFn: MicroFunction = {
      id: `fn-${Date.now()}`,
      microId,
      name: newFunctionName.trim(),
      category: 'Geral',
      defaultRequiredCount: 1,
      criteria: {
        hasShiftPreference: true,
        allowedShifts: ['Manhã', 'Noite']
      }
    };
    storageService.saveFunction(newFn);
    setAllFunctions(storageService.getFunctions());
    // Auto-select this new function for the volunteer
    handleToggleFunction(microId, newFn.id);
    setNewFunctionName('');
    setActiveMicroForNewFn(null);
  };

  // Handle Family member selection
  const handleSelectFamilyMember = (member: Person) => {
    setSelectedFamilyMember(member);
    if (member.familyId) {
      const fam = storageService.getFamilyById(member.familyId);
      setTargetFamily(fam || null);
    } else {
      const lastName = member.name.split(' ').slice(-1)[0] || 'Família';
      setTargetFamily({
        id: `fam-temp-${Date.now()}`,
        name: `Família ${lastName}`,
        priority: 'ALTA',
        createdAt: new Date().toISOString()
      });
    }
  };

  // Validation before advancing step
  const validateCurrentStep = (): boolean => {
    setValidationError(null);
    if (step === 1) {
      if (!name.trim()) {
        setValidationError('Por favor, informe o Nome Completo do voluntário.');
        return false;
      }
      if (!birthDate) {
        setValidationError('Por favor, informe uma Data de Nascimento válida (DD/MM/AAAA).');
        return false;
      }
      if (!phone.trim() && !whatsapp.trim()) {
        setValidationError('Por favor, informe o WhatsApp ou Telefone de contato.');
        return false;
      }
    }
    if (step === 2) {
      if (selectedMicroIds.length === 0) {
        setValidationError('Selecione pelo menos um Micro / Frente onde este voluntário atuará.');
        return false;
      }
    }
    return true;
  };

  // Final Save
  const handleSaveVolunteer = () => {
    setValidationError(null);
    if (!name || !birthDate) {
      setValidationError('Nome e Data de Nascimento são obrigatórios.');
      return;
    }

    let finalFamilyId = targetFamily?.id;

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
      email: email.trim() || undefined,
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

  const stepLabels = [
    { num: 1, label: 'Dados Pessoais' },
    { num: 2, label: 'Micros / Frentes' },
    { num: 3, label: 'Funções' },
    { num: 4, label: 'Família & Concluir' }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-display tracking-tight">
                {initialPerson ? 'Editar Cadastro de Voluntário' : 'Novo Cadastro Único de Voluntário'}
              </h2>
              <p className="text-xs text-slate-300">
                Cadastro centralizado MEVAM Kids — perfil único sem duplicidades
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

        {/* Streamlined Step Progress Indicator (4 Clean Steps) */}
        <div className="bg-slate-100 px-6 py-3 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600 font-semibold overflow-x-auto">
          {stepLabels.map((s, idx) => (
            <React.Fragment key={s.num}>
              <button
                type="button"
                onClick={() => {
                  if (s.num < step || validateCurrentStep()) {
                    setStep(s.num);
                  }
                }}
                className={`flex items-center space-x-2 shrink-0 transition-colors ${
                  step === s.num
                    ? 'text-blue-900 font-bold'
                    : step > s.num
                    ? 'text-emerald-700 font-semibold'
                    : 'text-slate-500'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                    step === s.num
                      ? 'bg-blue-600 text-white'
                      : step > s.num
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-300 text-slate-700'
                  }`}
                >
                  {step > s.num ? '✓' : s.num}
                </span>
                <span>{s.label}</span>
              </button>
              {idx < stepLabels.length - 1 && (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 mx-1" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Modal Body Content */}
        <div className="p-6 max-h-[65vh] overflow-y-auto">
          
          {/* ================= STEP 1: DADOS PESSOAIS (Single unified date field) ================= */}
          {step === 1 && (
            <div className="space-y-4">
              
              {/* Proactive Duplicate Alert (Only if duplicate found) */}
              {matchingBirthDatePeople.length > 0 && !dismissedDuplicate && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-amber-900">
                          Pessoa já cadastrada com esta data de nascimento ({birthDateInput}):
                        </h4>
                        <p className="text-xs text-amber-800">
                          {matchingBirthDatePeople.map((p) => p.name).join(', ')}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleLoadExistingPerson(matchingBirthDatePeople[0])}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shrink-0 shadow-2xs"
                    >
                      Carregar dados
                    </button>
                  </div>
                </div>
              )}

              {potentialNameDuplicates.length > 0 && !dismissedDuplicate && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2 text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Nome similar encontrado: <strong>{potentialNameDuplicates[0].name}</strong></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLoadExistingPerson(potentialNameDuplicates[0])}
                    className="text-xs font-bold text-blue-700 hover:underline"
                  >
                    Usar existente
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nome Completo */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    NOME COMPLETO *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Ex: João da Silva"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    autoFocus
                  />
                </div>

                {/* Apelido */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    COMO GOSTA DE SER CHAMADO(A)
                  </label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Ex: João"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                {/* Data de Nascimento - ÚNICO CAMPO INTUITIVO */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    DATA DE NASCIMENTO (DD/MM/AAAA) *
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={birthDateInput}
                      onChange={(e) => handleBirthDateChange(e.target.value)}
                      placeholder="Ex: 15/04/1992"
                      maxLength={10}
                      className="w-full pl-3.5 pr-10 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                    {/* Native hidden picker triggered via calendar icon button */}
                    <div className="absolute right-2.5 flex items-center">
                      <input
                        type="date"
                        value={birthDate}
                        onChange={(e) => handleNativeDateChange(e.target.value)}
                        className="opacity-0 absolute inset-0 cursor-pointer w-6 h-6"
                        tabIndex={-1}
                      />
                      <Calendar className="w-4 h-4 text-slate-400 hover:text-blue-600 pointer-events-none" />
                    </div>
                  </div>
                  {birthDate && (
                    <span className="text-[11px] text-emerald-700 font-medium mt-1 block">
                      ✓ Data confirmada: {formatDateBR(birthDate)}
                    </span>
                  )}
                </div>

                {/* WhatsApp / Telefone */}
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

                {/* E-mail (Opcional) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      E-MAIL
                    </label>
                    <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                      Opcional
                    </span>
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                {/* Observações da Liderança */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    OBSERVAÇÕES DA LIDERANÇA
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Informações adicionais para a equipe..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 2: MICROS / FRENTES ATIVAS ================= */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Em quais Micros / Frentes esta pessoa pode servir?
                </h3>
                <p className="text-xs text-slate-600">
                  Selecione uma ou mais frentes cadastradas no sistema MEVAM Kids:
                </p>
              </div>

              {micros.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                  Nenhuma micro equipe cadastrada. Acesse o menu <strong>Micro Equipes</strong> para cadastrar suas salas e frentes.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {micros.map((micro) => {
                    const isChecked = selectedMicroIds.includes(micro.id);
                    return (
                      <div
                        key={micro.id}
                        onClick={() => handleToggleMicro(micro.id)}
                        className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-start space-x-3 ${
                          isChecked
                            ? 'border-blue-600 bg-blue-50/60 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center mt-0.5 shrink-0 ${
                            isChecked ? 'bg-blue-600 text-white' : 'border border-slate-300 bg-white'
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: micro.color || '#2563eb' }}
                            />
                            <span className="font-bold text-xs text-slate-900 truncate">
                              {micro.name}
                            </span>
                          </div>
                          {micro.description && (
                            <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">
                              {micro.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ================= STEP 3: FUNÇÕES POR MICRO ================= */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Funções desempenhadas em cada Micro
                </h3>
                <p className="text-xs text-slate-600">
                  Defina as funções específicas e critérios de preferência de {name || 'voluntário'}:
                </p>
              </div>

              {selectedMicroIds.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-600 bg-slate-50 rounded-xl">
                  Nenhum micro selecionado. Volte e selecione pelo menos uma frente.
                </div>
              ) : (
                selectedMicroIds.map((microId) => {
                  const micro = micros.find((m) => m.id === microId);
                  const microFunctions = allFunctions.filter((f) => f.microId === microId);

                  return (
                    <div key={microId} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: micro?.color || '#2563eb' }} />
                          <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                            {micro?.name}
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveMicroForNewFn(activeMicroForNewFn === microId ? null : microId)}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+ Nova Função Rápida</span>
                        </button>
                      </div>

                      {/* Inline form to quickly add a custom function */}
                      {activeMicroForNewFn === microId && (
                        <div className="flex items-center space-x-2 p-2.5 bg-white rounded-lg border border-blue-200 shadow-2xs animate-in fade-in">
                          <input
                            type="text"
                            value={newFunctionName}
                            onChange={(e) => setNewFunctionName(e.target.value)}
                            placeholder="Nome da nova função (Ex: Teclado, Recepção)..."
                            className="flex-1 px-2.5 py-1 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleAddQuickFunction(microId)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-md"
                          >
                            Salvar
                          </button>
                        </div>
                      )}

                      {microFunctions.length === 0 ? (
                        <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-500 text-center">
                          Nenhuma função cadastrada para este micro ainda.{' '}
                          <button
                            type="button"
                            onClick={() => setActiveMicroForNewFn(microId)}
                            className="text-blue-600 font-bold hover:underline"
                          >
                            Criar primeira função
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {microFunctions.map((fn) => {
                            const isFnSelected = functionPreferences.some(
                              (fp) => fp.microId === microId && fp.functionId === fn.id
                            );
                            const pref = functionPreferences.find(
                              (fp) => fp.microId === microId && fp.functionId === fn.id
                            );

                            return (
                              <div
                                key={fn.id}
                                className={`p-3 rounded-lg border transition-all ${
                                  isFnSelected
                                    ? 'border-blue-600 bg-white shadow-2xs'
                                    : 'border-slate-200 bg-white/80 hover:border-slate-300'
                                }`}
                              >
                                <div
                                  onClick={() => handleToggleFunction(microId, fn.id)}
                                  className="flex items-center justify-between cursor-pointer"
                                >
                                  <div className="flex items-center space-x-2 text-xs">
                                    <div
                                      className={`w-4 h-4 rounded flex items-center justify-center ${
                                        isFnSelected ? 'bg-blue-600 text-white' : 'border border-slate-300'
                                      }`}
                                    >
                                      {isFnSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                    </div>
                                    <span className="font-bold text-slate-900">{fn.name}</span>
                                  </div>
                                  {fn.category && (
                                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                      {fn.category}
                                    </span>
                                  )}
                                </div>

                                {/* Preferences if function is checked */}
                                {isFnSelected && pref && (
                                  <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
                                    <div>
                                      <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">
                                        Experiência:
                                      </label>
                                      <select
                                        value={pref.experienceLevel}
                                        onChange={(e) =>
                                          handleUpdatePref(microId, fn.id, 'experienceLevel', e.target.value)
                                        }
                                        className="w-full px-1.5 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] font-medium"
                                      >
                                        <option value="INICIANTE">Iniciante</option>
                                        <option value="INTERMEDIARIO">Intermediário</option>
                                        <option value="AVANCADO">Avançado</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">
                                        Turno Preferido:
                                      </label>
                                      <div className="flex space-x-1">
                                        {['Manhã', 'Noite'].map((sh) => {
                                          const hasSh = pref.preferredShifts.includes(sh);
                                          return (
                                            <button
                                              key={sh}
                                              type="button"
                                              onClick={() => {
                                                const next = hasSh
                                                  ? pref.preferredShifts.filter((s) => s !== sh)
                                                  : [...pref.preferredShifts, sh];
                                                handleUpdatePref(microId, fn.id, 'preferredShifts', next);
                                              }}
                                              className={`flex-1 py-0.5 rounded text-[10px] font-bold border ${
                                                hasSh
                                                  ? 'bg-blue-600 text-white border-blue-600'
                                                  : 'bg-white text-slate-600 border-slate-200'
                                              }`}
                                            >
                                              {sh}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ================= STEP 4: FAMÍLIA & RESUMO ================= */}
          {step === 4 && (
            <div className="space-y-4">
              {/* Family Box */}
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Heart className="w-5 h-5 text-rose-600" />
                    <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wider">
                      Vínculo Familiar (Opcional)
                    </h4>
                  </div>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasFamilyMember}
                      onChange={(e) => setHasFamilyMember(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-xs font-bold text-slate-800">
                      Possui familiar no ministério
                    </span>
                  </label>
                </div>
                <p className="text-xs text-rose-800">
                  O sistema agrupa familiares para pontuar que sirvam no mesmo culto/turno quando desejado.
                </p>

                {hasFamilyMember && (
                  <div className="pt-2 space-y-2">
                    {targetFamily ? (
                      <div className="p-3 bg-white rounded-lg border border-rose-200 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-slate-900">{targetFamily.name}</div>
                          <span className="text-[10px] text-rose-700">Família associada com sucesso</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setTargetFamily(null);
                            setSelectedFamilyMember(null);
                          }}
                          className="text-xs font-bold text-rose-600 hover:underline"
                        >
                          Trocar
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="relative">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            value={familySearchTerm}
                            onChange={(e) => setFamilySearchTerm(e.target.value)}
                            placeholder="Buscar nome do familiar cadastrado..."
                            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                          />
                        </div>
                        {familySearchTerm.trim().length > 1 && (
                          <div className="max-h-36 overflow-y-auto space-y-1 mt-1.5 border border-slate-200 p-2 rounded-lg bg-white">
                            {allPeople
                              .filter((p) => p.id !== initialPerson?.id && p.name.toLowerCase().includes(familySearchTerm.toLowerCase()))
                              .map((p) => (
                                <div
                                  key={p.id}
                                  onClick={() => handleSelectFamilyMember(p)}
                                  className="p-1.5 hover:bg-rose-50 rounded cursor-pointer flex items-center justify-between text-xs"
                                >
                                  <span>{p.name}</span>
                                  <span className="text-blue-600 font-bold text-[11px]">Selecionar</span>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Summary Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Resumo do Cadastro
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
                  <div><strong>Nome:</strong> {name} {nickname ? `(${nickname})` : ''}</div>
                  <div><strong>Nascimento:</strong> {birthDateInput}</div>
                  <div><strong>WhatsApp:</strong> {phone}</div>
                  <div><strong>Micros:</strong> {selectedMicroIds.map((id) => micros.find((m) => m.id === id)?.name).filter(Boolean).join(', ') || 'Nenhum'}</div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Validation Error Banner */}
        {validationError && (
          <div className="mx-6 mb-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center space-x-2 animate-in fade-in slide-in-from-top-1">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Modal Footer Navigation */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors flex items-center space-x-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Voltar</span>
              </button>
            )}

            {initialPerson && (
              <button
                type="button"
                onClick={() => setIsConfirmDeleteOpen(true)}
                className="px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors flex items-center space-x-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Cadastro</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Cancelar
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={() => {
                  if (validateCurrentStep()) {
                    setStep(step + 1);
                  }
                }}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-1.5"
              >
                <span>Avançar</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSaveVolunteer}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition-all flex items-center space-x-1.5 active:scale-[0.98]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>SALVAR VOLUNTÁRIO</span>
              </button>
            )}
          </div>
        </div>

        {/* In-App Delete Confirmation Modal */}
        {isConfirmDeleteOpen && initialPerson && (
          <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Excluir Voluntário {initialPerson.name}?
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Esta ação removerá o cadastro do voluntário e todas as suas disponibilidades vinculadas.
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
                  onClick={() => {
                    storageService.deletePerson(initialPerson.id);
                    setIsConfirmDeleteOpen(false);
                    onClose();
                    onDeleted?.();
                  }}
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
