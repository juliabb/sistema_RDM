// src/app/pages/dashboard/rdm-form/interfaces/rdm-form.interfaces.ts
export interface SelectOption {
  value: string;
  label: string;
}

export interface FormStep {
  number: number;
  label: string;
  key: string;
}

export interface PhaseData {
  wasPlanned?: string;
  justification?: string;
  wasTested?: string;
  stage?: string;
  startDate?: string;
  endDate?: string;
}

// Interface que corresponde EXATAMENTE à resposta da API
export interface ApiRDMResponse {
  identification: {
    type: string; // 'Emergencial', 'Normal', etc.
    title: string;
    area: string;
    name: string;
    email: string;
    dateCreated: string;
  };
  solution: {
    objectiveOrSolution: string;
  };
  category: {
    objective: string; // 'Ajuste', 'Alteração', etc.
    action: string; // 'Correção', 'Manutenção', etc.
    impact: string; // 'Baixo', 'Medio', 'Alto'
    urgency: string; // 'Baixo', 'Medio', 'Alto'
  };
  impactCategory: {
    changeSystem: string;
    activity: string; // 'Ajuste', 'Ativação', etc.
    impactedServices: string;
    environment: string; // 'Produção', 'Homologação', etc.
    iCsImpacted: string;
  };
  deploymentWindow: {
    impactType: string; // 'Atualização', 'Correção', etc.
    dayOfWeek?: string;
    time?: string;
    startTime?: string;
    endTime?: string;
  };
  planComunication: {
    emails?: string;
  };
  phases: {
    planning: {
      wasPlanned: string;
      justification: string;
    };
    testHomology: {
      wasTested: string;
      justification: string;
    };
    execute: {
      stage: string; // 'Antes', 'Durante', 'Depois'
      startDate: string;
      endDate: string;
    };
    validation: {
      stage: string; // 'Antes', 'Durante', 'Depois'
      startDate: string;
      endDate: string;
    };
  };
  planningExecutation: {
    ativity: string;
    technologyArea: string; // 'BancoDeDados', 'Linux', etc.
    probabilityOfSuccess: string; // 'Baixo', 'Medio', 'Alto'
  };
  planningRemediation: {
    ativity: string;
    technologyArea: string; // 'BancoDeDados', 'Linux', etc.
    probabilityOfSuccess: string; // 'Baixo', 'Medio', 'Alto'
  };
}

export interface FoundRDM extends ApiRDMResponse {
  ticket: string;
  date: string;
  status?: string;
}

export interface ApiErrorResponse {
  message?: string;
  errors?: string[] | Record<string, string[]>;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
}

export interface ApiFormData {
  identification: {
    Type: string;
    Title: string;
  };
  solution: {
    ObjectiveOrSolution: string;
  };
  impactCategory: {
    ChangeSystem: string;
    Environment: string;
    Activity: string;
    ICsImpacted: string;
    ImpactedServices: string;
  };
  impactPriority: {
    ServiceCondition: string;
    Impact: string;
    Urgency: string;
  };
  planComunication: {
    EmailsCc: string[];
  };
  phases: {
    planning: {
      WasPlanned: string;
      JustificationPlanned?: string;
    };
    testHomology: {
      WasTested: string;
      JustificationTest?: string;
    };
    executionWindow: {
      stage?: string;
      startDate: string;
      endDate: string;
    };
    validation: {
      stage?: string;
      startDate: string;
      endDate: string;
    };
  };
  planningExecutation: {
    Ativity: string;
    TechnologyArea: string;
    ProbabilityOfSuccess: string;
  };
  PlanningRemediation: {
    Ativity: string;
    ProbabilityOfSuccess: string;
    TechnologyArea?: string;
    WasRemediationPlanned?: string;
    JustificationRemediation?: string;
  };
  deploymentWindow?: {
    ImpactType: string;
  };
}

export interface ApiErrorResponse {
  message?: string;
  errors?: string[] | Record<string, string[]>;
  title?: string;
  status?: number;
}
