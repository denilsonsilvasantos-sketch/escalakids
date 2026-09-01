import { ClassroomPresetConfig, MicroFunction } from '../types';

export const CLASSROOM_PRESETS: ClassroomPresetConfig[] = [
  {
    key: 'DOMINGO_MANHA',
    label: 'Domingo de Manhã',
    description: '4 Turmas: 3 e 4 anos, 5 e 6 anos, 7 e 8 anos, 9 a 12 anos',
    ageGroups: ['3 e 4 anos', '5 e 6 anos', '7 e 8 anos', '9 a 12 anos']
  },
  {
    key: 'DOMINGO_NOITE',
    label: 'Domingo à Noite',
    description: '7 Turmas: 3 e 4 anos, 5 anos, 6 anos, 7 anos, 8 anos, 9 e 10 anos, 11 e 12 anos',
    ageGroups: [
      '3 e 4 anos',
      '5 anos',
      '6 anos',
      '7 anos',
      '8 anos',
      '9 e 10 anos',
      '11 e 12 anos'
    ]
  },
  {
    key: 'CULTO_ESPECIAL_2_TURMAS',
    label: 'Culto Especial (Casais / Congresso - 2 Turmas)',
    description: '2 Grandes Turmas: 3 a 7 anos, 8 a 12 anos',
    ageGroups: ['3 a 7 anos', '8 a 12 anos']
  },
  {
    key: 'CULTO_ESPECIAL_3_TURMAS',
    label: 'Culto Especial / Eventos (3 Turmas)',
    description: '3 Turmas Agrupadas: 3 a 6 anos, 7 e 8 anos, 9 a 12 anos',
    ageGroups: ['3 a 6 anos', '7 e 8 anos', '9 a 12 anos']
  }
];

/**
 * Generates standard classroom functions for Professors & Auxiliaries based on selected preset age groups
 */
export function generateFunctionsForPreset(
  microProfessorId: string,
  microAuxiliarId: string,
  presetKey: ClassroomPresetConfig['key']
): { professorFunctions: MicroFunction[]; auxiliarFunctions: MicroFunction[] } {
  const preset = CLASSROOM_PRESETS.find((p) => p.key === presetKey) || CLASSROOM_PRESETS[0];

  const professorFunctions: MicroFunction[] = preset.ageGroups.map((age, idx) => ({
    id: `fn-prof-${presetKey.toLowerCase()}-${idx + 1}`,
    microId: microProfessorId,
    name: `Professor(a) ${age}`,
    category: `Sala ${age}`,
    defaultRequiredCount: 1,
    criteria: {
      hasAgeGroupPreference: true,
      allowedAgeGroups: [age],
      hasShiftPreference: true,
      allowedExperienceLevels: ['INICIANTE', 'INTERMEDIARIO', 'AVANCADO']
    }
  }));

  const auxiliarFunctions: MicroFunction[] = preset.ageGroups.map((age, idx) => ({
    id: `fn-aux-${presetKey.toLowerCase()}-${idx + 1}`,
    microId: microAuxiliarId,
    name: `Auxiliar ${age}`,
    category: `Sala ${age}`,
    defaultRequiredCount: 1,
    criteria: {
      hasAgeGroupPreference: true,
      allowedAgeGroups: [age],
      hasShiftPreference: true,
      allowedExperienceLevels: ['INICIANTE', 'INTERMEDIARIO', 'AVANCADO']
    }
  }));

  return { professorFunctions, auxiliarFunctions };
}
