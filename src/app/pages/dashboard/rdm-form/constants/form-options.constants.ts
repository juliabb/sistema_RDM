// src/app/pages/dashboard/rdm-form/constants/form-options.constants.ts
import { SelectOption } from '../interfaces/rdm-form.interfaces';

export const REQUEST_TYPES: SelectOption[] = [
  { value: 'Emergencial', label: 'Emergencial' },
  { value: 'Normal', label: 'Normal' },
  { value: 'Padrão', label: 'Padrão' },
];

export const OBJECTIVE_TYPES: SelectOption[] = [
  { value: 'Ajuste', label: 'Ajuste' },
  { value: 'Alteração', label: 'Alteração' },
  { value: 'Ativação', label: 'Ativação' },
  { value: 'Atualização', label: 'Atualização' },
  { value: 'Conserto', label: 'Conserto' },
  { value: 'Desativação', label: 'Desativação' },
  { value: 'Implantação', label: 'Implantação' },
  { value: 'Manutenção', label: 'Manutenção' },
  { value: 'Substituição', label: 'Substituição' },
];

export const ACTION_TYPES: SelectOption[] = [
  { value: 'Correção', label: 'Correção' },
  { value: 'Manutenção', label: 'Manutenção' },
  { value: 'Melhoria', label: 'Melhoria' },
];

export const LEVEL_TYPES: SelectOption[] = [
  { value: 'Baixo', label: 'Baixo' },
  { value: 'Medio', label: 'Médio' },
  { value: 'Alto', label: 'Alto' },
];

export const ACTIVITY_TYPES: SelectOption[] = [
  { value: 'Ajuste', label: 'Ajuste' },
  { value: 'Ativação', label: 'Ativação' },
  { value: 'Atualização', label: 'Atualização' },
  { value: 'Conserto', label: 'Conserto' },
  { value: 'Desativação', label: 'Desativação' },
  { value: 'Manutenção', label: 'Manutenção' },
  { value: 'Substituição', label: 'Substituição' },
];

export const ENVIRONMENT_TYPES: SelectOption[] = [
  { value: 'Produção', label: 'Produção' },
  { value: 'Homologação', label: 'Homologação' },
  { value: 'Desenvolvimento', label: 'Desenvolvimento' },
];

export const IMPACT_TYPE_OPTIONS: SelectOption[] = [
  { value: 'Atualização', label: 'Atualização' },
  { value: 'Correção', label: 'Correção' },
  { value: 'Degradação', label: 'Degradação' },
  { value: 'Indisponibilidade', label: 'Indisponibilidade' },
  { value: 'Intermitência', label: 'Intermitência' },
];

export const MOMENT_OPTIONS: SelectOption[] = [
  { value: 'Antes', label: 'Antes' },
  { value: 'Durante', label: 'Durante' },
  { value: 'Depois', label: 'Depois' },
  { value: 'Todos', label: 'Todos' },
];


export const TECHNOLOGY_AREA_OPTIONS: SelectOption[] = [
  { value: 'BancoDeDados', label: 'Banco de Dados' },
  { value: 'Linux', label: 'Linux' },
  { value: 'Windows', label: 'Windows' },
  { value: 'Redes', label: 'Redes' },
];

export const STAGE_OPTIONS: SelectOption[] = [
  { value: 'Antes', label: 'Antes' },
  { value: 'Depois', label: 'Depois' },
  { value: 'Durante', label: 'Durante' },
];

// Constantes de validação
export const VALIDATION_CONSTANTS = {
  TITLE: {
    MIN_LENGTH: 5,
    MAX_LENGTH: 150,
  },
  SOLUTION: {
    MIN_LENGTH: 10,
  },
  FILE: {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: ['.zip'] as readonly string[],
  },
  PROBABILITY: {
    MIN: 0,
    MAX: 100,
  },
  SCROLL: {
    THRESHOLD: 300,
  },
} as const;

// Constantes de steps
export const FORM_STEPS = [
{ number: 1, label: 'Identificação', key: 'identification' },
  { number: 2, label: 'Objetivo', key: 'solution' },
  { number: 3, label: 'Categorização', key: 'category' },
  { number: 4, label: 'Plano de Comunicação', key: 'planComunication' },
  { number: 5, label: 'Fases do Projeto', key: 'phases' },
  { number: 6, label: 'Planejamento', key: 'planning' },
  { number: 7, label: 'Anexos', key: 'attachments' },
] as const;


// Exportação agrupada (opcional, para facilitar imports)
export const FORM_OPTIONS = {
  REQUEST_TYPES,
  OBJECTIVE_TYPES,
  ACTION_TYPES,
  LEVEL_TYPES,
  ACTIVITY_TYPES,
  ENVIRONMENT_TYPES,
  IMPACT_TYPE_OPTIONS,
  MOMENT_OPTIONS,
  TECHNOLOGY_AREA_OPTIONS,
  STAGE_OPTIONS,
  FORM_STEPS
} as const;
