// src/app/models/rdm-models.ts

/**
 * Modelo principal para uma RDM (Requisição de Mudança)
 * Representa os dados básicos de uma requisição
 */
export interface RDM {
  ticket: string;          // Número único do ticket
  name: string;           // Nome do solicitante
  title: string;          // Título da requisição
  date?: string;          // Data da requisição (formato string)
  status?: string;        // Status atual (ex: pendente, aprovado, reprovado)
  requesterEmail?: string; // Email do solicitante
  department?: string;    // Departamento do solicitante
  priority?: string;      // Prioridade da requisição
  type?: string;         // Tipo de requisição
  area?: string;         // Área responsável
  approvedDate?: string; // Data de aprovação (se aplicável)
  approvedBy?: string;   // Quem aprovou (se aplicável)
  createdAt?: string;    // Data de criação no sistema
}

/**
 * Modelo detalhado de uma RDM
 * Contém todas as seções específicas de uma requisição completa
 */
export interface RDMDetails {
  // Seção 1: Identificação
  identification: {
    type: string;     // Tipo de mudança
    title: string;    // Título da requisição
    area: string;     // Área responsável
  };

  // Seção 2: Justificativa
  justification: {
    problemJustification: string; // Descrição do problema
  };

  // Seção 3: Solução Proposta
  solution: {
    objectiveOrSolution: string; // Objetivo ou solução proposta
  };

  // Seção 4: Categorização
  category: {
    objective: string;   // Objetivo da mudança
    action: string;      // Ação necessária
    impact: string;      // Impacto estimado
    urgency: string;     // Urgência da mudança
  };

  // Seção 5: Categoria de Impacto
  impactCategory: {
    changeSystem: string;      // Sistema a ser alterado
    activity: string;          // Atividade impactada
    impactedServices: string;  // Serviços impactados
    environment: string;       // Ambiente (prod, dev, etc)
    iCsImpacted: string;       // ICs impactados
  };

  // Seção 6: Janela de Implantação
  deploymentWindow: {
    impactType: string;  // Tipo de impacto durante implantação
    dayOfWeek: string;   // Dia da semana preferencial
    startTime: string;   // Hora de início
    endTime: string;     // Hora de término
  };

  // Seção 7: Plano de Comunicação
  planComunication: {
    whosNotified: string;     // Quem será notificado
    moment: string;           // Momento da notificação
    comunicationType: string; // Tipo de comunicação
    technologyArea: string;   // Área de tecnologia responsável
  };

  // Seção 8: Fases da Implementação
  phases: {
    // Fase 1: Planejamento
    planning: {
      stage: string;      // Etapa
      startDate: string;  // Data de início
      endDate: string;    // Data de término
    };

    // Fase 2: Teste/Homologação
    testHomology: {
      stage: string;      // Etapa
      startDate: string;  // Data de início
      endDate: string;    // Data de término
    };

    // Fase 3: Execução
    execute: {
      stage: string;      // Etapa
      startDate: string;  // Data de início
      endDate: string;    // Data de término
    };

    // Fase 4: Validação
    validation: {
      stage: string;      // Etapa
      startDate: string;  // Data de início
      endDate: string;    // Data de término
    };
  };

  // Seção 9: Planejamento de Execução
  planningExecution: {
    activity: string;                // Atividade planejada
    technologyArea: string;          // Área de tecnologia
    probabilityOfSuccess: string;    // Probabilidade de sucesso
  };

  // Seção 10: Planejamento de Remedição
  planningRemediation: {
    activity: string;                // Atividade de remediação
    technologyArea: string;          // Área de tecnologia
    probabilityOfSuccess: string;    // Probabilidade de sucesso
  };
}

/**
 * Modelo para aprovação/rejeição de uma RDM
 * Usado quando um administrador altera o status de uma requisição
 */
export interface ApproveRDMRequest {
  status: string;    // Novo status (ex: "aprovado", "reprovado")
  subject: string;   // Assunto do email de notificação
}

// ==================================================
// MODELOS PARA LISTAGEM E BUSCA DE RDMs
// ==================================================

/**
 * Extensão do modelo básico RDM para listagem
 * Inclui informações adicionais específicas para listas
 */
export interface RDMList extends RDM {
  approvedDate?: string;     // Data de aprovação
  approvedBy?: string;       // Aprovado por
  rejectedDate?: string;     // Data de rejeição (se aplicável)
  rejectedBy?: string;       // Rejeitado por (se aplicável)
  rejectionReason?: string;  // Motivo da rejeição (se aplicável)
}

/**
 * Parâmetros para busca/filtro de RDMs
 * Usado em endpoints de listagem com paginação
 */
export interface RDMSearchParams {
  search?: string;               // Termo de busca geral
  status?: string;               // Filtro por status
  dateFrom?: string;             // Data inicial (filtro por período)
  dateTo?: string;               // Data final (filtro por período)
  department?: string;           // Filtro por departamento
  page?: number;                 // Número da página (para paginação)
  pageSize?: number;             // Itens por página
  sortBy?: string;               // Campo para ordenação
  sortOrder?: 'asc' | 'desc';    // Direção da ordenação
}

/**
 * Resultado paginado de busca de RDMs
 * Retornado por endpoints de listagem com paginação
 */
export interface RDMPagedResult {
  items: RDMList[];     // Lista de itens da página atual
  totalCount: number;   // Total de itens (sem paginação)
  page: number;         // Página atual
  pageSize: number;     // Itens por página
  totalPages: number;   // Total de páginas disponíveis
}
