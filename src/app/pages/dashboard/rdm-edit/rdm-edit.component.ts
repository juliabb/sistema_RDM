// src/app/pages/dashboard/rdm-edit/rdm-edit.component.ts
import { Component, OnInit, ChangeDetectorRef, OnDestroy, ViewChild, HostListener} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../../services/auth-services';
import { buildApiUrl, API_PATHS } from '../../../config/api.config';
import { ModalComponent } from '../../../components/modal/modal.component';
import { NgForm } from '@angular/forms';
import {
  ApiFormData,
  PhaseData,
  FoundRDM,
  SelectOption
} from '../rdm-form/rdm-form';

interface FormStep {
  number: number;
  label: string;
  key: string;
}

@Component({
  selector: 'app-rdm-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, ModalComponent],
  templateUrl: './rdm-edit.html',
  styleUrls: ['./rdm-edit.css']
})
export class RdmEditComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  @ViewChild('requestForm') requestForm!: NgForm;
  private originalFormData: ApiFormData | null = null;

  // Estados do componente
  isLoading = false;
  isFetching = false;
  errorMessage = '';
  successMessage = '';
  showSuccessModal = false;
  showCancelModalVisible = false;

  // Ticket da RDM sendo editada
  ticket = '';
  originalStatus = '';

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

  // Opções dos selects (importadas do rdm-form)
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
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly http: HttpClient,
    private readonly authService: AuthService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.ticket = params['ticket'];
      if (this.ticket) {
        this.fetchRDMData();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private fetchRDMData(): void {
    this.isFetching = true;
    this.errorMessage = '';

    const token = this.authService.getToken();
    if (!token) {
      this.errorMessage = 'Você precisa estar logado para editar solicitações.';
      this.isFetching = false;
      this.cdr.detectChanges();
      return;
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });

    const url = buildApiUrl(API_PATHS.RDM_BY_ID(this.ticket));

    this.http.get<FoundRDM>(url, { headers })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isFetching = false;

          // Verificar se a resposta tem um status
          if (response.status && response.status.toLowerCase() !== 'pendente') {
            this.errorMessage = 'Esta solicitação não pode ser editada porque não está mais pendente.';
            this.cdr.detectChanges();
            return;
          }

          // Mapear os dados para o formulário
          this.mapRDMDataToForm(response);

          // Configurar detecção de alterações
          this.setupFormChangeDetection();

          this.cdr.detectChanges();
        },
        error: (error) => {
          this.isFetching = false;
          this.errorMessage = this.getFetchErrorMessage(error);
          this.cdr.detectChanges();
        }
      });
  }

  private getFetchErrorMessage(error: any): string {
    if (error.status === 404) {
      return `Solicitação "${this.ticket}" não encontrada.`;
    } else if (error.status === 401) {
      return 'Sessão expirada. Por favor, faça login novamente.';
    } else if (error.status === 403) {
      return 'Você não tem permissão para editar esta solicitação.';
    } else {
      return `Erro ao carregar dados: ${error.message || 'Erro desconhecido'}`;
    }
  }

  private mapRDMDataToForm(rdmData: FoundRDM): void {
    const newFormData = this.createEmptyFormData();

    // Identification
    if (rdmData.identification) {
      newFormData.identification.Type = rdmData.identification.type || '';
      newFormData.identification.Title = rdmData.identification.title || '';
    }

    // Solution
    if (rdmData.solution) {
      newFormData.solution.ObjectiveOrSolution = rdmData.solution.objectiveOrSolution || '';
    }

    // Category
    if (rdmData.category) {
      newFormData.category.Objective = rdmData.category.objective || '';
      newFormData.category.Action = rdmData.category.action || '';
      newFormData.category.Impact = rdmData.category.impact || '';
      newFormData.category.Urgency = rdmData.category.urgency || '';
    }

    // Impact Category
    if (rdmData.impactCategory) {
      newFormData.impactCategory.ChangeSystem = rdmData.impactCategory.changeSystem || '';
      newFormData.impactCategory.Activity = rdmData.impactCategory.activity || '';
      newFormData.impactCategory.ImpactedServices = rdmData.impactCategory.impactedServices || '';
      newFormData.impactCategory.Environment = rdmData.impactCategory.environment || '';
      newFormData.impactCategory.ICsImpacted = rdmData.impactCategory.iCsImpacted || '';
    }

    // Deployment Window
    if (rdmData.deploymentWindow) {
      newFormData.deploymentWindow.ImpactType = rdmData.deploymentWindow.impactType || '';
    }

    // Plan Communication
    if (rdmData.planComunication) {
      newFormData.planComunication.WhosNotified = rdmData.planComunication.whosNotified || '';
      newFormData.planComunication.Moment = rdmData.planComunication.moment || '';
      newFormData.planComunication.ComunicationType = rdmData.planComunication.comunicationType || '';
      newFormData.planComunication.TechnologyArea = this.normalizeTechnologyArea(rdmData.planComunication.technologyArea || '');
    }

    // Phases
    if (rdmData.phases) {
      this.mapPhaseData(newFormData, rdmData.phases);
    }

    // Planning Execution
    if (rdmData.planningExecutation) {
      newFormData.planningExecutation.Ativity = rdmData.planningExecutation.ativity || '';
      newFormData.planningExecutation.TechnologyArea = rdmData.planningExecutation.technologyArea || '';
      newFormData.planningExecutation.ProbabilityOfSuccess = rdmData.planningExecutation.probabilityOfSuccess || '';
    }

    // Planning Remediation
    if (rdmData.planningRemediation) {
      newFormData.PlanningRemediation.Ativity = rdmData.planningRemediation.ativity || '';
      newFormData.PlanningRemediation.TechnologyArea = rdmData.planningRemediation.technologyArea || '';
      newFormData.PlanningRemediation.ProbabilityOfSuccess = rdmData.planningRemediation.probabilityOfSuccess || '';
    }

    this.formData = newFormData;
    this.originalFormData = JSON.parse(JSON.stringify(newFormData));
  }

  private normalizeTechnologyArea(area: string): string {
    if (!area) return '';

    const areaMap: Record<string, string> = {
      'banco de dados': 'BancoDeDados',
      'bancodedados': 'BancoDeDados',
      'banco dados': 'BancoDeDados',
      'bd': 'BancoDeDados',
      'database': 'BancoDeDados',
      'linux': 'Linux',
      'unix': 'Linux',
      'windows': 'Windows',
      'win': 'Windows',
      'redes': 'Redes',
      'network': 'Redes',
      'rede': 'Redes',
    };

    const normalizedInput = area.toLowerCase().trim();

    if (areaMap[normalizedInput]) {
      return areaMap[normalizedInput];
    }

    for (const [key, value] of Object.entries(areaMap)) {
      if (normalizedInput.includes(key)) {
        return value;
      }
    }

    const validOptions = ['BancoDeDados', 'Linux', 'Windows', 'Redes'];
    if (validOptions.includes(area)) {
      return area;
    }

    return area || '';
  }

  private mapPhaseData(formData: ApiFormData, phases: FoundRDM['phases']): void {
    // Planejamento
    const planning = phases?.planning as any;
    if (planning) {
      formData.phases.planning.WasPlanned = planning.wasPlanned ?? planning.WasPlanned ?? '';

      const planningJustification =
        planning.justification ?? planning.Justification ?? planning.JustificationPlanned ?? '';

      formData.phases.planning.JustificationPlanned = planningJustification || '';
    }

    // Teste/Homologação
    const testHomology = phases?.testHomology as any;
    if (testHomology) {
      formData.phases.testHomology.WasTested =
        testHomology.wasTested ?? testHomology.WasTested ?? '';

      const testJustification =
        testHomology.justification ?? testHomology.Justification ?? testHomology.JustificationTest ?? '';

      formData.phases.testHomology.JustificationTest = testJustification || '';
    }

    // Execução
    if (phases?.execute) {
      formData.phases.execute.stage = phases.execute.stage?.toString() || '';
      formData.phases.execute.startDate = this.convertISOToDatetimeLocal(phases.execute.startDate);
      formData.phases.execute.endDate = this.convertISOToDatetimeLocal(phases.execute.endDate);
    }

    // Validação
    if (phases?.validation) {
      formData.phases.validation.stage = phases.validation.stage?.toString() || '';
      formData.phases.validation.startDate = this.convertISOToDatetimeLocal(phases.validation.startDate);
      formData.phases.validation.endDate = this.convertISOToDatetimeLocal(phases.validation.endDate);
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

  // ============================================
  // DETECÇÃO DE ALTERAÇÕES EM TEMPO REAL
  // ============================================

  private setupFormChangeDetection(): void {
    // Usar valueChanges do formulário
    if (this.requestForm && this.requestForm.valueChanges) {
      this.requestForm.valueChanges.pipe(
        takeUntil(this.destroy$)
      ).subscribe(() => {
        this.cdr.detectChanges(); // Atualiza a UI
      });
    }
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
  // ENVIO DO FORMULÁRIO (PUT)
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
      this.errorMessage = 'Você precisa estar logado para editar solicitações.';
      this.cdr.detectChanges();
      return;
    }

    this.isLoading = true;
    this.cdr.detectChanges();

    // Preparar dados para a API (formato JSON)
    const requestData = this.preparePutData();

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });

    const url = buildApiUrl(API_PATHS.RDM_BY_ID(this.ticket));

    this.http.put(url, requestData, { headers })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.showSuccessModal = true;
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = this.getUpdateErrorMessage(error);
          this.cdr.detectChanges();
        }
      });
  }

  private preparePutData(): any {
    // Preparar os dados no formato esperado pela API PUT
    return {
      identification: {
        type: this.formData.identification.Type,
        title: this.formData.identification.Title
      },
      solution: {
        objectiveOrSolution: this.formData.solution.ObjectiveOrSolution
      },
      category: {
        objective: this.formData.category.Objective,
        action: this.formData.category.Action,
        impact: this.formData.category.Impact,
        urgency: this.formData.category.Urgency
      },
      impactCategory: {
        changeSystem: this.formData.impactCategory.ChangeSystem,
        activity: this.formData.impactCategory.Activity,
        impactedServices: this.formData.impactCategory.ImpactedServices,
        environment: this.formData.impactCategory.Environment,
        iCsImpacted: this.formData.impactCategory.ICsImpacted
      },
      deploymentWindow: {
        impactType: this.formData.deploymentWindow.ImpactType
      },
      planComunication: {
        whosNotified: this.formData.planComunication.WhosNotified,
        moment: this.formData.planComunication.Moment,
        comunicationType: this.formData.planComunication.ComunicationType,
        technologyArea: this.formData.planComunication.TechnologyArea
      },
      phases: {
        planning: {
          wasPlanned: this.formData.phases.planning.WasPlanned,
          justification: this.formData.phases.planning.JustificationPlanned
        },
        testHomology: {
          wasTested: this.formData.phases.testHomology.WasTested,
          justification: this.formData.phases.testHomology.JustificationTest
        },
        execute: {
          stage: this.formData.phases.execute.stage,
          startDate: this.formatDateToISO(this.formData.phases.execute.startDate),
          endDate: this.formatDateToISO(this.formData.phases.execute.endDate)
        },
        validation: {
          stage: this.formData.phases.validation.stage,
          startDate: this.formatDateToISO(this.formData.phases.validation.startDate),
          endDate: this.formatDateToISO(this.formData.phases.validation.endDate)
        }
      },
      planningExecutation: {
        ativity: this.formData.planningExecutation.Ativity,
        technologyArea: this.formData.planningExecutation.TechnologyArea,
        probabilityOfSuccess: this.formData.planningExecutation.ProbabilityOfSuccess
      },
      planningRemediation: {
        ativity: this.formData.PlanningRemediation.Ativity,
        technologyArea: this.formData.PlanningRemediation.TechnologyArea,
        probabilityOfSuccess: this.formData.PlanningRemediation.ProbabilityOfSuccess
      },
      attachments: null // Mantém os anexos originais
    };
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

  private getUpdateErrorMessage(error: any): string {
    if (error.status === 404) {
      return `Solicitação "${this.ticket}" não encontrada.`;
    } else if (error.status === 401) {
      return 'Sessão expirada. Por favor, faça login novamente.';
    } else if (error.status === 403) {
      return 'Você não tem permissão para editar esta solicitação.';
    } else if (error.status === 400 && error.error) {
      // Tentar extrair mensagens de validação
      if (error.error.errors) {
        return Object.entries(error.error.errors)
          .map(([field, messages]) => `${field}: ${(messages as string[]).join(', ')}`)
          .join(' | ');
      }
      return error.error.message || error.error.title || 'Erro de validação.';
    } else {
      return `Erro ao atualizar solicitação: ${error.message || 'Erro desconhecido'}`;
    }
  }

  // ============================================
  // MANIPULAÇÃO DE MODAIS
  // ============================================

  closeSuccessModal(): void {
    this.showSuccessModal = false;
    // Redirecionar de volta para o dashboard após o sucesso
    this.router.navigate(['/dashboard']);
  }

  // ============================================
  // VERIFICAÇÃO DE ALTERAÇÕES NÃO SALVAS
  // ============================================

  hasUnsavedChanges(): boolean {
    // Método 1: Verifica se o formulário está "sujo" (tocado)
    if (this.requestForm?.dirty) {
      return true;
    }

    // Método 2: Comparação profunda com dados originais
    if (!this.originalFormData) {
      return false;
    }

    return !this.areFormsEqual(this.formData, this.originalFormData);
  }

  private areFormsEqual(form1: any, form2: any): boolean {
    // Converte ambos para JSON e compara
    return JSON.stringify(this.normalizeFormData(form1)) ===
           JSON.stringify(this.normalizeFormData(form2));
  }

  private normalizeFormData(formData: any): any {
    // Remove campos vazios para comparação mais precisa
    const normalized = { ...formData };

    // Função recursiva para limpar valores vazios
    const cleanObject = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(cleanObject);
      } else if (obj && typeof obj === 'object') {
        const cleaned: any = {};
        for (const [key, value] of Object.entries(obj)) {
          const cleanedValue = cleanObject(value);
          // Mantém apenas propriedades que não são strings vazias ou undefined
          if (cleanedValue !== '' && cleanedValue !== undefined) {
            cleaned[key] = cleanedValue;
          }
        }
        return cleaned;
      }
      return obj === '' ? undefined : obj;
    };

    return cleanObject(normalized);
  }

  showCancelModal(): void {
    if (this.hasUnsavedChanges()) {
      this.showCancelModalVisible = true;
    } else {
      // Se não houver alterações, pode cancelar diretamente
      this.confirmCancelEdit();
    }
    this.cdr.detectChanges();
  }

  onCancelModalClosed(): void {
    this.showCancelModalVisible = false;
    this.cdr.detectChanges();
  }

  // Método para resetar o estado do formulário
  confirmCancelEdit(): void {
    this.showCancelModalVisible = false;
    // Se houver alterações não salvas, reseta o formulário para o estado original
    if (this.originalFormData && this.hasUnsavedChanges()) {
      this.resetFormToOriginal();
    }
    this.router.navigate(['/dashboard/minhas-solicitacoes']);
    this.cdr.detectChanges();
  }

  private resetFormToOriginal(): void {
    if (this.originalFormData) {
      this.formData = JSON.parse(JSON.stringify(this.originalFormData));
      if (this.requestForm) {
        this.requestForm.reset(this.formData);
      }
    }
  }

  // Navegação do navegador
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) {
      event.preventDefault();
      event.returnValue = 'Você tem alterações não salvas. Tem certeza que deseja sair?';
    }
  }

  // ============================================
  // UTILITÁRIOS
  // ============================================

  private scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
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
