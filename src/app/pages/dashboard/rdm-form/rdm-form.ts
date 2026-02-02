// src/app/pages/dashboard/rdm-form/rdm-form.ts
import { Component, HostListener, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../../services/auth-services';
import { buildApiUrl, API_PATHS } from '../../../config/api.config';

// Interfaces
export interface FormStep {
  number: number;
  label: string;
  key: string;
}

export interface PhaseData {
  WasPlanned?: string;
  JustificationPlanned?: string;
  WasTested?: string;
  JustificationTest?: string;
  stage?: string;
  startDate?: string;
  endDate?: string;
}

export interface ApiFormData {
  identification: {
    Type: string;
    Title: string;
  };
  solution: {
    ObjectiveOrSolution: string;
  };
  category: {
    Objective: string;
    Action: string;
    Impact: string;
    Urgency: string;
  };
  impactCategory: {
    ChangeSystem: string;
    Activity: string;
    ImpactedServices: string;
    Environment: string;
    ICsImpacted: string;
  };
  deploymentWindow: {
    ImpactType: string;
  };
  planComunication: {
    WhosNotified: string;
    Moment: string;
    ComunicationType: string;
    TechnologyArea: string;
  };
  phases: {
    planning: PhaseData;
    testHomology: PhaseData;
    execute: PhaseData;
    validation: PhaseData;
  };
  planningExecutation: {
    Ativity: string;
    TechnologyArea: string;
    ProbabilityOfSuccess: string;
  };
  PlanningRemediation: {
    Ativity: string;
    TechnologyArea: string;
    ProbabilityOfSuccess: string;
  };
}

export interface FoundRDM {
  ticket: string;
  date: string;
  status?: string;
  identification?: {
    type: string;
    title: string;
    area: string;
  };
  solution?: {
    objectiveOrSolution: string;
  };
  category?: {
    objective: string;
    action: string;
    impact: string;
    urgency: string;
  };
  impactCategory?: {
    changeSystem: string;
    activity: string;
    impactedServices: string;
    environment: string;
    iCsImpacted: string;
  };
  deploymentWindow?: {
    impactType: string;
  };
  planComunication?: {
    whosNotified: string;
    moment: string;
    comunicationType: string;
    technologyArea: string;
  };
  phases?: {
    planning?: Partial<PhaseData>;
    testHomology?: Partial<PhaseData>;
    execute?: Partial<PhaseData>;
    validation?: Partial<PhaseData>;
  };
  planningExecutation?: {
    ativity?: string;
    technologyArea?: string;
    probabilityOfSuccess?: string;
  };
  planningRemediation?: {
    ativity?: string;
    technologyArea?: string;
    probabilityOfSuccess?: string;
  };
}

export interface SelectOption {
  value: string;
  label: string;
}

// Adicione no arquivo de interfaces
export interface ApiErrorResponse {
  message?: string;
  errors?: string[] | Record<string, string[]>;
  title?: string;
  status?: number;
}

@Component({
  selector: 'app-rdm-form',
  standalone: true,
  imports: [FormsModule, CommonModule, MatIconModule],
  templateUrl: './rdm-form.html',
  styleUrls: ['./rdm-form.css'],
})
export class RdmFormComponent implements OnInit, OnDestroy {
  // Configurações
  private readonly SCROLL_THRESHOLD = 300;
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly ALLOWED_FILE_TYPES = ['.zip'];
  private destroy$ = new Subject<void>();

  // Estados do componente
  isLoading = false;
  errorMessage = '';
  errorMessages: string[] = [];
  successMessage = '';
  showBackToTop = false;
  showSuccessModal = false;
  solicitationTicket = '';

  // Estados de busca
  showSearchModal = false;
  searchTicket = '';
  foundRDM: FoundRDM | null = null;
  searchError = '';
  isSearching = false;
  isCopying = false;

  // Controle de passos
  currentStep = 1;
  readonly totalSteps = 9;
  steps: FormStep[] = [
    { number: 1, label: 'Identificação', key: 'identification' },
    { number: 2, label: 'Objetivo', key: 'solution' },
    { number: 3, label: 'Categorização', key: 'category' },
    { number: 4, label: 'Impacto', key: 'impactCategory' },
    { number: 5, label: 'Janela', key: 'deploymentWindow' },
    { number: 6, label: 'Comunicação', key: 'planComunication' },
    { number: 7, label: 'Fases', key: 'phases' },
    { number: 8, label: 'Planejamento', key: 'planning' },
    { number: 9, label: 'Anexos', key: 'attachments' },
  ];

  // Dados do formulário
  formData: ApiFormData = this.createEmptyFormData();

  // Anexos
  selectedFiles: File[] = [];

  // Opções dos selects
  readonly requestTypes: SelectOption[] = [
    { value: 'Emergencial', label: 'Emergencial' },
    { value: 'Normal', label: 'Normal' },
    { value: 'Padrão', label: 'Padrão' },
  ];

  readonly objectiveTypes: SelectOption[] = [
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

  readonly actionTypes: SelectOption[] = [
    { value: 'Correção', label: 'Correção' },
    { value: 'Manutenção', label: 'Manutenção' },
    { value: 'Melhoria', label: 'Melhoria' },
  ];

  readonly levelTypes: SelectOption[] = [
    { value: 'Baixo', label: 'Baixo' },
    { value: 'Medio', label: 'Médio' },
    { value: 'Alto', label: 'Alto' },
  ];

  readonly activityTypes: SelectOption[] = [
    { value: 'Ajuste', label: 'Ajuste' },
    { value: 'Ativação', label: 'Ativação' },
    { value: 'Atualização', label: 'Atualização' },
    { value: 'Conserto', label: 'Conserto' },
    { value: 'Desativação', label: 'Desativação' },
    { value: 'Manutenção', label: 'Manutenção' },
    { value: 'Substituição', label: 'Substituição' },
  ];

  readonly environmentTypes: SelectOption[] = [
    { value: 'Produção', label: 'Produção' },
    { value: 'Homologação', label: 'Homologação' },
    { value: 'Desenvolvimento', label: 'Desenvolvimento' },
  ];

  readonly impactTypeOptions: SelectOption[] = [
    { value: 'Atualização', label: 'Atualização' },
    { value: 'Correção', label: 'Correção' },
    { value: 'Degradação', label: 'Degradação' },
    { value: 'Indisponibilidade', label: 'Indisponibilidade' },
    { value: 'Intermitência', label: 'Intermitência' },
  ];

  readonly momentOptions: SelectOption[] = [
    { value: 'Antes', label: 'Antes' },
    { value: 'Durante', label: 'Durante' },
    { value: 'Depois', label: 'Depois' },
    { value: 'Todos', label: 'Todos' },
  ];

  readonly comunicationTypeOptions: SelectOption[] = [
    { value: 'Email', label: 'E-mail' },
    { value: 'Teams', label: 'Teams' },
    { value: 'Telefone', label: 'Telefone' },
  ];

  readonly technologyAreaOptions: SelectOption[] = [
    { value: 'BancoDeDados', label: 'Banco de Dados' },
    { value: 'Linux', label: 'Linux' },
    { value: 'Windows', label: 'Windows' },
    { value: 'Redes', label: 'Redes' },
  ];

  readonly stageOptions: SelectOption[] = [
    { value: 'Antes', label: 'Antes' },
    { value: 'Depois', label: 'Depois' },
    { value: 'Durante', label: 'Durante' },
  ];

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    setTimeout(() => this.checkWindowScroll(), 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================
  // NAVEGAÇÃO ENTRE PASSOS
  // ============================================

  nextStep(): void {
    if (this.currentStep < this.totalSteps && this.isStepValid(this.currentStep)) {
      this.currentStep++;
      this.scrollToTop();
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.scrollToTop();
    }
  }

  goToStep(step: number): void {
    if (step >= 1 && step <= this.totalSteps) {
      this.currentStep = step;
      this.scrollToTop();
    }
  }

  isStepValid(step: number): boolean {
    const validators: Record<number, () => boolean> = {
      1: () => this.validateStep1(),
      2: () => this.validateStep2(),
      9: () => true,
    };

    return validators[step]?.() ?? true;
  }

  private validateStep1(): boolean {
    const { Title, Type } = this.formData.identification;
    return !!Title?.trim() && !!Type;
  }

  private validateStep2(): boolean {
    const { ObjectiveOrSolution } = this.formData.solution;
    return !!ObjectiveOrSolution?.trim();
  }

  private isFormValid(): boolean {
    return this.validateStep1() && this.validateStep2();
  }

  // ============================================
  // BUSCA DE RDM EXISTENTE
  // ============================================

  openSearchModal(): void {
    this.showSearchModal = true;
    this.searchTicket = '';
    this.foundRDM = null;
    this.searchError = '';
    this.isSearching = false;
    this.isCopying = false;
    document.body.style.overflow = 'hidden';
    this.cdr.detectChanges();
  }

  closeSearchModal(): void {
    this.showSearchModal = false;
    this.foundRDM = null;
    this.searchError = '';
    this.isSearching = false;
    this.isCopying = false;
    document.body.style.overflow = 'auto';
    this.cdr.detectChanges();
  }

  private getSearchErrorMessage(error: any): string {
    if (error.status === 404) {
      return `Nenhuma RDM encontrada com o ticket "${this.searchTicket}".`;
    } else if (error.status === 401) {
      return 'Sessão expirada. Por favor, faça login novamente.';
    } else if (error.status === 403) {
      return 'Você não tem permissão para acessar esta RDM.';
    } else {
      return `Erro ao buscar RDM: ${error.message || 'Erro desconhecido'}`;
    }
  }

  copyRDMData(): void {
    if (!this.foundRDM) {
      this.searchError = 'Nenhuma RDM encontrada para copiar.';
      this.cdr.detectChanges();
      return;
    }

    this.isCopying = true;
    this.cdr.detectChanges();

    try {
      const newFormData = this.createEmptyFormData();
      this.mapRDMDataToForm(newFormData, this.foundRDM);
      this.formData = newFormData;
      this.searchError = '';
      this.showCopySuccessMessage();

      setTimeout(() => {
        this.isCopying = false;
        this.closeSearchModal();
        this.resetToFirstStep();
      }, 1000);
    } catch (error) {
      this.handleCopyError(error);
    }
  }

  private mapRDMDataToForm(formData: ApiFormData, foundRDM: FoundRDM): void {
    // Identification
    if (foundRDM.identification) {
      formData.identification.Type = foundRDM.identification.type || '';
      formData.identification.Title = foundRDM.identification.title || '';
    }

    // Solution
    if (foundRDM.solution) {
      formData.solution.ObjectiveOrSolution = foundRDM.solution.objectiveOrSolution || '';
    }

    // Category
    if (foundRDM.category) {
      formData.category.Objective = foundRDM.category.objective || '';
      formData.category.Action = foundRDM.category.action || '';
      formData.category.Impact = foundRDM.category.impact || '';
      formData.category.Urgency = foundRDM.category.urgency || '';
    }

    // Impact Category
    if (foundRDM.impactCategory) {
      formData.impactCategory.ChangeSystem = foundRDM.impactCategory.changeSystem || '';
      formData.impactCategory.Activity = foundRDM.impactCategory.activity || '';
      formData.impactCategory.ImpactedServices = foundRDM.impactCategory.impactedServices || '';
      formData.impactCategory.Environment = foundRDM.impactCategory.environment || '';
      formData.impactCategory.ICsImpacted = foundRDM.impactCategory.iCsImpacted || '';
    }

    // Deployment Window
    if (foundRDM.deploymentWindow) {
      formData.deploymentWindow.ImpactType = foundRDM.deploymentWindow.impactType || '';
    }

    // Plan Communication
    if (foundRDM.planComunication) {
      // Mapear todos os campos individualmente com fallbacks
      formData.planComunication.WhosNotified =
        foundRDM.planComunication.whosNotified || foundRDM.planComunication.whosNotified || '';

      formData.planComunication.Moment =
        foundRDM.planComunication.moment || foundRDM.planComunication.moment || '';

      formData.planComunication.ComunicationType =
        foundRDM.planComunication.comunicationType ||
        foundRDM.planComunication.comunicationType ||
        '';

      // Tecnologia/Responsável
      const techArea =
        foundRDM.planComunication.technologyArea ||
        foundRDM.planComunication.technologyArea ||
        foundRDM.planComunication.technologyArea ||
        '';

      formData.planComunication.TechnologyArea = this.normalizeTechnologyArea(techArea);
    }

    // Phases - PARA JUSTIFICATIVAS
    if (foundRDM.phases) {
      this.mapPhaseData(formData, foundRDM.phases);
    }

    // Planning Execution
    if (foundRDM.planningExecutation) {
      formData.planningExecutation.Ativity = foundRDM.planningExecutation.ativity || '';

      // NORMALIZAR o campo technologyArea
      const execTechArea = foundRDM.planningExecutation.technologyArea || '';
      formData.planningExecutation.TechnologyArea = this.normalizeTechnologyArea(execTechArea);

      formData.planningExecutation.ProbabilityOfSuccess =
        foundRDM.planningExecutation.probabilityOfSuccess || '';
    }

    // Planning Remediation
    if (foundRDM.planningRemediation) {
      formData.PlanningRemediation.Ativity = foundRDM.planningRemediation.ativity || '';

      // NORMALIZAR o campo technologyArea
      const remedTechArea = foundRDM.planningRemediation.technologyArea || '';
      formData.PlanningRemediation.TechnologyArea = this.normalizeTechnologyArea(remedTechArea);

      formData.PlanningRemediation.ProbabilityOfSuccess =
        foundRDM.planningRemediation.probabilityOfSuccess || '';
    }
  }

  private normalizeTechnologyArea(area: string): string {
    if (!area) return '';

    const areaMap: Record<string, string> = {
      // Banco de Dados
      'banco de dados': 'BancoDeDados',
      bancodedados: 'BancoDeDados',
      'banco dados': 'BancoDeDados',
      bd: 'BancoDeDados',
      database: 'BancoDeDados',
      databases: 'BancoDeDados',
      sql: 'BancoDeDados',
      oracle: 'BancoDeDados',
      mysql: 'BancoDeDados',
      postgresql: 'BancoDeDados',

      // Linux
      linux: 'Linux',
      unix: 'Linux',
      centos: 'Linux',
      ubuntu: 'Linux',
      debian: 'Linux',
      redhat: 'Linux',
      rhel: 'Linux',

      // Windows
      windows: 'Windows',
      win: 'Windows',
      window: 'Windows',
      server: 'Windows',

      // Redes
      redes: 'Redes',
      network: 'Redes',
      rede: 'Redes',
      networking: 'Redes',
      cisco: 'Redes',
      firewall: 'Redes',
      switch: 'Redes',
      router: 'Redes',
    };

    const normalizedInput = area.toLowerCase().trim();

    // Primeiro tentar match exato no mapa
    if (areaMap[normalizedInput]) {
      return areaMap[normalizedInput];
    }

    // Tentar match parcial
    for (const [key, value] of Object.entries(areaMap)) {
      if (normalizedInput.includes(key)) {
        return value;
      }
    }

    // Se for uma das opções válidas, retornar como está
    const validOptions = ['BancoDeDados', 'Linux', 'Windows', 'Redes'];
    if (validOptions.includes(area)) {
      return area;
    }

    // Tentar capitalizar
    if (area.toLowerCase() === 'banco de dados') {
      return 'BancoDeDados';
    }

    return area || '';
  }

  private mapPhaseData(formData: ApiFormData, phases: FoundRDM['phases']): void {
    // Planejamento
    const planning = phases?.planning as any;
    if (planning) {
      // WasPlanned - tentar diferentes formatos
      formData.phases.planning.WasPlanned =
        planning.wasPlanned ?? planning.WasPlanned ?? planning.WasPlanned ?? '';

      // JustificationPlanned - tentar diferentes formatos
      const planningJustification =
        planning.justification ?? planning.Justification ?? planning.JustificationPlanned ?? '';

      formData.phases.planning.JustificationPlanned =
        planningJustification !== null &&
        planningJustification !== undefined &&
        planningJustification !== ''
          ? planningJustification.toString()
          : '';
    }

    // Teste/Homologação
    const testHomology = phases?.testHomology as any;
    if (testHomology) {
      // WasTested - tentar diferentes formatos
      formData.phases.testHomology.WasTested =
        testHomology.wasTested ?? testHomology.WasTested ?? testHomology.WasTested ?? '';

      // JustificationTest - tentar diferentes formatos
      const testJustification =
        testHomology.justification ??
        testHomology.Justification ??
        testHomology.JustificationTest ??
        '';

      formData.phases.testHomology.JustificationTest =
        testJustification !== null && testJustification !== undefined && testJustification !== ''
          ? testJustification.toString()
          : '';
    }

    // Execução
    if (phases?.execute) {
      formData.phases.execute.stage =
        phases.execute.stage?.toString() || phases.execute.stage?.toString() || '';

      formData.phases.execute.startDate = this.convertISOToDatetimeLocal(
        phases.execute.startDate ?? phases.execute.startDate,
      );

      formData.phases.execute.endDate = this.convertISOToDatetimeLocal(
        phases.execute.endDate ?? phases.execute.endDate,
      );
    }

    // Validação
    if (phases?.validation) {
      formData.phases.validation.stage =
        phases.validation.stage?.toString() || phases.validation.stage?.toString() || '';

      formData.phases.validation.startDate = this.convertISOToDatetimeLocal(
        phases.validation.startDate ?? phases.validation.startDate,
      );

      formData.phases.validation.endDate = this.convertISOToDatetimeLocal(
        phases.validation.endDate ?? phases.validation.endDate,
      );
    }
  }

  private convertISOToDatetimeLocal(isoDate?: string): string {
    if (!isoDate) return '';

    try {
      const date = new Date(isoDate);
      if (isNaN(date.getTime())) return '';

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');

      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch {
      return '';
    }
  }

  private showCopySuccessMessage(): void {
    this.successMessage = `Dados da RDM ${this.foundRDM?.ticket} copiados com sucesso!`;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.successMessage = '';
      this.cdr.detectChanges();
    }, 5000);
  }

  private handleCopyError(error: unknown): void {
    this.isCopying = false;
    this.searchError = 'Erro ao copiar os dados. Por favor, tente novamente.';
    this.cdr.detectChanges();
  }

  private resetToFirstStep(): void {
    this.currentStep = 1;
    this.scrollToTop();
  }

  searchExistingRDM(): void {
    if (!this.searchTicket.trim()) {
      this.searchError = 'Por favor, digite o código do ticket.';
      this.cdr.detectChanges();
      return;
    }

    this.foundRDM = null;
    this.searchError = '';
    this.isSearching = true;
    this.cdr.detectChanges();

    const token = this.authService.getToken();
    if (!token) {
      this.searchError = 'Você precisa estar logado para buscar RDMs.';
      this.isSearching = false;
      this.cdr.detectChanges();
      return;
    }

    const ticketId = this.normalizeTicket(this.searchTicket);
    if (!ticketId.startsWith('RDM-')) {
      this.searchError = 'O ticket deve começar com "RDM-". Exemplo: RDM-20260116-2f6863ca';
      this.isSearching = false;
      this.cdr.detectChanges();
      return;
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });

    const url = buildApiUrl(API_PATHS.RDM_BY_ID(ticketId));

    this.http
      .get<any>(url, { headers })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isSearching = false;
          this.foundRDM = {
            ticket: ticketId,
            date: new Date().toISOString(),
            ...response,
          };
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.isSearching = false;

          this.searchError = this.getSearchErrorMessage(error);
          this.cdr.detectChanges();
        },
      });
  }

  private normalizeTicket(ticket: string): string {
    const trimmed = ticket.trim();

    if (!trimmed.toLowerCase().startsWith('rdm-')) {
      return trimmed;
    }

    const [, date, suffix] = trimmed.split('-');

    return `RDM-${date}-${suffix?.toLowerCase()}`;
  }

  onTicketInput(): void {
    if (!this.searchTicket) {
      return;
    }

    const value = this.searchTicket.trim();

    // Normaliza apenas se começar com rdm
    if (value.toLowerCase().startsWith('rdm-')) {
      const parts = value.split('-');

      if (parts.length >= 3) {
        const prefix = 'RDM';
        const date = parts[1];
        const suffix = parts.slice(2).join('-').toLowerCase();

        this.searchTicket = `${prefix}-${date}-${suffix}`;
      }
    }
  }

  // ============================================
  // MANIPULAÇÃO DE ARQUIVOS
  // ============================================

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;

    if (!files || files.length === 0) return;

    this.selectedFiles = [];
    this.clearMessages();

    const file = files[0];

    // Validação de tipo
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!this.ALLOWED_FILE_TYPES.includes(fileExtension)) {
      this.errorMessage = `Tipo de arquivo não permitido. Apenas arquivos ZIP (.zip) são permitidos.`;
      input.value = '';
      this.cdr.detectChanges();
      return;
    }

    // Validação de tamanho
    if (file.size > this.MAX_FILE_SIZE) {
      this.errorMessage = `Arquivo muito grande. Tamanho máximo: 5MB`;
      input.value = '';
      this.cdr.detectChanges();
      return;
    }

    // Validação de múltiplos arquivos
    if (this.selectedFiles.length > 0) {
      this.errorMessage = 'Apenas um arquivo ZIP é permitido por solicitação.';
      input.value = '';
      this.cdr.detectChanges();
      return;
    }

    this.selectedFiles.push(file);
    input.value = '';
    this.cdr.detectChanges();
  }

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.cdr.detectChanges();
  }

  getFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const units = ['Bytes', 'KB', 'MB', 'GB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + units[i];
  }

  // ============================================
  // ENVIO DO FORMULÁRIO
  // ============================================

  onSubmit(): void {
    this.clearMessages();

    if (!this.isFormValid()) {
      this.errorMessage = 'Por favor, preencha todos os campos obrigatórios.';
      this.cdr.detectChanges();
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      this.errorMessage = 'Você precisa estar logado para enviar uma solicitação.';
      this.cdr.detectChanges();
      return;
    }

    this.sendRequest(token);
  }

  private async sendRequest(token: string): Promise<void> {
    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      const formData = new FormData();
      this.appendFormData(formData);
      this.appendAttachments(formData);

      // Debug: mostrar todos os campos do FormData

      const rdmUrl = buildApiUrl(API_PATHS.RDM_BASE);
      await this.sendWithFetch(rdmUrl, token, formData);
    } catch (error: any) {
      this.isLoading = false;
      this.errorMessage = 'Erro ao preparar o envio: ' + (error.message || error);
      this.cdr.detectChanges();
    }
  }

  // ADICIONE ESTA FUNÇÃO QUE ESTAVA FALTANDO
  private async sendWithFetch(url: string, token: string, formData: FormData): Promise<void> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      // Verificar se a resposta foi bem-sucedida
      if (!response.ok) {
        const responseText = await response.text();

        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        let errorData: any = null;

        try {
          errorData = JSON.parse(responseText);

          // Extrair mensagem de erro usando a função atualizada
          errorMessage = this.extractErrorMessage(errorData);
        } catch (parseError) {
          if (responseText) {
            errorMessage = responseText;
          }
        }

        // Passar o errorData para o tratamento de erro
        throw { message: errorMessage, data: errorData };
      }

      const data = await response.json();

      this.handleSuccessResponse(data);
    } catch (error: any) {
      // Passar o error.data para o handleRequestError
      if (error.data) {
        this.handleRequestError({ ...error, error: error.data });
      } else {
        this.handleRequestError(error);
      }
    }
  }

  private extractErrorMessage(errorData: any): string {
    // Tratar formato: {"errorMessages":["mensagem1", "mensagem2"]}
    if (errorData.errorMessages && Array.isArray(errorData.errorMessages)) {
      return errorData.errorMessages.join(' | ');
    }

    // Tratar formato: {"errors":["mensagem1", "mensagem2"]}
    if (errorData.errors && Array.isArray(errorData.errors)) {
      return errorData.errors.join(' | ');
    }

    // Tratar erros do ErrorOnValidationException
    if (errorData.errors && Array.isArray(errorData.errors)) {
      return errorData.errors.join(' | ');
    }

    // Tratar erros do ErrorsMessagesException
    if (errorData.message) {
      return errorData.message;
    }

    // Tratar erros de validação do FluentValidation
    if (errorData.errors && typeof errorData.errors === 'object') {
      const messages = Object.entries(errorData.errors)
        .map(([field, fieldErrors]) => {
          if (Array.isArray(fieldErrors)) {
            return `${field}: ${fieldErrors.join(', ')}`;
          }
          return `${field}: ${fieldErrors}`;
        })
        .join(' | ');
      return messages;
    }

    if (errorData.title) {
      return errorData.title;
    }

    return 'Erro desconhecido';
  }

  private appendFormData(formData: FormData): void {
    // Identification
    this.appendFormSection(formData, 'identification', this.formData.identification);

    // Solution
    this.appendFormSection(formData, 'solution', this.formData.solution);

    // Category
    this.appendFormSection(formData, 'category', this.formData.category);

    // Impact Category
    this.appendFormSection(formData, 'impactCategory', this.formData.impactCategory);

    // Deployment Window
    this.appendFormSection(formData, 'deploymentWindow', this.formData.deploymentWindow);

    // Plan Communication
    this.appendFormSection(formData, 'planComunication', this.formData.planComunication);

    // Phases
    this.appendPhaseData(formData);

    // Planning Execution
    this.appendFormSection(formData, 'planningExecutation', this.formData.planningExecutation);

    // Planning Remediation
    this.appendFormSection(formData, 'PlanningRemediation', this.formData.PlanningRemediation);
  }

  private appendFormSection(
    formData: FormData,
    prefix: string,
    section: Record<string, any>,
  ): void {
    Object.entries(section).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(`${prefix}.${key}`, value || '');
      }
    });
  }

  private appendPhaseData(formData: FormData): void {
    const phases = ['planning', 'testHomology', 'execute', 'validation'] as const;

    phases.forEach((phase) => {
      Object.entries(this.formData.phases[phase]).forEach(([key, value]) => {
        // A API espera "Justification" para ambos os casos
        const apiKey =
          key === 'JustificationPlanned' || key === 'JustificationTest' ? 'Justification' : key;

        if (key.includes('Date') && value) {
          formData.append(`phases.${phase}.${apiKey}`, this.formatDateToISO(value) || '');
        } else if (value !== undefined && value !== null && value !== '') {
          formData.append(`phases.${phase}.${apiKey}`, value.toString());
        }
      });
    });
  }

  private formatDateToISO(dateValue: any): string {
    if (!dateValue) return '';

    try {
      if (typeof dateValue === 'string' && dateValue.includes('T')) {
        const date = new Date(dateValue);
        return isNaN(date.getTime()) ? '' : date.toISOString();
      }

      const date = new Date(dateValue);
      return isNaN(date.getTime()) ? '' : date.toISOString();
    } catch {
      return '';
    }
  }

  private appendAttachments(formData: FormData): void {
    if (this.selectedFiles.length > 0) {
      const zipFile = this.selectedFiles[0];
      formData.append('Attachments', zipFile, zipFile.name);
    }
  }

  private handleSuccessResponse(response: any): void {
    this.isLoading = false;
    this.solicitationTicket = this.generateTicket(response);
    this.showSuccessModal = true;
    this.cdr.detectChanges();
  }

  private handleRequestError(error: any): void {
    this.isLoading = false;

    // Se tiver dados de erro do backend
    if (error.error) {
      this.displayBackendError(error.error);
    }
    // Extrair a mensagem de erro do objeto Error
    else if (error instanceof Error) {
      this.errorMessage = error.message;
    } else if (error.message) {
      this.errorMessage = error.message;
    } else {
      this.errorMessage = 'Erro desconhecido ao enviar solicitação';
    }

    this.cdr.detectChanges();
  }

  private displayBackendError(errorData: any): void {
    // Tratar formato: {"errorMessages":["mensagem1", "mensagem2"]}
    if (errorData.errorMessages && Array.isArray(errorData.errorMessages)) {
      this.errorMessages = errorData.errorMessages;
      this.cdr.detectChanges();
      return;
    }

    // Verificar se é um array de strings (ErrorOnValidationException)
    if (errorData.errors && Array.isArray(errorData.errors)) {
      this.errorMessages = errorData.errors;
      this.cdr.detectChanges();
      return;
    }

    // Verificar se é um objeto com propriedades de validação
    if (errorData.errors && typeof errorData.errors === 'object') {
      const messages: string[] = [];

      Object.entries(errorData.errors).forEach(([field, fieldErrors]) => {
        if (Array.isArray(fieldErrors)) {
          messages.push(`${field}: ${fieldErrors.join(', ')}`);
        }
      });

      if (messages.length > 0) {
        this.errorMessages = messages;
        this.cdr.detectChanges();
        return;
      }
    }

    // Verificar se tem uma mensagem direta (ErrorsMessagesException)
    if (errorData.message) {
      this.errorMessage = errorData.message;
      this.cdr.detectChanges();
      return;
    }

    // Fallback
    this.errorMessage = 'Erro ao processar a solicitação.';
    this.cdr.detectChanges();
  }

  private generateTicket(response: any): string {
    if (response.ticket) return response.ticket;
    if (response.id) return `RDM-${response.id}`;

    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const randomId = Math.random().toString(36).substr(2, 6).toUpperCase();
    return `RDM-${dateStr}-${randomId}`;
  }

  // ============================================
  // MANIPULAÇÃO DE MODAIS
  // ============================================

  closeSuccessModal(): void {
    this.showSuccessModal = false;
    this.resetForm();
    this.cdr.detectChanges();
  }

  resetAndClose(): void {
    this.resetForm();
    this.closeSuccessModal();
    this.scrollToTop();
  }

  // ============================================
  // UTILITÁRIOS
  // ============================================

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.showBackToTop = window.scrollY > this.SCROLL_THRESHOLD;
    this.cdr.detectChanges();
  }

  private checkWindowScroll(): void {
    this.showBackToTop = window.scrollY > this.SCROLL_THRESHOLD;
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  resetForm(): void {
    this.formData = this.createEmptyFormData();
    this.selectedFiles = [];
    this.currentStep = 1;
    this.clearMessages();
    this.cdr.detectChanges();
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.errorMessages = [];
    this.successMessage = '';
    this.cdr.detectChanges();
  }

  private createEmptyFormData(): ApiFormData {
    return {
      identification: {
        Type: '',
        Title: '',
      },
      solution: {
        ObjectiveOrSolution: '',
      },
      category: {
        Objective: '',
        Action: '',
        Impact: '',
        Urgency: '',
      },
      impactCategory: {
        ChangeSystem: '',
        Activity: '',
        ImpactedServices: '',
        Environment: '',
        ICsImpacted: '',
      },
      deploymentWindow: {
        ImpactType: '',
      },
      planComunication: {
        WhosNotified: '',
        Moment: '',
        ComunicationType: '',
        TechnologyArea: '',
      },
      phases: {
        planning: this.createEmptyPhaseData(),
        testHomology: this.createEmptyPhaseData(),
        execute: this.createEmptyPhaseData(),
        validation: this.createEmptyPhaseData(),
      },
      planningExecutation: {
        Ativity: '',
        TechnologyArea: '',
        ProbabilityOfSuccess: '',
      },
      PlanningRemediation: {
        Ativity: '',
        TechnologyArea: '',
        ProbabilityOfSuccess: '',
      },
    };
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.showSearchModal) {
      this.closeSearchModal();
    }
  }

  private createEmptyPhaseData(): PhaseData {
    return {
      WasPlanned: '',
      JustificationPlanned: '',
      WasTested: '',
      JustificationTest: '',
      stage: '',
      startDate: '',
      endDate: '',
    };
  }
}
