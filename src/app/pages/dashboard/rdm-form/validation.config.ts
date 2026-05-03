// src\app\pages\dashboard\rdm-form\validation.config.ts
export interface FieldValidation {
  field: string;
  label: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  patternError?: string;
  conditional?: (formData: any) => boolean;
  dependsOn?: string;
  dependsValue?: string;
}

// Mapa de validação por passo
export const STEP_VALIDATIONS: Record<number, FieldValidation[]> = {
  1: [
    { field: 'identification.Type', label: 'Tipo', required: true },
    {
      field: 'identification.Title',
      label: 'Título',
      minLength: 20,
      required: true,
    },
    {
      field: 'solution.ObjectiveOrSolution',
      label: 'Objetivo/Solução',
      minLength: 30,
      required: true,
    },
  ],

  2: [
    {
      field: 'impactCategory.ChangeSystem',
      label: 'Sistema/Serviço',
      minLength: 3,
      required: true,
    },
    { field: 'impactCategory.Environment', label: 'Ambiente', required: true },
    { field: 'impactCategory.Activity', label: 'Tipo de mudança', required: true },
    { field: 'impactCategory.ICsImpacted', label: 'ICs impactados', required: true },
    {
      field: 'impactCategory.ImpactedServices',
      label: 'Funcionalidades impactadas',
      minLength: 20,
      required: true,
    },
    { field: 'impactPriority.ServiceCondition', label: 'Condição do serviço', required: true },
    { field: 'impactPriority.Impact', label: 'Impacto', required: true },
    { field: 'impactPriority.Urgency', label: 'Urgência', required: true },
  ],

  3: [{ field: 'planComunication.EmailsCc', label: 'E-mail(s) para notificação', required: true }],

  4: [
    { field: 'phases.planning.WasPlanned', label: 'Planejamento foi realizado?', required: true },
    {
      field: 'phases.planning.JustificationPlanned',
      label: 'Justificativa do planejamento',
      required: true,
      dependsOn: 'phases.planning.WasPlanned',
      dependsValue: 'NAO',
    },
    { field: 'phases.testHomology.WasTested', label: 'Homologação foi realizada?', required: true },
    {
      field: 'phases.testHomology.JustificationTest',
      label: 'Justificativa da homologação',
      required: true,
      dependsOn: 'phases.testHomology.WasTested',
      dependsValue: 'NAO',
    },

    {
      field: 'phases.executionWindow.startDate',
      label: 'Data de início da execução',
      required: true,
      pattern: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,
      patternError: 'Data inválida. Use o formato AAAA-MM-DDTHH:MM (ano com 4 dígitos).',
    },
    {
      field: 'phases.executionWindow.endDate',
      label: 'Data de término da execução',
      required: true,
      pattern: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,
      patternError: 'Data inválida. Use o formato AAAA-MM-DDTHH:MM (ano com 4 dígitos).',
    },
    {
      field: 'phases.validation.startDate',
      label: 'Data de início da validação',
      required: true,
      pattern: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,
      patternError: 'Data inválida. Use o formato AAAA-MM-DDTHH:MM (ano com 4 dígitos).',
    },
    {
      field: 'phases.validation.endDate',
      label: 'Data de término da validação',
      required: true,
      pattern: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,
      patternError: 'Data inválida. Use o formato AAAA-MM-DDTHH:MM (ano com 4 dígitos).',
    },
  ],

  5: [
    { field: 'planningExecutation.Ativity', label: 'Atividade de execução', required: true },
    { field: 'planningExecutation.TechnologyArea', label: 'Área executora', required: true },
    {
      field: 'planningExecutation.ProbabilityOfSuccess',
      label: 'Probabilidade de sucesso',
      required: true,
    },
    {
      field: 'PlanningRemediation.ProbabilityOfSuccess',
      label: 'Probabilidade de sucesso (remediação)',
      required: true,
      conditional: (formData) => formData?.PlanningRemediation?.WasRemediationPlanned === 'SIM',
    },
    {
      field: 'PlanningRemediation.Ativity',
      label: 'Atividade de remediação',
      required: true,
      conditional: (formData) => formData?.PlanningRemediation?.WasRemediationPlanned === 'SIM',
    },
    {
      field: 'PlanningRemediation.WasRemediationPlanned',
      label: 'Remediação foi planejada?',
      required: true,
    },
    {
      field: 'PlanningRemediation.JustificationRemediation',
      label: 'Justificativa da remediação',
      required: true,
      dependsOn: 'PlanningRemediation.WasRemediationPlanned',
      dependsValue: 'NAO',
    },
    {
      field: 'impactCategory.SystemUrl',
      label: 'URL do sistema',
      required: true,
      conditional: (formData) => {
        const activity = formData?.impactCategory?.Activity;
        const area = formData?.planningExecutation?.TechnologyArea;
        return activity === 'Atualização' && area !== 'BancoDeDados' && area !== 'Seguranca';
      },
    },
    {
      field: 'impactCategory.GitRepository',
      label: 'Repositório Git',
      required: true,
      conditional: (formData) => {
        const activity = formData?.impactCategory?.Activity;
        const area = formData?.planningExecutation?.TechnologyArea;
        return activity === 'Atualização' && area !== 'BancoDeDados' && area !== 'Seguranca';
      },
    },
  ],
};

// Mensagens de erro padrão
export const ERROR_MESSAGES = {
  required: (label: string) => `${label} é obrigatório.`,
  minLength: (label: string, min: number) => `${label} deve ter no mínimo ${min} caracteres.`,
  maxLength: (label: string, max: number) => `${label} deve ter no máximo ${max} caracteres.`,
  pattern: (label: string, patternError?: string) =>
    patternError || `${label} está em formato inválido.`,
  email: 'Digite um e-mail válido.',
  emailDuplicate: 'Este e-mail já foi adicionado.',
  dateRange: 'A data de início deve ser anterior à data de término.',
};
