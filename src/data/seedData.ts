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

export const INITIAL_FAMILIES: Family[] = [];

export const INITIAL_PEOPLE: Person[] = [];

export const INITIAL_AVAILABILITIES: AvailabilityRule[] = [];

export const INITIAL_SCHEDULES: Schedule[] = [];

export const INITIAL_ROTATION_HISTORY: RotationHistoryItem[] = [];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-init',
    timestamp: new Date().toISOString(),
    userName: 'Sistema MEVAM Kids',
    userRole: 'ADMIN_LIDERANCA',
    action: 'INICIALIZACAO',
    details: 'Base de dados oficial MEVAM Kids pronta para cadastro dos voluntários.',
    targetType: 'SYSTEM'
  }
];
