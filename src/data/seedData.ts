import {
  Micro,
  MicroFunction,
  Person,
  Family,
  AvailabilityRule,
  Schedule,
  UserAccount,
  RotationHistoryItem,
  AuditLog
} from '../types';

export const INITIAL_USERS: UserAccount[] = [
  {
    id: 'user-admin',
    name: 'Administrador',
    username: 'admin',
    email: 'admin@mevamkids.org',
    password: 'admin',
    role: 'ADMIN_LIDERANCA',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    whatsapp: ''
  }
];

export const INITIAL_MICROS: Micro[] = [
  {
    id: 'micro-lideranca',
    name: 'Liderança',
    description: 'Coordenação geral, acolhimento de famílias e suporte às frentes do MEVAM Kids.',
    leaderName: 'Pr. Denilson Santos',
    status: 'ATIVO',
    color: '#6366F1', // Indigo
    iconName: 'Crown',
    defaultShifts: ['Manhã', 'Noite'],
    algorithmWeights: {
      availability: 100,
      correctFunction: 100,
      volunteerPreference: 80,
      frequencyBalance: 90,
      recency: 80,
      rotation: 80,
      family: 60,
      experience: 60
    }
  },
  {
    id: 'micro-louvor',
    name: 'Louvor',
    description: 'Equipe responsável pela ministração do louvor e adoração no MEVAM Kids.',
    leaderName: 'Denilson',
    status: 'ATIVO',
    color: '#EC4899', // Pink
    iconName: 'Music',
    defaultShifts: ['Manhã', 'Noite'],
    algorithmWeights: {
      availability: 100,
      correctFunction: 100,
      volunteerPreference: 85,
      frequencyBalance: 85,
      recency: 75,
      rotation: 85,
      family: 50,
      experience: 70
    }
  },
  {
    id: 'micro-professor',
    name: 'Professor(a)',
    description: 'Ensino bíblico pedagógico dividido por faixas etárias de 3 a 12 anos.',
    leaderName: 'Roberta Lima',
    status: 'ATIVO',
    color: '#3B82F6', // Blue
    iconName: 'BookOpen',
    defaultShifts: ['Manhã', 'Noite'],
    algorithmWeights: {
      availability: 100,
      correctFunction: 100,
      volunteerPreference: 90,
      frequencyBalance: 90,
      recency: 80,
      rotation: 80,
      family: 60,
      experience: 80
    }
  },
  {
    id: 'micro-auxiliar',
    name: 'Auxiliar',
    description: 'Apoio em sala de aula, organização de materiais e cuidado individual das crianças.',
    leaderName: 'Camila Rocha',
    status: 'ATIVO',
    color: '#06B6D4', // Cyan
    iconName: 'HandHelping',
    defaultShifts: ['Manhã', 'Noite'],
    algorithmWeights: {
      availability: 100,
      correctFunction: 100,
      volunteerPreference: 80,
      frequencyBalance: 90,
      recency: 80,
      rotation: 75,
      family: 65,
      experience: 40
    }
  },
  {
    id: 'micro-midia',
    name: 'Mídia',
    description: 'Operação de projeção de letras, câmeras, transmissão e captação de fotos.',
    leaderName: 'Gabriel Ribeiro',
    status: 'ATIVO',
    color: '#8B5CF6', // Purple
    iconName: 'Tv',
    defaultShifts: ['Manhã', 'Noite'],
    algorithmWeights: {
      availability: 100,
      correctFunction: 100,
      volunteerPreference: 75,
      frequencyBalance: 85,
      recency: 70,
      rotation: 80,
      family: 40,
      experience: 75
    }
  },
  {
    id: 'micro-teatro',
    name: 'Teatro',
    description: 'Peças teatrais, fantoches e esquetes ilustrativas das mensagens bíblicas.',
    leaderName: 'Letícia Mendes',
    status: 'ATIVO',
    color: '#F59E0B', // Amber
    iconName: 'Sparkles',
    defaultShifts: ['Manhã', 'Noite'],
    algorithmWeights: {
      availability: 100,
      correctFunction: 100,
      volunteerPreference: 85,
      frequencyBalance: 80,
      recency: 75,
      rotation: 90,
      family: 55,
      experience: 65
    }
  },
  {
    id: 'micro-seguranca',
    name: 'Segurança',
    description: 'Monitoramento de entradas, portas de acesso e segurança das salas infantis.',
    leaderName: 'Marcos Oliveira',
    status: 'ATIVO',
    color: '#10B981', // Emerald
    iconName: 'ShieldCheck',
    defaultShifts: ['Manhã', 'Noite'],
    algorithmWeights: {
      availability: 100,
      correctFunction: 100,
      volunteerPreference: 80,
      frequencyBalance: 90,
      recency: 80,
      rotation: 70,
      family: 50,
      experience: 60
    }
  },
  {
    id: 'micro-refeitorio',
    name: 'Refeitório',
    description: 'Preparo dos lanches, distribuição de pipoca e higienização do refeitório infantil.',
    leaderName: 'Juliana Santos',
    status: 'ATIVO',
    color: '#EF4444', // Red / Rose
    iconName: 'Utensils',
    defaultShifts: ['Manhã', 'Noite'],
    algorithmWeights: {
      availability: 100,
      correctFunction: 100,
      volunteerPreference: 70,
      frequencyBalance: 90,
      recency: 80,
      rotation: 75,
      family: 70,
      experience: 30
    }
  },
  {
    id: 'micro-recepcao',
    name: 'Recepção',
    description: 'Check-in das crianças, pulseiras de identificação e acolhimento dos visitantes.',
    leaderName: 'Ana Paula Ferreira',
    status: 'ATIVO',
    color: '#14B8A6', // Teal
    iconName: 'UserCheck',
    defaultShifts: ['Manhã', 'Noite'],
    algorithmWeights: {
      availability: 100,
      correctFunction: 100,
      volunteerPreference: 80,
      frequencyBalance: 85,
      recency: 80,
      rotation: 80,
      family: 60,
      experience: 50
    }
  }
];

export const INITIAL_FUNCTIONS: MicroFunction[] = [
  // Liderança
  {
    id: 'fn-lid-geral',
    microId: 'micro-lideranca',
    name: 'Líder Geral',
    category: 'Coordenação',
    defaultRequiredCount: 1,
    criteria: {
      hasShiftPreference: true,
      allowedShifts: ['Manhã', 'Noite'],
      hasDayPreference: true,
      allowedDays: ['Domingo', 'Quarta'],
      requiresExperience: true
    }
  },
  {
    id: 'fn-lid-apoio',
    microId: 'micro-lideranca',
    name: 'Apoio de Liderança',
    category: 'Coordenação',
    defaultRequiredCount: 1,
    criteria: {
      hasShiftPreference: true,
      allowedShifts: ['Manhã', 'Noite'],
      hasDayPreference: true,
      allowedDays: ['Domingo']
    }
  },

  // Louvor
  {
    id: 'fn-louvor-vocal',
    microId: 'micro-louvor',
    name: 'Vocal',
    category: 'Voz',
    defaultRequiredCount: 4,
    criteria: {
      hasShiftPreference: true,
      allowedShifts: ['Manhã', 'Noite'],
      hasDayPreference: true,
      allowedDays: ['Domingo', 'Quarta']
    }
  },
  {
    id: 'fn-louvor-kids',
    microId: 'micro-louvor',
    name: 'Kids (Ministração Infantil)',
    category: 'Ministração',
    defaultRequiredCount: 1,
    criteria: {
      hasAgeGroupPreference: true,
      allowedAgeGroups: ['3 a 6 anos', '7 a 12 anos'],
      hasShiftPreference: true,
      allowedShifts: ['Manhã', 'Noite']
    }
  },
  {
    id: 'fn-louvor-violao',
    microId: 'micro-louvor',
    name: 'Violão',
    category: 'Instrumental',
    defaultRequiredCount: 1,
    criteria: {
      hasShiftPreference: true,
      allowedShifts: ['Manhã', 'Noite'],
      requiresExperience: true
    }
  },
  {
    id: 'fn-louvor-teclado',
    microId: 'micro-louvor',
    name: 'Teclado',
    category: 'Instrumental',
    defaultRequiredCount: 1,
    criteria: {
      hasShiftPreference: true,
      allowedShifts: ['Manhã', 'Noite'],
      requiresExperience: true
    }
  },
  {
    id: 'fn-louvor-baixo',
    microId: 'micro-louvor',
    name: 'Baixo',
    category: 'Instrumental',
    defaultRequiredCount: 1,
    criteria: {
      hasShiftPreference: true,
      allowedShifts: ['Manhã', 'Noite']
    }
  },
  {
    id: 'fn-louvor-cajon',
    microId: 'micro-louvor',
    name: 'Cajon',
    category: 'Percussão',
    defaultRequiredCount: 1,
    criteria: {
      hasShiftPreference: true,
      allowedShifts: ['Manhã', 'Noite']
    }
  },
  {
    id: 'fn-louvor-bateria',
    microId: 'micro-louvor',
    name: 'Bateria',
    category: 'Percussão',
    defaultRequiredCount: 1,
    criteria: {
      hasShiftPreference: true,
      allowedShifts: ['Manhã', 'Noite']
    }
  },
  {
    id: 'fn-louvor-som',
    microId: 'micro-louvor',
    name: 'Som / Mesa de Áudio',
    category: 'Técnica',
    defaultRequiredCount: 1,
    criteria: {
      hasShiftPreference: true,
      allowedShifts: ['Manhã', 'Noite'],
      requiresExperience: true
    }
  },

  // Professores (Configurados por Faixa Etária)
  {
    id: 'fn-prof-3-6',
    microId: 'micro-professor',
    name: 'Professor 3 a 6 anos',
    category: 'Salas',
    defaultRequiredCount: 1,
    criteria: {
      hasAgeGroupPreference: true,
      allowedAgeGroups: ['3 a 6 anos'],
      hasShiftPreference: true,
      allowedShifts: ['Manhã', 'Noite'],
      hasDayPreference: true,
      allowedDays: ['Domingo']
    }
  },
  {
    id: 'fn-prof-5',
    microId: 'micro-professor',
    name: 'Professor 5 anos',
    category: 'Salas',
    defaultRequiredCount: 1,
    criteria: {
      hasAgeGroupPreference: true,
      allowedAgeGroups: ['5 anos'],
      hasShiftPreference: true,
      allowedShifts: ['Manhã', 'Noite']
    }
  },
  {
    id: 'fn-prof-6',
    microId: 'micro-professor',
    name: 'Professor 6 anos',
    category: 'Salas',
    defaultRequiredCount: 1,
    criteria: {
      hasAgeGroupPreference: true,
      allowedAgeGroups: ['6 anos'],
      hasShiftPreference: true,
      allowedShifts: ['Manhã', 'Noite']
    }
  },
  {
    id: 'fn-prof-7',
    microId: 'micro-professor',
    name: 'Professor 7 anos',
    category: 'Salas',
    defaultRequiredCount: 1,
    criteria: {
      hasAgeGroupPreference: true,
      allowedAgeGroups: ['7 anos'],
      hasShiftPreference: true,
      allowedShifts: ['Manhã', 'Noite']
    }
  },
  {
    id: 'fn-prof-8',
    microId: 'micro-professor',
    name: 'Professor 8 anos',
    category: 'Salas',
    defaultRequiredCount: 1,
    criteria: {
      hasAgeGroupPreference: true,
      allowedAgeGroups: ['8 anos'],
      hasShiftPreference: true,
      allowedShifts: ['Manhã', 'Noite']
    }
  },
  {
    id: 'fn-prof-9-10',
    microId: 'micro-professor',
    name: 'Professor 9 e 10 anos',
    category: 'Salas',
    defaultRequiredCount: 1,
    criteria: {
      hasAgeGroupPreference: true,
      allowedAgeGroups: ['9 e 10 anos'],
      hasShiftPreference: true,
      allowedShifts: ['Manhã', 'Noite']
    }
  },
  {
    id: 'fn-prof-11-12',
    microId: 'micro-professor',
    name: 'Professor 11 e 12 anos',
    category: 'Salas',
    defaultRequiredCount: 1,
    criteria: {
      hasAgeGroupPreference: true,
      allowedAgeGroups: ['11 e 12 anos'],
      hasShiftPreference: true,
      allowedShifts: ['Manhã', 'Noite']
    }
  },

  // Auxiliares
  {
    id: 'fn-aux-3-6',
    microId: 'micro-auxiliar',
    name: 'Auxiliar 3 a 6 anos',
    category: 'Salas',
    defaultRequiredCount: 2,
    criteria: {
      hasAgeGroupPreference: true,
      allowedAgeGroups: ['3 a 6 anos'],
      hasShiftPreference: true,
      allowedShifts: ['Manhã', 'Noite']
    }
  },
  {
    id: 'fn-aux-5',
    microId: 'micro-auxiliar',
    name: 'Auxiliar 5 anos',
    category: 'Salas',
    defaultRequiredCount: 2,
    criteria: {
      hasAgeGroupPreference: true,
      allowedAgeGroups: ['5 anos'],
      hasShiftPreference: true,
      allowedShifts: ['Manhã', 'Noite']
    }
  },
  {
    id: 'fn-aux-6',
    microId: 'micro-auxiliar',
    name: 'Auxiliar 6 anos',
    category: 'Salas',
    defaultRequiredCount: 2,
    criteria: {
      hasAgeGroupPreference: true,
      allowedAgeGroups: ['6 anos'],
      hasShiftPreference: true,
      allowedShifts: ['Manhã', 'Noite']
    }
  },
  {
    id: 'fn-aux-7',
    microId: 'micro-auxiliar',
    name: 'Auxiliar 7 anos',
    category: 'Salas',
    defaultRequiredCount: 2,
    criteria: {
      hasAgeGroupPreference: true,
      allowedAgeGroups: ['7 anos'],
      hasShiftPreference: true,
      allowedShifts: ['Manhã', 'Noite']
    }
  },
  {
    id: 'fn-aux-8',
    microId: 'micro-auxiliar',
    name: 'Auxiliar 8 anos',
    category: 'Salas',
    defaultRequiredCount: 2,
    criteria: {
      hasAgeGroupPreference: true,
      allowedAgeGroups: ['8 anos'],
      hasShiftPreference: true,
      allowedShifts: ['Manhã', 'Noite']
    }
  },
  {
    id: 'fn-aux-9-10',
    microId: 'micro-auxiliar',
    name: 'Auxiliar 9 e 10 anos',
    category: 'Salas',
    defaultRequiredCount: 3,
    criteria: {
      hasAgeGroupPreference: true,
      allowedAgeGroups: ['9 e 10 anos'],
      hasShiftPreference: true,
      allowedShifts: ['Manhã', 'Noite']
    }
  },
  {
    id: 'fn-aux-11-12',
    microId: 'micro-auxiliar',
    name: 'Auxiliar 11 e 12 anos',
    category: 'Salas',
    defaultRequiredCount: 1,
    criteria: {
      hasAgeGroupPreference: true,
      allowedAgeGroups: ['11 e 12 anos'],
      hasShiftPreference: true,
      allowedShifts: ['Manhã', 'Noite']
    }
  },

  // Refeitório
  {
    id: 'fn-ref-pipoca',
    microId: 'micro-refeitorio',
    name: 'Pipoca',
    category: 'Lanches',
    defaultRequiredCount: 1,
    criteria: {
      hasShiftPreference: true,
      allowedShifts: ['Manhã', 'Noite']
    }
  },
  {
    id: 'fn-ref-distribuicao',
    microId: 'micro-refeitorio',
    name: 'Distribuição e Lanche',
    category: 'Lanches',
    defaultRequiredCount: 2,
    criteria: {
      hasShiftPreference: true,
      allowedShifts: ['Manhã', 'Noite']
    }
  },

  // Mídia
  {
    id: 'fn-mid-proj',
    microId: 'micro-midia',
    name: 'Projeção',
    category: 'Operação',
    defaultRequiredCount: 1,
    criteria: {
      hasShiftPreference: true,
      allowedShifts: ['Manhã', 'Noite']
    }
  },
  {
    id: 'fn-mid-cam',
    microId: 'micro-midia',
    name: 'Câmera / Transmissão',
    category: 'Operação',
    defaultRequiredCount: 1,
    criteria: {
      hasShiftPreference: true,
      allowedShifts: ['Manhã', 'Noite']
    }
  },
  {
    id: 'fn-mid-foto',
    microId: 'micro-midia',
    name: 'Fotografia',
    category: 'Captação',
    defaultRequiredCount: 1,
    criteria: {
      hasShiftPreference: true,
      allowedShifts: ['Manhã', 'Noite']
    }
  },

  // Segurança
  {
    id: 'fn-seg-geral',
    microId: 'micro-seguranca',
    name: 'Segurança das Salas',
    category: 'Postos',
    defaultRequiredCount: 2,
    criteria: {
      hasShiftPreference: true,
      allowedShifts: ['Manhã', 'Noite']
    }
  },
  {
    id: 'fn-seg-entrada',
    microId: 'micro-seguranca',
    name: 'Entrada / Portão Kids',
    category: 'Postos',
    defaultRequiredCount: 1,
    criteria: {
      hasShiftPreference: true,
      allowedShifts: ['Manhã', 'Noite']
    }
  },
  {
    id: 'fn-seg-apoio',
    microId: 'micro-seguranca',
    name: 'Apoio de Pátio',
    category: 'Postos',
    defaultRequiredCount: 1,
    criteria: {
      hasShiftPreference: true,
      allowedShifts: ['Manhã', 'Noite']
    }
  },

  // Teatro
  {
    id: 'fn-tea-ator',
    microId: 'micro-teatro',
    name: 'Ator / Atriz',
    category: 'Palco',
    defaultRequiredCount: 2,
    criteria: {
      hasShiftPreference: true,
      allowedShifts: ['Manhã', 'Noite']
    }
  },
  {
    id: 'fn-tea-fantoche',
    microId: 'micro-teatro',
    name: 'Manipulação de Fantoche',
    category: 'Palco',
    defaultRequiredCount: 2,
    criteria: {
      hasShiftPreference: true,
      allowedShifts: ['Manhã', 'Noite']
    }
  },

  // Recepção
  {
    id: 'fn-rec-checkin',
    microId: 'micro-recepcao',
    name: 'Check-in e Pulseiras',
    category: 'Acolhimento',
    defaultRequiredCount: 2,
    criteria: {
      hasShiftPreference: true,
      allowedShifts: ['Manhã', 'Noite']
    }
  }
];

export const INITIAL_FAMILIES: Family[] = [
  {
    id: 'fam-silva',
    name: 'Família Silva',
    priority: 'ALTA',
    notes: 'Pais e filho servindo juntos aos domingos.',
    createdAt: '2026-01-10T10:00:00Z'
  },
  {
    id: 'fam-ferreira',
    name: 'Família Ferreira',
    priority: 'MEDIA',
    notes: 'Casal que prefere servir nos mesmos horários de culto.',
    createdAt: '2026-02-15T14:30:00Z'
  },
  {
    id: 'fam-santos',
    name: 'Família Santos',
    priority: 'MUITO_ALTA',
    notes: 'Família pastoral / liderança MEVAM Kids.',
    createdAt: '2026-01-05T08:00:00Z'
  }
];

export const INITIAL_PEOPLE: Person[] = [
  {
    id: 'p-denilson',
    name: 'Denilson Silva Santos',
    nickname: 'Denilson',
    birthDate: '1988-09-02', // Birthday soon!
    phone: '(47) 99887-1122',
    whatsapp: '47998871122',
    email: 'denilson.silva.santos@gmail.com',
    familyId: 'fam-santos',
    active: true,
    microIds: ['micro-lideranca', 'micro-louvor', 'micro-midia'],
    functionPreferences: [
      {
        microId: 'micro-lideranca',
        functionId: 'fn-lid-geral',
        experienceLevel: 'AVANCADO',
        preferredShifts: ['Manhã', 'Noite'],
        preferredDays: ['Domingo']
      },
      {
        microId: 'micro-louvor',
        functionId: 'fn-louvor-som',
        experienceLevel: 'AVANCADO',
        preferredShifts: ['Manhã', 'Noite'],
        preferredDays: ['Domingo']
      },
      {
        microId: 'micro-louvor',
        functionId: 'fn-louvor-vocal',
        experienceLevel: 'AVANCADO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo']
      },
      {
        microId: 'micro-midia',
        functionId: 'fn-mid-proj',
        experienceLevel: 'INTERMEDIARIO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo']
      }
    ],
    createdAt: '2026-01-05T09:00:00Z',
    updatedAt: '2026-01-05T09:00:00Z'
  },
  {
    id: 'p-joao-silva',
    name: 'João Silva',
    nickname: 'João',
    birthDate: '1990-04-15',
    phone: '(47) 99123-4567',
    whatsapp: '47991234567',
    email: 'joao.silva@mevamkids.org',
    familyId: 'fam-silva',
    active: true,
    microIds: ['micro-louvor', 'micro-seguranca', 'micro-midia', 'micro-professor'],
    functionPreferences: [
      {
        microId: 'micro-louvor',
        functionId: 'fn-louvor-vocal',
        experienceLevel: 'INTERMEDIARIO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo']
      },
      {
        microId: 'micro-louvor',
        functionId: 'fn-louvor-violao',
        experienceLevel: 'AVANCADO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo']
      },
      {
        microId: 'micro-louvor',
        functionId: 'fn-louvor-baixo',
        experienceLevel: 'INICIANTE',
        preferredShifts: ['Manhã'],
        preferredDays: ['Domingo']
      },
      {
        microId: 'micro-seguranca',
        functionId: 'fn-seg-geral',
        experienceLevel: 'INTERMEDIARIO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo']
      },
      {
        microId: 'micro-midia',
        functionId: 'fn-mid-proj',
        experienceLevel: 'AVANCADO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo']
      },
      {
        microId: 'micro-professor',
        functionId: 'fn-prof-9-10',
        experienceLevel: 'AVANCADO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo'],
        preferredAgeGroups: ['9 e 10 anos']
      }
    ],
    createdAt: '2026-01-10T10:15:00Z',
    updatedAt: '2026-01-10T10:15:00Z'
  },
  {
    id: 'p-maria-silva',
    name: 'Maria Silva',
    nickname: 'Maria',
    birthDate: '1992-08-22',
    phone: '(47) 99123-9988',
    whatsapp: '47991239988',
    email: 'maria.silva@mevamkids.org',
    familyId: 'fam-silva',
    active: true,
    microIds: ['micro-professor', 'micro-auxiliar', 'micro-louvor'],
    functionPreferences: [
      {
        microId: 'micro-professor',
        functionId: 'fn-prof-3-6',
        experienceLevel: 'AVANCADO',
        preferredShifts: ['Manhã', 'Noite'],
        preferredDays: ['Domingo'],
        preferredAgeGroups: ['3 a 6 anos']
      },
      {
        microId: 'micro-professor',
        functionId: 'fn-prof-9-10',
        experienceLevel: 'AVANCADO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo'],
        preferredAgeGroups: ['9 e 10 anos']
      },
      {
        microId: 'micro-auxiliar',
        functionId: 'fn-aux-3-6',
        experienceLevel: 'AVANCADO',
        preferredShifts: ['Manhã'],
        preferredDays: ['Domingo']
      },
      {
        microId: 'micro-louvor',
        functionId: 'fn-louvor-vocal',
        experienceLevel: 'INTERMEDIARIO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo']
      }
    ],
    createdAt: '2026-01-10T11:00:00Z',
    updatedAt: '2026-01-10T11:00:00Z'
  },
  {
    id: 'p-pedro-silva',
    name: 'Pedro Silva',
    nickname: 'Pedro',
    birthDate: '2008-03-10',
    phone: '(47) 99123-5544',
    whatsapp: '47991235544',
    email: 'pedro.silva@mevamkids.org',
    familyId: 'fam-silva',
    active: true,
    microIds: ['micro-auxiliar', 'micro-refeitorio'],
    functionPreferences: [
      {
        microId: 'micro-auxiliar',
        functionId: 'fn-aux-9-10',
        experienceLevel: 'INTERMEDIARIO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo']
      },
      {
        microId: 'micro-refeitorio',
        functionId: 'fn-ref-pipoca',
        experienceLevel: 'AVANCADO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo']
      }
    ],
    createdAt: '2026-01-10T11:30:00Z',
    updatedAt: '2026-01-10T11:30:00Z'
  },
  {
    id: 'p-ana-paula',
    name: 'Ana Paula Ferreira',
    nickname: 'Ana Paula',
    birthDate: '1995-09-12', // Birthday in September
    phone: '(47) 98844-3322',
    whatsapp: '47988443322',
    email: 'anapaula@mevamkids.org',
    familyId: 'fam-ferreira',
    active: true,
    microIds: ['micro-professor', 'micro-teatro', 'micro-recepcao'],
    functionPreferences: [
      {
        microId: 'micro-professor',
        functionId: 'fn-prof-5',
        experienceLevel: 'AVANCADO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo'],
        preferredAgeGroups: ['5 anos']
      },
      {
        microId: 'micro-teatro',
        functionId: 'fn-tea-fantoche',
        experienceLevel: 'AVANCADO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo']
      },
      {
        microId: 'micro-recepcao',
        functionId: 'fn-rec-checkin',
        experienceLevel: 'INTERMEDIARIO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo']
      }
    ],
    createdAt: '2026-02-15T15:00:00Z',
    updatedAt: '2026-02-15T15:00:00Z'
  },
  {
    id: 'p-lucas-souza',
    name: 'Lucas Souza',
    nickname: 'Lucas',
    birthDate: '1998-11-04',
    phone: '(47) 99771-8822',
    whatsapp: '47997718822',
    email: 'lucas.souza@mevamkids.org',
    active: true,
    microIds: ['micro-louvor', 'micro-seguranca'],
    functionPreferences: [
      {
        microId: 'micro-louvor',
        functionId: 'fn-louvor-teclado',
        experienceLevel: 'AVANCADO',
        preferredShifts: ['Manhã', 'Noite'],
        preferredDays: ['Domingo']
      },
      {
        microId: 'micro-louvor',
        functionId: 'fn-louvor-baixo',
        experienceLevel: 'INTERMEDIARIO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo']
      },
      {
        microId: 'micro-seguranca',
        functionId: 'fn-seg-entrada',
        experienceLevel: 'INTERMEDIARIO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo']
      }
    ],
    createdAt: '2026-02-18T10:00:00Z',
    updatedAt: '2026-02-18T10:00:00Z'
  },
  {
    id: 'p-marcos-oliveira',
    name: 'Marcos Oliveira',
    nickname: 'Marcos',
    birthDate: '1989-05-30',
    phone: '(47) 99655-4433',
    whatsapp: '47996554433',
    email: 'marcos.oliveira@mevamkids.org',
    familyId: 'fam-ferreira',
    active: true,
    microIds: ['micro-seguranca', 'micro-midia'],
    functionPreferences: [
      {
        microId: 'micro-seguranca',
        functionId: 'fn-seg-geral',
        experienceLevel: 'AVANCADO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo']
      },
      {
        microId: 'micro-seguranca',
        functionId: 'fn-seg-entrada',
        experienceLevel: 'AVANCADO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo']
      },
      {
        microId: 'micro-midia',
        functionId: 'fn-mid-cam',
        experienceLevel: 'INTERMEDIARIO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo']
      }
    ],
    createdAt: '2026-02-15T15:30:00Z',
    updatedAt: '2026-02-15T15:30:00Z'
  },
  {
    id: 'p-juliana-santos',
    name: 'Juliana Santos',
    nickname: 'Ju',
    birthDate: '1991-09-01', // Birthday tomorrow!
    phone: '(47) 99887-3344',
    whatsapp: '47998873344',
    email: 'juliana.santos@mevamkids.org',
    familyId: 'fam-santos',
    active: true,
    microIds: ['micro-refeitorio', 'micro-recepcao', 'micro-auxiliar'],
    functionPreferences: [
      {
        microId: 'micro-refeitorio',
        functionId: 'fn-ref-distribuicao',
        experienceLevel: 'AVANCADO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo']
      },
      {
        microId: 'micro-refeitorio',
        functionId: 'fn-ref-pipoca',
        experienceLevel: 'AVANCADO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo']
      },
      {
        microId: 'micro-recepcao',
        functionId: 'fn-rec-checkin',
        experienceLevel: 'AVANCADO',
        preferredShifts: ['Manhã', 'Noite'],
        preferredDays: ['Domingo']
      },
      {
        microId: 'micro-auxiliar',
        functionId: 'fn-aux-5',
        experienceLevel: 'INTERMEDIARIO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo']
      }
    ],
    createdAt: '2026-01-05T09:30:00Z',
    updatedAt: '2026-01-05T09:30:00Z'
  },
  {
    id: 'p-gabriel-ribeiro',
    name: 'Gabriel Ribeiro',
    nickname: 'Biel',
    birthDate: '1997-12-19',
    phone: '(47) 99344-7711',
    whatsapp: '47993447711',
    email: 'gabriel.ribeiro@mevamkids.org',
    active: true,
    microIds: ['micro-midia', 'micro-louvor'],
    functionPreferences: [
      {
        microId: 'micro-midia',
        functionId: 'fn-mid-cam',
        experienceLevel: 'AVANCADO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo']
      },
      {
        microId: 'micro-midia',
        functionId: 'fn-mid-foto',
        experienceLevel: 'AVANCADO',
        preferredShifts: ['Manhã', 'Noite'],
        preferredDays: ['Domingo']
      },
      {
        microId: 'micro-louvor',
        functionId: 'fn-louvor-cajon',
        experienceLevel: 'INTERMEDIARIO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo']
      },
      {
        microId: 'micro-louvor',
        functionId: 'fn-louvor-bateria',
        experienceLevel: 'INTERMEDIARIO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo']
      }
    ],
    createdAt: '2026-02-20T14:00:00Z',
    updatedAt: '2026-02-20T14:00:00Z'
  },
  {
    id: 'p-beatriz-costa',
    name: 'Beatriz Costa',
    nickname: 'Bia',
    birthDate: '1994-07-14',
    phone: '(47) 99222-1144',
    whatsapp: '47992221144',
    email: 'beatriz.costa@mevamkids.org',
    active: true,
    microIds: ['micro-professor', 'micro-auxiliar'],
    functionPreferences: [
      {
        microId: 'micro-professor',
        functionId: 'fn-prof-7',
        experienceLevel: 'AVANCADO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo'],
        preferredAgeGroups: ['7 anos']
      },
      {
        microId: 'micro-professor',
        functionId: 'fn-prof-8',
        experienceLevel: 'AVANCADO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo'],
        preferredAgeGroups: ['8 anos']
      },
      {
        microId: 'micro-auxiliar',
        functionId: 'fn-aux-7',
        experienceLevel: 'AVANCADO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo']
      }
    ],
    createdAt: '2026-02-22T11:00:00Z',
    updatedAt: '2026-02-22T11:00:00Z'
  },
  {
    id: 'p-carlos-lima',
    name: 'Carlos Eduardo Lima',
    nickname: 'Cadu',
    birthDate: '1985-08-31', // Today is his birthday! (local time is 31 Aug)
    phone: '(47) 99444-8899',
    whatsapp: '47994448899',
    email: 'cadu.lima@mevamkids.org',
    active: true,
    microIds: ['micro-lideranca', 'micro-seguranca'],
    functionPreferences: [
      {
        microId: 'micro-lideranca',
        functionId: 'fn-lid-apoio',
        experienceLevel: 'AVANCADO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo']
      },
      {
        microId: 'micro-seguranca',
        functionId: 'fn-seg-apoio',
        experienceLevel: 'AVANCADO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo']
      }
    ],
    createdAt: '2026-01-20T08:00:00Z',
    updatedAt: '2026-01-20T08:00:00Z'
  },
  {
    id: 'p-leticia-mendes',
    name: 'Letícia Mendes',
    nickname: 'Lê',
    birthDate: '1996-03-25',
    phone: '(47) 99555-6677',
    whatsapp: '47995556677',
    email: 'leticia.mendes@mevamkids.org',
    active: true,
    microIds: ['micro-teatro', 'micro-professor', 'micro-louvor'],
    functionPreferences: [
      {
        microId: 'micro-teatro',
        functionId: 'fn-tea-ator',
        experienceLevel: 'AVANCADO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo']
      },
      {
        microId: 'micro-teatro',
        functionId: 'fn-tea-fantoche',
        experienceLevel: 'AVANCADO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo']
      },
      {
        microId: 'micro-professor',
        functionId: 'fn-prof-11-12',
        experienceLevel: 'INTERMEDIARIO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo'],
        preferredAgeGroups: ['11 e 12 anos']
      },
      {
        microId: 'micro-louvor',
        functionId: 'fn-louvor-vocal',
        experienceLevel: 'INTERMEDIARIO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo']
      }
    ],
    createdAt: '2026-02-25T16:00:00Z',
    updatedAt: '2026-02-25T16:00:00Z'
  },
  {
    id: 'p-rafael-moreira',
    name: 'Rafael Moreira',
    nickname: 'Rafa',
    birthDate: '1993-10-18',
    phone: '(47) 99888-2211',
    whatsapp: '47998882211',
    email: 'rafael.moreira@mevamkids.org',
    active: true,
    microIds: ['micro-louvor', 'micro-midia'],
    functionPreferences: [
      {
        microId: 'micro-louvor',
        functionId: 'fn-louvor-baixo',
        experienceLevel: 'AVANCADO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo']
      },
      {
        microId: 'micro-louvor',
        functionId: 'fn-louvor-vocal',
        experienceLevel: 'INTERMEDIARIO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo']
      },
      {
        microId: 'micro-midia',
        functionId: 'fn-mid-foto',
        experienceLevel: 'INTERMEDIARIO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo']
      }
    ],
    createdAt: '2026-03-01T09:00:00Z',
    updatedAt: '2026-03-01T09:00:00Z'
  },
  {
    id: 'p-camila-rocha',
    name: 'Camila Rocha',
    nickname: 'Cami',
    birthDate: '1992-06-08',
    phone: '(47) 99777-3366',
    whatsapp: '47997773366',
    email: 'camila.rocha@mevamkids.org',
    active: true,
    microIds: ['micro-auxiliar', 'micro-refeitorio', 'micro-recepcao'],
    functionPreferences: [
      {
        microId: 'micro-auxiliar',
        functionId: 'fn-aux-6',
        experienceLevel: 'AVANCADO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo']
      },
      {
        microId: 'micro-auxiliar',
        functionId: 'fn-aux-7',
        experienceLevel: 'AVANCADO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo']
      },
      {
        microId: 'micro-refeitorio',
        functionId: 'fn-ref-distribuicao',
        experienceLevel: 'INTERMEDIARIO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo']
      },
      {
        microId: 'micro-recepcao',
        functionId: 'fn-rec-checkin',
        experienceLevel: 'AVANCADO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo']
      }
    ],
    createdAt: '2026-03-05T14:00:00Z',
    updatedAt: '2026-03-05T14:00:00Z'
  },
  {
    id: 'p-thiago-martins',
    name: 'Thiago Martins',
    nickname: 'Thiago',
    birthDate: '1991-01-28',
    phone: '(47) 99111-2299',
    whatsapp: '47991112299',
    email: 'thiago.martins@mevamkids.org',
    active: true,
    microIds: ['micro-professor', 'micro-louvor'],
    functionPreferences: [
      {
        microId: 'micro-professor',
        functionId: 'fn-prof-9-10',
        experienceLevel: 'AVANCADO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo'],
        preferredAgeGroups: ['9 e 10 anos']
      },
      {
        microId: 'micro-professor',
        functionId: 'fn-prof-11-12',
        experienceLevel: 'AVANCADO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo'],
        preferredAgeGroups: ['11 e 12 anos']
      },
      {
        microId: 'micro-louvor',
        functionId: 'fn-louvor-violao',
        experienceLevel: 'INTERMEDIARIO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo']
      }
    ],
    createdAt: '2026-03-10T10:30:00Z',
    updatedAt: '2026-03-10T10:30:00Z'
  },
  {
    id: 'p-roberta-lima',
    name: 'Roberta Lima',
    nickname: 'Tia Roberta',
    birthDate: '1987-04-12',
    phone: '(47) 99666-5544',
    whatsapp: '47996665544',
    email: 'roberta.lima@mevamkids.org',
    active: true,
    microIds: ['micro-professor', 'micro-lideranca'],
    functionPreferences: [
      {
        microId: 'micro-professor',
        functionId: 'fn-prof-6',
        experienceLevel: 'AVANCADO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo'],
        preferredAgeGroups: ['6 anos']
      },
      {
        microId: 'micro-lideranca',
        functionId: 'fn-lid-geral',
        experienceLevel: 'AVANCADO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo']
      }
    ],
    createdAt: '2026-01-15T09:00:00Z',
    updatedAt: '2026-01-15T09:00:00Z'
  },
  {
    id: 'p-aline-pereira',
    name: 'Aline Pereira',
    nickname: 'Aline',
    birthDate: '1995-12-05',
    phone: '(47) 99333-8811',
    whatsapp: '47993338811',
    email: 'aline.pereira@mevamkids.org',
    active: true,
    microIds: ['micro-auxiliar', 'micro-louvor'],
    functionPreferences: [
      {
        microId: 'micro-auxiliar',
        functionId: 'fn-aux-3-6',
        experienceLevel: 'INTERMEDIARIO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo']
      },
      {
        microId: 'micro-louvor',
        functionId: 'fn-louvor-vocal',
        experienceLevel: 'INTERMEDIARIO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo']
      }
    ],
    createdAt: '2026-03-12T11:00:00Z',
    updatedAt: '2026-03-12T11:00:00Z'
  },
  {
    id: 'p-felipe-gomes',
    name: 'Felipe Gomes',
    nickname: 'Felipinho',
    birthDate: '1996-08-04',
    phone: '(47) 99112-3344',
    whatsapp: '47991123344',
    email: 'felipe.gomes@mevamkids.org',
    active: true,
    microIds: ['micro-auxiliar', 'micro-seguranca'],
    functionPreferences: [
      {
        microId: 'micro-auxiliar',
        functionId: 'fn-aux-8',
        experienceLevel: 'INTERMEDIARIO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo']
      },
      {
        microId: 'micro-seguranca',
        functionId: 'fn-seg-geral',
        experienceLevel: 'INTERMEDIARIO',
        preferredShifts: ['Noite'],
        preferredDays: ['Domingo']
      }
    ],
    createdAt: '2026-03-15T15:00:00Z',
    updatedAt: '2026-03-15T15:00:00Z'
  }
];

export const INITIAL_AVAILABILITIES: AvailabilityRule[] = [
  // João Silva is unavailable on 2026-09-13
  {
    id: 'av-joao-1',
    personId: 'p-joao-silva',
    type: 'DATA_ESPECIFICA',
    specificDate: '2026-09-13',
    isAvailable: false,
    reason: 'Viagem de trabalho da família'
  },
  // Pedro Silva unavailable on 2026-09-13
  {
    id: 'av-pedro-1',
    personId: 'p-pedro-silva',
    type: 'DATA_ESPECIFICA',
    specificDate: '2026-09-13',
    isAvailable: false,
    reason: 'Viagem com a família'
  },
  // Lucas Souza unavailable on Wednesday recurring
  {
    id: 'av-lucas-1',
    personId: 'p-lucas-souza',
    type: 'RECORRENTE',
    dayOfWeek: 3,
    shift: 'NOITE',
    isAvailable: false,
    reason: 'Faculdade presencial'
  },
  // Rafael Moreira unavailable on 2026-09-20
  {
    id: 'av-rafa-1',
    personId: 'p-rafael-moreira',
    type: 'DATA_ESPECIFICA',
    specificDate: '2026-09-20',
    isAvailable: false,
    reason: 'Compromisso pessoal'
  }
];

export const INITIAL_SCHEDULES: Schedule[] = [
  {
    id: 'sched-set-2026',
    title: 'Escala Setembro 2026 - Culto da Noite',
    eventId: 'evt-culto-noite',
    eventName: 'CULTO DA NOITE',
    shift: 'NOITE',
    dates: ['2026-09-06', '2026-09-13', '2026-09-20', '2026-09-27'],
    microIds: [
      'micro-louvor',
      'micro-professor',
      'micro-auxiliar',
      'micro-refeitorio',
      'micro-midia',
      'micro-seguranca',
      'micro-lideranca'
    ],
    status: 'CONFIRMADA',
    createdBy: 'Denilson Santos',
    updatedBy: 'Denilson Santos',
    createdAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-08-28T16:00:00Z',
    qualityMetrics: {
      availabilityPercent: 100,
      filledPercent: 100,
      balancePercent: 92,
      rotationPercent: 88,
      familyPercent: 85,
      preferencePercent: 94
    },
    slots: [
      // 06/set - Louvor
      {
        id: 'slot-1',
        scheduleId: 'sched-set-2026',
        date: '2026-09-06',
        microId: 'micro-louvor',
        functionId: 'fn-louvor-vocal',
        sectionTitle: 'LOUVOR 3 A 6',
        slotIndex: 1,
        assignedPersonId: 'p-maria-silva',
        assignedPersonName: 'Maria Silva',
        manualOverride: false,
        score: 95,
        scoreBreakdown: {
          availabilityScore: 100,
          functionMatchScore: 100,
          preferenceScore: 90,
          frequencyScore: 90,
          recencyScore: 95,
          rotationScore: 90,
          familyScore: 85,
          experienceScore: 90,
          totalScore: 95,
          reasons: [
            'Disponível para a data',
            'Prefere período da noite',
            'Equilíbrio de frequência mensal adequado',
            'Família Silva servindo no mesmo evento'
          ]
        }
      },
      {
        id: 'slot-2',
        scheduleId: 'sched-set-2026',
        date: '2026-09-06',
        microId: 'micro-louvor',
        functionId: 'fn-louvor-vocal',
        sectionTitle: 'LOUVOR 3 A 6',
        slotIndex: 2,
        assignedPersonId: 'p-joao-silva',
        assignedPersonName: 'João Silva',
        manualOverride: false,
        score: 93,
        scoreBreakdown: {
          availabilityScore: 100,
          functionMatchScore: 100,
          preferenceScore: 90,
          frequencyScore: 88,
          recencyScore: 92,
          rotationScore: 90,
          familyScore: 85,
          experienceScore: 85,
          totalScore: 93,
          reasons: [
            'Disponível para 06/09',
            'Prefere culto da noite',
            'Casal (Família Silva) servindo no mesmo culto'
          ]
        }
      },
      {
        id: 'slot-3',
        scheduleId: 'sched-set-2026',
        date: '2026-09-06',
        microId: 'micro-louvor',
        functionId: 'fn-louvor-vocal',
        sectionTitle: 'LOUVOR 3 A 6',
        slotIndex: 3,
        assignedPersonId: 'p-leticia-mendes',
        assignedPersonName: 'Letícia Mendes',
        manualOverride: false,
        score: 89,
        scoreBreakdown: {
          availabilityScore: 100,
          functionMatchScore: 100,
          preferenceScore: 85,
          frequencyScore: 90,
          recencyScore: 88,
          rotationScore: 92,
          familyScore: 0,
          experienceScore: 80,
          totalScore: 89,
          reasons: ['Disponível no domingo à noite', 'Excelente entrosamento com a equipe']
        }
      },
      {
        id: 'slot-4',
        scheduleId: 'sched-set-2026',
        date: '2026-09-06',
        microId: 'micro-louvor',
        functionId: 'fn-louvor-vocal',
        sectionTitle: 'LOUVOR 3 A 6',
        slotIndex: 4,
        assignedPersonId: 'p-aline-pereira',
        assignedPersonName: 'Aline Pereira',
        manualOverride: false,
        score: 88,
        scoreBreakdown: {
          availabilityScore: 100,
          functionMatchScore: 100,
          preferenceScore: 85,
          frequencyScore: 90,
          recencyScore: 85,
          rotationScore: 85,
          familyScore: 0,
          experienceScore: 75,
          totalScore: 88,
          reasons: ['Disponível', 'Rodízio balanceado']
        }
      },
      {
        id: 'slot-5',
        scheduleId: 'sched-set-2026',
        date: '2026-09-06',
        microId: 'micro-louvor',
        functionId: 'fn-louvor-teclado',
        sectionTitle: 'LOUVOR 3 A 6',
        slotIndex: 1,
        assignedPersonId: 'p-lucas-souza',
        assignedPersonName: 'Lucas Souza',
        manualOverride: false,
        score: 96,
        scoreBreakdown: {
          availabilityScore: 100,
          functionMatchScore: 100,
          preferenceScore: 95,
          frequencyScore: 90,
          recencyScore: 95,
          rotationScore: 90,
          familyScore: 0,
          experienceScore: 95,
          totalScore: 96,
          reasons: ['Experiência avançada em Teclado', 'Disponível no turno da noite']
        }
      },
      {
        id: 'slot-6',
        scheduleId: 'sched-set-2026',
        date: '2026-09-06',
        microId: 'micro-louvor',
        functionId: 'fn-louvor-som',
        sectionTitle: 'LOUVOR 3 A 6',
        slotIndex: 1,
        assignedPersonId: 'p-denilson',
        assignedPersonName: 'Denilson Silva Santos',
        manualOverride: false,
        score: 98,
        scoreBreakdown: {
          availabilityScore: 100,
          functionMatchScore: 100,
          preferenceScore: 95,
          frequencyScore: 95,
          recencyScore: 95,
          rotationScore: 95,
          familyScore: 90,
          experienceScore: 98,
          totalScore: 98,
          reasons: ['Técnico de Som qualificado', 'Disponibilidade confirmada']
        }
      },

      // Professores & Auxiliares (06/set)
      {
        id: 'slot-prof-3-6',
        scheduleId: 'sched-set-2026',
        date: '2026-09-06',
        microId: 'micro-professor',
        functionId: 'fn-prof-3-6',
        sectionTitle: '3 a 6 anos',
        slotIndex: 1,
        assignedPersonId: 'p-beatriz-costa',
        assignedPersonName: 'Beatriz Costa',
        manualOverride: false,
        score: 92,
        scoreBreakdown: {
          availabilityScore: 100,
          functionMatchScore: 100,
          preferenceScore: 90,
          frequencyScore: 90,
          recencyScore: 90,
          rotationScore: 88,
          familyScore: 0,
          experienceScore: 95,
          totalScore: 92,
          reasons: ['Experiência avançada com turma 3 a 6', 'Disponível']
        }
      },
      {
        id: 'slot-aux1-3-6',
        scheduleId: 'sched-set-2026',
        date: '2026-09-06',
        microId: 'micro-auxiliar',
        functionId: 'fn-aux-3-6',
        sectionTitle: '3 a 6 anos',
        slotIndex: 1,
        assignedPersonId: 'p-juliana-santos',
        assignedPersonName: 'Juliana Santos',
        manualOverride: false,
        score: 90,
        scoreBreakdown: {
          availabilityScore: 100,
          functionMatchScore: 100,
          preferenceScore: 90,
          frequencyScore: 90,
          recencyScore: 85,
          rotationScore: 88,
          familyScore: 80,
          experienceScore: 85,
          totalScore: 90,
          reasons: ['Disponível no domingo à noite', 'Família Santos no evento']
        }
      },
      {
        id: 'slot-prof-9-10',
        scheduleId: 'sched-set-2026',
        date: '2026-09-06',
        microId: 'micro-professor',
        functionId: 'fn-prof-9-10',
        sectionTitle: '9 e 10 anos',
        slotIndex: 1,
        assignedPersonId: 'p-thiago-martins',
        assignedPersonName: 'Thiago Martins',
        manualOverride: false,
        score: 94,
        scoreBreakdown: {
          availabilityScore: 100,
          functionMatchScore: 100,
          preferenceScore: 95,
          frequencyScore: 90,
          recencyScore: 92,
          rotationScore: 90,
          familyScore: 0,
          experienceScore: 95,
          totalScore: 94,
          reasons: ['Prefere turma 9 e 10 anos', 'Experiência avançada', 'Disponível']
        }
      },

      // Refeitório (06/set)
      {
        id: 'slot-ref-pipoca',
        scheduleId: 'sched-set-2026',
        date: '2026-09-06',
        microId: 'micro-refeitorio',
        functionId: 'fn-ref-pipoca',
        sectionTitle: 'REFEITÓRIO',
        slotIndex: 1,
        assignedPersonId: 'p-pedro-silva',
        assignedPersonName: 'Pedro Silva',
        manualOverride: false,
        score: 94,
        scoreBreakdown: {
          availabilityScore: 100,
          functionMatchScore: 100,
          preferenceScore: 95,
          frequencyScore: 90,
          recencyScore: 90,
          rotationScore: 90,
          familyScore: 90,
          experienceScore: 90,
          totalScore: 94,
          reasons: ['Família Silva servindo junta no mesmo culto', 'Preferência por Pipoca']
        }
      },

      // Mídia (06/set)
      {
        id: 'slot-mid-cam',
        scheduleId: 'sched-set-2026',
        date: '2026-09-06',
        microId: 'micro-midia',
        functionId: 'fn-mid-cam',
        sectionTitle: 'MÍDIA',
        slotIndex: 1,
        assignedPersonId: 'p-gabriel-ribeiro',
        assignedPersonName: 'Gabriel Ribeiro',
        manualOverride: false,
        score: 95,
        scoreBreakdown: {
          availabilityScore: 100,
          functionMatchScore: 100,
          preferenceScore: 95,
          frequencyScore: 90,
          recencyScore: 95,
          rotationScore: 90,
          familyScore: 0,
          experienceScore: 95,
          totalScore: 95,
          reasons: ['Operador experiente de Câmera', 'Disponível']
        }
      },

      // Segurança (06/set)
      {
        id: 'slot-seg-geral',
        scheduleId: 'sched-set-2026',
        date: '2026-09-06',
        microId: 'micro-seguranca',
        functionId: 'fn-seg-geral',
        sectionTitle: 'SEGURANÇA',
        slotIndex: 1,
        assignedPersonId: 'p-marcos-oliveira',
        assignedPersonName: 'Marcos Oliveira',
        manualOverride: false,
        score: 96,
        scoreBreakdown: {
          availabilityScore: 100,
          functionMatchScore: 100,
          preferenceScore: 95,
          frequencyScore: 90,
          recencyScore: 95,
          rotationScore: 90,
          familyScore: 85,
          experienceScore: 95,
          totalScore: 96,
          reasons: ['Líder experiente de Segurança', 'Disponível']
        }
      },

      // Liderança (06/set)
      {
        id: 'slot-lid-geral',
        scheduleId: 'sched-set-2026',
        date: '2026-09-06',
        microId: 'micro-lideranca',
        functionId: 'fn-lid-apoio',
        sectionTitle: 'LIDERANÇA',
        slotIndex: 1,
        assignedPersonId: 'p-carlos-lima',
        assignedPersonName: 'Carlos Eduardo Lima',
        manualOverride: false,
        score: 93,
        scoreBreakdown: {
          availabilityScore: 100,
          functionMatchScore: 100,
          preferenceScore: 90,
          frequencyScore: 90,
          recencyScore: 90,
          rotationScore: 90,
          familyScore: 0,
          experienceScore: 95,
          totalScore: 93,
          reasons: ['Disponibilidade confirmada', 'Experiência em liderança de apoio']
        }
      }
    ]
  }
];

export const INITIAL_ROTATION_HISTORY: RotationHistoryItem[] = [
  {
    id: 'rot-1',
    date: '2026-08-02',
    eventId: 'evt-culto-noite',
    microId: 'micro-louvor',
    functionId: 'fn-louvor-vocal',
    personId: 'p-joao-silva',
    coVolunteers: ['p-maria-silva', 'p-leticia-mendes', 'p-denilson']
  },
  {
    id: 'rot-2',
    date: '2026-08-09',
    eventId: 'evt-culto-noite',
    microId: 'micro-louvor',
    functionId: 'fn-louvor-vocal',
    personId: 'p-joao-silva',
    coVolunteers: ['p-maria-silva', 'p-aline-pereira', 'p-denilson']
  },
  {
    id: 'rot-3',
    date: '2026-08-16',
    eventId: 'evt-culto-noite',
    microId: 'micro-professor',
    functionId: 'fn-prof-9-10',
    personId: 'p-joao-silva',
    coVolunteers: ['p-pedro-silva', 'p-thiago-martins']
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-1',
    timestamp: '2026-08-28T16:00:00Z',
    userName: 'Denilson Santos',
    userRole: 'ADMIN_LIDERANCA',
    action: 'CONFIRMACAO_ESCALA',
    details: 'Escala Setembro 2026 - Culto da Noite foi gerada e confirmada.',
    targetType: 'SCHEDULE'
  },
  {
    id: 'log-2',
    timestamp: '2026-08-20T10:15:00Z',
    userName: 'Denilson Santos',
    userRole: 'ADMIN_LIDERANCA',
    action: 'CADASTRO_FAMILIA',
    details: 'Família Silva vinculada com sucesso (João, Maria, Pedro).',
    targetType: 'FAMILY'
  },
  {
    id: 'log-3',
    timestamp: '2026-08-15T14:30:00Z',
    userName: 'Roberta Lima',
    userRole: 'LIDER_MICRO',
    action: 'ATUALIZACAO_FUNCOES',
    details: 'Critérios pedagógicos de faixas etárias atualizados nos Professores.',
    targetType: 'FUNCTION'
  }
];
