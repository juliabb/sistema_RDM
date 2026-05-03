// src\app\pages\dashboard\rdm-form\rdm-form.ts
import {
  Component,
  HostListener,
  OnInit,
  ChangeDetectorRef,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../../services/auth-service';
import { buildApiUrl, API_PATHS } from '../../../config/api.config';
import { ValidationService } from './validation.service';
import { FieldErrorComponent } from './field-error/field-error.component';
import { ModalComponent } from '../../../components/modal/modal.component';
import { RefreshService } from '../../../services/refresh.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SystemService, SystemServiceApi } from '../../../services/system.service';

// ============================================
// INTERFACES (compartilhadas)
// ============================================
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
  impactCategory: {
    ChangeSystem: string;
    Environment: string;
    Activity: string;
    ICsImpacted: string;
    ImpactedServices: string;
    SystemUrl: string;
    GitRepository: string;
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
    systemUrl?: string;
    gitUrl?: string;
  };
  deploymentWindow?: {
    ImpactType: string;
  };
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface FoundRDM {
  ticket: string;
  date: string;
  status?: string;
  identification?: {
    type: string;
    title: string;
    area: string;
    name?: string;
    email?: string;
    dateCreated?: string;
    status?: string;
  };
  solution?: {
    objectiveOrSolution: string;
  };
  categorization?: {
    systemOrService: string;
    environmentService: string;
    objectiveOfTheChange: string;
    affectedItems: string;
    systemUrl?: string;
    gitRepository?: string;
  };
  impactPriority?: {
    affectedFunctionalities?: string;
    serviceCondition?: string;
    impacatOfLevel?: string;
    impact?: string;
    urgency?: string;
  };
  planComunication?: {
    whosNotified: string;
    comunicationType: string;
    emailsCc?: string[] | string;
    technologyArea: string;
  };
  phases?: {
    planning?: {
      wasPlanned?: string;
      justification?: string;
    };
    testHomology?: {
      wasTested?: string;
      justification?: string;
    };
    executionWindow?: {
      startDate?: string;
      endDate?: string;
    };
    validation?: {
      startDate?: string;
      endDate?: string;
    };
  };
  planning?: {
    executionPlanning: string;
    probabilityOfSuccessExecution: string;
    remediationPlanning: string;
    probabilityOfSuccessRemediation: string;
    executingArea: string;
    wasRemediationPlanned?: string;
    unplannedRemediationJustification?: string;
    justificationRemediation?: string;
    systemUrl?: string;
    gitUrl?: string;
  };
}

export interface ApiErrorResponse {
  message?: string;
  errors?: string[] | Record<string, string[]>;
  title?: string;
  status?: number;
}

@Component({
  selector: 'app-rdm-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatSnackBarModule,
    FieldErrorComponent,
    ModalComponent,
    MatTooltipModule,
  ],
  templateUrl: './rdm-form.html',
  styleUrls: ['./rdm-form.css'],
})
export class RdmFormComponent implements OnInit, OnDestroy {
  // ============================================
  // DEPENDÊNCIAS E CONSTANTES
  // ============================================
  private readonly SCROLL_THRESHOLD = 300;
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly ALLOWED_FILE_TYPES = ['.zip'];
  private destroy$ = new Subject<void>();
  private abortController: AbortController | null = null;

  @ViewChild('requestForm') requestForm!: NgForm;

  // ============================================
  // MODO DE OPERAÇÃO
  // ============================================
  isEditMode = false;
  isCreateMode = true; // !isEditMode
  ticket = '';
  originalStatus = '';
  originalFormData: ApiFormData | null = null;

  // ============================================
  // ESTADOS DO COMPONENTE
  // ============================================
  isLoading = false;
  isFetching = false; // apenas para edição
  errorMessage = '';
  errorMessages: string[] = [];
  successMessage = '';
  showBackToTop = false;
  showSuccessModal = false;
  solicitationTicket = ''; // usado apenas na criação
  systemsList: SystemService[] = [];
  selectedSystem = '';
  customSystemName = '';

  // ============================================
  // CONTROLE DE PASSOS E VALIDAÇÃO
  // ============================================
  currentStep = 1;
  readonly totalSteps = 6;
  steps: FormStep[] = [
    { number: 1, label: 'Identificação', key: 'identification' },
    { number: 2, label: 'Categorização', key: 'categorization' },
    { number: 3, label: 'Comunicação', key: 'communication' },
    { number: 4, label: 'Cronograma', key: 'Timeline' },
    { number: 5, label: 'Planejamento', key: 'planning' },
    { number: 6, label: 'Anexos', key: 'attachments' },
  ];

  stepValidity: Record<number, boolean> = {
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
    6: true, // anexos opcional
  };

  fieldErrors: Record<string, string> = {};
  touchedFields: Set<string> = new Set();

  // ============================================
  // DADOS DO FORMULÁRIO
  // ============================================
  formData: ApiFormData = this.createEmptyFormData();

  // ============================================
  // CONTROLES ESPECÍFICOS
  // ============================================
  currentEmailInput = '';
  emailError = '';
  icsImpactedNotApplicable = false;
  emailsNotApplicable = false;

  // Anexos (apenas criação)
  selectedFiles: File[] = [];

  // Modal de ajuda
  showHelpModal = false;

  // Modal de busca (apenas criação)
  showSearchModal = false;
  searchTicket = '';
  foundRDM: FoundRDM | null = null;
  searchError = '';
  isSearching = false;
  isCopying = false;

  // Modal de cancelamento (apenas edição)
  showCancelModalVisible = false;

  // ============================================
  // OPÇÕES DOS SELECTS
  // ============================================
  readonly requestTypes: SelectOption[] = [
    { value: 'Emergencial', label: 'Emergencial' },
    { value: 'Normal', label: 'Normal' },
    { value: 'Padrão', label: 'Padrão' },
  ];

  readonly impactTypes: SelectOption[] = [
    { value: 'SemIndisponibilidade', label: 'Sem Indisponibilidade' },
    { value: 'Intermitência', label: 'Intermitência' },
    { value: 'IndisponibilidadeParcial', label: 'Indisponibilidade Parcial' },
    { value: 'IndisponibilidadeTotal', label: 'Indisponibilidade Total' },
  ];

  readonly levelTypes: SelectOption[] = [
    { value: 'Baixo', label: 'Baixo' },
    { value: 'Medio', label: 'Médio' },
    { value: 'Alto', label: 'Alto' },
  ];

  readonly activityTypes: SelectOption[] = [
    { value: 'Atualização', label: 'Atualização (patch, upgrade, Deploy aplicação)' },
    { value: 'Correção', label: 'Correção (bug/falha)' },
    { value: 'Melhoria', label: 'Melhoria (evolução)' },
    { value: 'Desativação', label: 'Desativação (remoção/desligamento/exclusão)' },
    { value: 'Substituição', label: 'Substituição (troca de componente/servidor)' },
    { value: 'Implantação', label: 'Implantação (novo componente/serviço, aplicação)' },
    {
      value: 'Alteração de configuração',
      label:
        'Alteração de configuração (parametrização ex: firewall, DNS, Ajustes IIS, Java, Linux services, etc.)',
    },
  ];

  readonly environmentTypes: SelectOption[] = [
    { value: 'Produção', label: 'Produção' },
    { value: 'Homologação', label: 'Homologação' },
    { value: 'Desenvolvimento', label: 'Desenvolvimento' },
    { value: 'Treinamento', label: 'Treinamento' },
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

  readonly comunicationTypeOptions: SelectOption[] = [{ value: 'Email', label: 'E-mail' }];

  readonly technologyAreaOptions: SelectOption[] = [
    { value: 'BancoDeDados', label: 'Banco de Dados' },
    { value: 'Linux', label: 'Linux' },
    { value: 'Windows', label: 'Equipe Windows' },
    { value: 'Redes', label: 'Redes' },
    { value: 'Seguranca', label: 'Segurança' },
  ];

  readonly stageOptions: SelectOption[] = [
    { value: 'Antes', label: 'Antes' },
    { value: 'Depois', label: 'Depois' },
    { value: 'Durante', label: 'Durante' },
  ];

  // ============================================
  // CONSTRUTOR E CICLO DE VIDA
  // ============================================
  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService,
    private readonly cdr: ChangeDetectorRef,
    private readonly validationService: ValidationService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private refreshService: RefreshService,
    private snackBar: MatSnackBar,
    private systemService: SystemServiceApi,
  ) {}

  ngOnInit(): void {
    this.checkWindowScroll();
    this.loadSystems();

    this.route.params.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const ticketParam = params['ticket'];
      if (ticketParam) {
        this.isEditMode = true;
        this.isCreateMode = false;
        this.ticket = ticketParam;
        this.fetchRDMData();
      } else {
        this.isEditMode = false;
        this.isCreateMode = true;
        this.initializeFormData();
      }
      // Observable para filtrar os sistemas conforme digita
    });

    // Verifica se deve abrir o modal de busca (clonagem)
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      if (params['openSearch'] === 'true' && !this.isEditMode) {
        // Pequeno delay para garantir que a view está pronta
        setTimeout(() => this.openSearchModal(), 0);
        // Remove o parâmetro da URL para não reabrir em recargas
        this.router.navigate([], {
          queryParams: { openSearch: undefined },
          replaceUrl: true,
        });
      }
    });

    setTimeout(() => {
      this.updateStepValidityWithoutErrors();
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================
  // INICIALIZAÇÃO DO FORMULÁRIO (CRIAÇÃO)
  // ============================================
  private initializeFormData(): void {
    this.formData = this.createEmptyFormData();
    this.stepValidity = {
      1: false,
      2: false,
      3: false,
      4: false,
      5: false,
      6: true,
    };
    this.stepValid = false;
    this.fieldErrors = {};
    this.touchedFields.clear();
  }

  stepValid = false;

  loadSystems(): void {
    this.systemService.getAllSystems().subscribe({
      next: (data: SystemService[]) => {
        this.systemsList = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Erro ao carregar sistemas:', err),
    });
  }

  private _filterSystems(value: string): SystemService[] {
    const filterValue = value.toLowerCase();
    return this.systemsList.filter(
      (s) =>
        s.systemService.toLowerCase().includes(filterValue) ||
        s.department.toLowerCase().includes(filterValue),
    );
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
      impactCategory: {
        ChangeSystem: '',
        Environment: '',
        Activity: '',
        ICsImpacted: '',
        ImpactedServices: '',
        SystemUrl: '',
        GitRepository: '',
      },
      impactPriority: {
        ServiceCondition: '',
        Impact: '',
        Urgency: '',
      },
      planComunication: {
        EmailsCc: [],
      },
      phases: {
        planning: {
          WasPlanned: '',
          JustificationPlanned: '',
        },
        testHomology: {
          WasTested: '',
          JustificationTest: '',
        },
        executionWindow: {
          stage: 'Durante',
          startDate: '',
          endDate: '',
        },
        validation: {
          stage: 'Depois',
          startDate: '',
          endDate: '',
        },
      },
      planningExecutation: {
        Ativity: '',
        TechnologyArea: '',
        ProbabilityOfSuccess: '',
      },
      PlanningRemediation: {
        Ativity: '',
        ProbabilityOfSuccess: '',
        TechnologyArea: '',
        WasRemediationPlanned: '',
        JustificationRemediation: '',
      },
      deploymentWindow: {
        ImpactType: '',
      },
    };
  }

  onRemediationChange(): void {
    const value = this.formData.PlanningRemediation.WasRemediationPlanned;
    if (value === 'SIM') {
      this.formData.PlanningRemediation.JustificationRemediation = '';
      this.markFieldAsTouched('PlanningRemediation.Ativity');
      this.markFieldAsTouched('PlanningRemediation.ProbabilityOfSuccess');
    } else if (value === 'NAO') {
      this.formData.PlanningRemediation.Ativity = '';
      this.formData.PlanningRemediation.ProbabilityOfSuccess = '';
      this.markFieldAsTouched('PlanningRemediation.JustificationRemediation');
    }
    this.updateCurrentStepValidity();
  }

  updateSystemValue(): void {
    if (this.selectedSystem === 'Outros') {
      this.formData.impactCategory.ChangeSystem = this.customSystemName.trim();
    } else {
      this.formData.impactCategory.ChangeSystem = this.selectedSystem;
    }
    // Marca o campo como tocado para validação
    this.markFieldAsTouched('impactCategory.ChangeSystem');
    this.updateCurrentStepValidity();
  }

  private syncSystemSelection(): void {
    const currentValue = this.formData.impactCategory.ChangeSystem;
    const existsInList = this.systemsList.some((s) => s.systemService === currentValue);

    if (existsInList || !currentValue) {
      this.selectedSystem = currentValue || '';
      this.customSystemName = '';
    } else {
      this.selectedSystem = 'Outros';
      this.customSystemName = currentValue;
    }
  }

  // ============================================
  // CARREGAMENTO DOS DADOS (EDIÇÃO)
  // ============================================
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

    this.http
      .get<any>(url, { headers })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isFetching = false;
          const status = (response.identification?.status || response.status || '')
            .toLowerCase()
            .trim();
          this.originalStatus = response.identification?.status || response.status;

          if (status !== 'corrigir') {
            this.showErrorAndRedirect(
              'O status da solicitação não permite edição. Status atual: ' + this.originalStatus,
            );
            return;
          }

          this.formData = this.mapApiToFormData(response);
          this.syncSystemSelection();
          // ----- Inicializa checkbox de e-mails -----
          this.emailsNotApplicable = this.formData.planComunication.EmailsCc.length === 0;

          this.originalFormData = JSON.parse(JSON.stringify(this.formData));
          this.updateStepValidityWithoutErrors();
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.isFetching = false;
          console.error('Erro ao carregar RDM:', error);

          if (error.status === 500) {
            this.snackBar.open(
              'Erro ao carregar os dados da solicitação. Tente novamente mais tarde.',
              'Fechar',
              {
                duration: 5000,
                panelClass: ['error-snackbar'],
              },
            );
            this.router.navigate(['/rdm-details', this.ticket]);
          } else {
            this.errorMessage = this.getFetchErrorMessage(error);
            this.cdr.detectChanges();
          }
        },
      });
  }

  private showErrorAndRedirect(message: string): void {
    this.snackBar.open(message, 'Fechar', {
      duration: 5000,
      panelClass: ['error-snackbar'],
    });
    this.router.navigate(['/rdm-details', this.ticket]);
  }

  private getFetchErrorMessage(error: any): string {
    if (error.status === 404) {
      return `Solicitação "${this.ticket}" não encontrada.`;
    } else if (error.status === 401) {
      return 'Sessão expirada. Por favor, faça login novamente.';
    } else if (error.status === 403) {
      return 'Você não tem permissão para editar esta solicitação.';
    } else if (error.status === 500) {
      return 'Erro interno do servidor. Não foi possível carregar os dados.';
    } else {
      return `Erro ao carregar dados: ${error.message || 'Erro desconhecido'}`;
    }
  }

  private mapApiToFormData(apiData: any): ApiFormData {
    const formData = this.createEmptyFormData();

    // Identification
    if (apiData.identification) {
      formData.identification.Type = apiData.identification.type || '';
      formData.identification.Title = apiData.identification.title || '';
    }

    // Solution
    if (apiData.solution) {
      formData.solution.ObjectiveOrSolution = apiData.solution.objectiveOrSolution || '';
    }

    // Categorization
    if (apiData.categorization) {
      formData.impactCategory.ChangeSystem = apiData.categorization.systemOrService || '';
      formData.impactCategory.Environment = apiData.categorization.environmentService || '';
      formData.impactCategory.Activity = this.mapBackendToActivity(
        apiData.categorization.objectiveOfTheChange || '',
      );
      formData.impactCategory.ICsImpacted = apiData.categorization.affectedItems || '';
    }

    // ImpactPriority
    if (apiData.impactPriority) {
      formData.impactCategory.ImpactedServices =
        apiData.impactPriority.affectedFunctionalities || '';

      if (apiData.impactPriority.serviceCondition) {
        formData.impactPriority.ServiceCondition = this.normalizeImpactValue(
          apiData.impactPriority.serviceCondition,
        );
      } else if (apiData.impactPriority.impacatOfLevel) {
        formData.impactPriority.ServiceCondition = this.normalizeImpactValue(
          apiData.impactPriority.impacatOfLevel,
        );
      }

      if (apiData.impactPriority.impact) {
        formData.impactPriority.Impact = apiData.impactPriority.impact;
      }

      if (apiData.impactPriority.urgency) {
        formData.impactPriority.Urgency = apiData.impactPriority.urgency;
      }
    }

    // Plan Communication
    if (apiData.planComunication) {
      if (apiData.planComunication.emailsCc) {
        if (Array.isArray(apiData.planComunication.emailsCc)) {
          formData.planComunication.EmailsCc = apiData.planComunication.emailsCc.filter(
            (e: string) => e && e.trim() !== '',
          );
        } else if (typeof apiData.planComunication.emailsCc === 'string') {
          formData.planComunication.EmailsCc = (apiData.planComunication.emailsCc as string)
            .split(',')
            .map((e) => e.trim())
            .filter((e) => e.length > 0);
        }
      }
      // Inicializa o checkbox com base na existência de e-mails
      this.emailsNotApplicable = formData.planComunication.EmailsCc.length === 0;
    }

    // Phases
    if (apiData.phases) {
      if (apiData.phases.planning) {
        formData.PlanningRemediation.WasRemediationPlanned = this.mapRemediationFromBackend(
          apiData.planning.wasRemediationPlanned,
        );
      }
      if (apiData.phases.testHomology) {
        formData.phases.testHomology.WasTested =
          apiData.phases.testHomology.wasTested === 'SIM' ? 'SIM' : 'NAO';
        formData.phases.testHomology.JustificationTest =
          apiData.phases.testHomology.justification || '';
      }
      if (apiData.phases.executionWindow) {
        formData.phases.executionWindow.startDate = this.convertISOToDatetimeLocal(
          apiData.phases.executionWindow.startDate,
        );
        formData.phases.executionWindow.endDate = this.convertISOToDatetimeLocal(
          apiData.phases.executionWindow.endDate,
        );
        formData.phases.executionWindow.stage = 'Durante';
      }
      if (apiData.phases.validation) {
        formData.phases.validation.startDate = this.convertISOToDatetimeLocal(
          apiData.phases.validation.startDate,
        );
        formData.phases.validation.endDate = this.convertISOToDatetimeLocal(
          apiData.phases.validation.endDate,
        );
        formData.phases.validation.stage = 'Depois';
      }
    }

    // Planning
    if (apiData.planning) {
      formData.planningExecutation.Ativity = apiData.planning.executionPlanning || '';
      formData.planningExecutation.ProbabilityOfSuccess = this.mapBackendProbability(
        apiData.planning.probabilityOfSuccessExecution || '',
      );
      formData.PlanningRemediation.ProbabilityOfSuccess = this.mapBackendProbability(
        apiData.planning.probabilityOfSuccessRemediation || '',
      );
      const area = this.normalizeTechnologyArea(apiData.planning.executingArea || '');
      formData.planningExecutation.TechnologyArea = area;
      formData.PlanningRemediation.TechnologyArea = area;
      formData.PlanningRemediation.WasRemediationPlanned =
        apiData.planning.wasRemediationPlanned || '';
      formData.PlanningRemediation.JustificationRemediation =
        apiData.planning.justificationRemediation || '';
      formData.impactCategory.SystemUrl = apiData.planning.systemUrl || '';
      formData.impactCategory.GitRepository = apiData.planning.gitUrl || '';
    }

    return formData;
  }

  // Métodos auxiliares de mapeamento (copiados da edição)
  private mapBackendToActivity(backendValue: string): string {
    const activityMap: Record<string, string> = {
      Atualização: 'Atualização',
      Desativação: 'Desativação',
      Substituição: 'Substituição',
      Implantação: 'Implantação',
      'Alteração de configuração': 'Alteração de configuração',
    };
    for (const [key, value] of Object.entries(activityMap)) {
      if (backendValue.toLowerCase().includes(key.toLowerCase())) {
        return value;
      }
    }
    return 'Atualização';
  }

  private mapRemediationFromBackend(value: string | undefined): string {
    if (value === 'Sim') return 'SIM';
    if (value === 'Não') return 'NAO';
    return 'NAO';
  }

  private mapBackendProbability(backendValue: string): string {
    const probMap: Record<string, string> = {
      Baixo: 'Baixo',
      Medio: 'Medio',
      Alto: 'Alto',
    };
    return probMap[backendValue] || 'Baixo';
  }

  private normalizeImpactValue(value: string): string {
    if (!value) return '';
    const trimmed = value.trim();
    const impactMap: Record<string, string> = {
      SemIndisponibilidade: 'SemIndisponibilidade',
      Intermitência: 'Intermitência',
      Intermitencia: 'Intermitência',
      IndisponibilidadeParcial: 'IndisponibilidadeParcial',
      'Indisponibilidade parcial': 'IndisponibilidadeParcial',
      IndisponibilidadeTotal: 'IndisponibilidadeTotal',
      'Indisponibilidade total': 'IndisponibilidadeTotal',
    };
    if (impactMap[trimmed]) return impactMap[trimmed];
    const withoutSpaces = trimmed.replace(/\s+/g, '');
    if (impactMap[withoutSpaces]) return impactMap[withoutSpaces];
    const lower = trimmed.toLowerCase();
    for (const [key, mappedValue] of Object.entries(impactMap)) {
      if (key.toLowerCase() === lower) return mappedValue;
    }
    return withoutSpaces;
  }

  private normalizeTechnologyArea(area: string): string {
    if (!area) return '';
    const areaMap: Record<string, string> = {
      BancoDeDados: 'BancoDeDados',
      Windows: 'Windows',
      Linux: 'Linux',
      Redes: 'Redes',
      Seguranca: 'Seguranca',
    };
    if (areaMap[area]) return area;
    const areaLower = area.toLowerCase();
    if (
      areaLower.includes('banco') ||
      areaLower.includes('dados') ||
      areaLower.includes('database')
    )
      return 'BancoDeDados';
    if (areaLower.includes('windows') || areaLower.includes('win')) return 'Windows';
    if (areaLower.includes('linux') || areaLower.includes('unix')) return 'Linux';
    if (areaLower.includes('rede') || areaLower.includes('network')) return 'Redes';
    if (areaLower.includes('segur') || areaLower.includes('security')) return 'Seguranca';
    return 'Windows';
  }

  private convertISOToDatetimeLocal(isoDate?: string): string {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  // ============================================
  // VALIDAÇÃO (comum)
  // ============================================
  private updateStepValidityWithoutErrors(): void {
    this.validateCurrentStep(false);
  }

  updateCurrentStepValidity(): void {
    this.validateCurrentStep(false);
  }

  validateCurrentStep(showErrors: boolean = true): boolean {
    try {
      if (!this.formData) {
        this.stepValidity = {
          ...this.stepValidity,
          [this.currentStep]: false,
        };
        return false;
      }

      const result = this.validationService.validateStep(this.formData, this.currentStep);

      // Ajuste para o passo 3 (emails)
      if (this.currentStep === 3) {
        if (this.emailsNotApplicable) {
          delete result.errors['planComunication.EmailsCc'];
        } else {
          const emails = this.formData.planComunication.EmailsCc || [];
          if (emails.length === 0) {
            result.errors['planComunication.EmailsCc'] =
              'Adicione pelo menos um e-mail ou marque "Não informar e-mails".';
          }
        }
      }

      result.isValid = Object.keys(result.errors).length === 0;

      if (showErrors) {
        this.fieldErrors = { ...result.errors };
      } else {
        const filteredErrors: Record<string, string> = {};
        Object.keys(result.errors).forEach((fieldPath) => {
          if (this.touchedFields.has(fieldPath)) {
            filteredErrors[fieldPath] = result.errors[fieldPath];
          }
        });
        this.fieldErrors = filteredErrors;
      }

      this.stepValidity = {
        ...this.stepValidity,
        [this.currentStep]: result.isValid,
      };
      this.stepValid = result.isValid;
      this.cdr.markForCheck();
      this.cdr.detectChanges();
      return result.isValid;
    } catch (error) {
      console.error('Erro na validação:', error);
      this.stepValidity[this.currentStep] = false;
      return false;
    }
  }

  markFieldAsTouched(fieldPath: string): void {
    this.touchedFields.add(fieldPath);
    this.validateCurrentStep(true);
  }

  getFieldError(fieldPath: string): string | null {
    if (!this.touchedFields.has(fieldPath)) return null;
    return this.fieldErrors[fieldPath] || null;
  }

  isFieldInvalid(fieldPath: string): boolean {
    return this.touchedFields.has(fieldPath) && !!this.fieldErrors[fieldPath];
  }

  onFieldBlur(fieldPath: string): void {
    this.markFieldAsTouched(fieldPath);
  }

  isFormValid(): boolean {
    if (!this.formData) return false;

    for (let step = 1; step <= 5; step++) {
      const result = this.validationService.validateStep(this.formData, step);

      if (step === 3) {
        if (this.emailsNotApplicable) {
          delete result.errors['planComunication.EmailsCc'];
        } else {
          const emails = this.formData.planComunication.EmailsCc || [];
          if (emails.length === 0) {
            result.errors['planComunication.EmailsCc'] =
              'Adicione pelo menos um e-mail ou marque "Não informar e-mails".';
          }
        }
      }

      result.isValid = Object.keys(result.errors).length === 0;

      if (!result.isValid) {
        this.currentStep = step;
        this.fieldErrors = result.errors;
        this.markAllCurrentStepFieldsAsTouched();
        this.cdr.detectChanges();
        return false;
      }
    }
    return true;
  }

  private markAllCurrentStepFieldsAsTouched(): void {
    const validations = this.getValidationsForStep(this.currentStep);
    validations.forEach((v) => this.touchedFields.add(v.field));
  }

  private getValidationsForStep(step: number): any[] {
    const stepFields: Record<number, string[]> = {
      1: ['identification.Type', 'identification.Title', 'solution.ObjectiveOrSolution'],
      2: [
        'impactCategory.ChangeSystem',
        'impactCategory.Environment',
        'impactCategory.Activity',
        'impactCategory.ICsImpacted',
        'impactCategory.ImpactedServices',
        'impactPriority.ServiceCondition',
        'impactPriority.Impact',
        'impactPriority.Urgency',
      ],
      3: ['planComunication.EmailsCc'],
      4: [
        'phases.planning.WasPlanned',
        'phases.planning.JustificationPlanned',
        'phases.testHomology.WasTested',
        'phases.testHomology.JustificationTest',
        'phases.executionWindow.startDate',
        'phases.executionWindow.endDate',
        'phases.validation.startDate',
        'phases.validation.endDate',
      ],
      5: [
        'planningExecutation.Ativity',
        'planningExecutation.TechnologyArea',
        'planningExecutation.ProbabilityOfSuccess',
        'PlanningRemediation.Ativity',
        'PlanningRemediation.ProbabilityOfSuccess',
        'PlanningRemediation.WasRemediationPlanned',
        'PlanningRemediation.JustificationRemediation',
        'impactCategory.SystemUrl',
        'impactCategory.GitRepository',
      ],
    };
    return (stepFields[step] || []).map((field) => ({ field }));
  }

  // ============================================
  // NAVEGAÇÃO ENTRE PASSOS
  // ============================================
  nextStep(form?: NgForm): void {
    if (this.isLoading) return;

    this.markAllCurrentStepFieldsAsTouched();
    const isValid = this.validateCurrentStep(true);

    if (!isValid) {
      if (form) {
        Object.keys(form.controls).forEach((key) => {
          form.controls[key]?.markAsTouched();
        });
      }
      this.cdr.detectChanges();
      return;
    }

    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      this.stepValid = false;
      this.fieldErrors = {};
      this.scrollToTop();
      this.cdr.detectChanges();
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.stepValid = false;
      this.fieldErrors = {};
      this.scrollToTop();
      this.cdr.detectChanges();
    }
  }

  goToStep(step: number): void {
    if (step < 1 || step > this.totalSteps) return;

    if (step > this.currentStep) {
      for (let s = this.currentStep; s < step; s++) {
        const tempStep = this.currentStep;
        this.currentStep = s;
        this.markAllCurrentStepFieldsAsTouched();
        if (!this.validateCurrentStep(true)) {
          this.currentStep = tempStep;
          return;
        }
      }
    }

    this.currentStep = step;
    this.fieldErrors = {};
    this.scrollToTop();
    this.cdr.detectChanges();
  }

  isStepValid(step: number): boolean {
    const tempStep = this.currentStep;
    this.currentStep = step;
    const isValid = this.validationService.isStepValid(this.formData, step);
    this.currentStep = tempStep;
    return isValid;
  }

  isCurrentStepValid(): boolean {
    const valid = this.stepValidity[this.currentStep];
    return valid;
  }

  onPhaseChange(phase: 'planning' | 'testHomology'): void {
    let value: string | undefined;
    if (phase === 'planning') {
      value = this.formData.phases.planning.WasPlanned;
    } else {
      value = this.formData.phases.testHomology.WasTested;
    }
    if (value === 'NAO') {
      const justificationField =
        phase === 'planning'
          ? 'phases.planning.JustificationPlanned'
          : 'phases.testHomology.JustificationTest';
      this.markFieldAsTouched(justificationField);
    }
    this.updateCurrentStepValidity();
  }

  // ============================================
  // SUBMISSÃO (unificada)
  // ============================================
  onSubmit(): void {
    if (this.isLoading) return;

    this.clearMessages();

    // Marca campos como tocados para validação
    const currentStepBackup = this.currentStep;
    for (let step = 1; step <= 5; step++) {
      this.currentStep = step;
      this.markAllCurrentStepFieldsAsTouched();
    }
    this.currentStep = currentStepBackup;

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

    this.isLoading = true;
    this.cdr.detectChanges();

    if (this.isEditMode) {
      this.submitEdit(token);
    } else {
      this.submitCreate(token);
    }
  }

  // ============================================
  // CRIAÇÃO (POST com FormData)
  // ============================================
  private async submitCreate(token: string): Promise<void> {
    try {
      const formData = new FormData();
      this.appendFormData(formData);
      this.appendAttachments(formData);

      const rdmUrl = buildApiUrl(API_PATHS.RDM_BASE);
      await this.sendWithFetch(rdmUrl, token, formData);
    } catch (error: any) {
      this.handleRequestError(error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  private async sendWithFetch(url: string, token: string, formData: FormData): Promise<void> {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText || `Erro HTTP ${response.status}` };
        }
        throw errorData;
      }

      const responseData = await response.json();
      this.handleSuccessResponse(responseData);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return;
      }
      throw error;
    } finally {
      this.abortController = null;
    }
  }

  private appendFormData(formData: FormData): void {
    // === IDENTIFICATION ===
    formData.append('identification.Type', this.formData.identification.Type || '');
    formData.append('identification.Title', this.formData.identification.Title || '');

    // === SOLUTION ===
    formData.append(
      'solution.ObjectiveOrSolution',
      this.formData.solution.ObjectiveOrSolution || '',
    );

    // === CATEGORIZATION ===
    formData.append(
      'categorization.SystemOrService',
      this.formData.impactCategory.ChangeSystem || '',
    );
    formData.append(
      'categorization.EnvironmentService',
      this.formData.impactCategory.Environment || '',
    );
    const activityValue = this.mapActivityToBackend(this.formData.impactCategory.Activity);
    formData.append('categorization.ObjectiveOfTheChange', activityValue);
    formData.append(
      'categorization.ExecutingArea',
      this.formData.planningExecutation.TechnologyArea || '',
    );
    formData.append('categorization.AffectedItems', this.formData.impactCategory.ICsImpacted || '');
    // === URL DO SISTEMA E REPOSITÓRIO GIT ===
    formData.append('Planning.SystemUrl', this.formData.impactCategory.SystemUrl || '');
    formData.append('Planning.GitUrl', this.formData.impactCategory.GitRepository || '');

    // === IMPACT PRIORITY ===
    formData.append(
      'impactPriority.AffectedFunctionalities',
      this.formData.impactCategory.ImpactedServices || '',
    );
    formData.append(
      'impactPriority.ServiceCondition',
      this.formData.impactPriority.ServiceCondition || '',
    );
    formData.append('impactPriority.Impact', this.formData.impactPriority.Impact || '');
    formData.append('impactPriority.Urgency', this.formData.impactPriority.Urgency || '');

    // === PLAN COMMUNICATION ===
    const emails = this.formData.planComunication.EmailsCc || [];
    if (emails.length > 0) {
      emails.forEach((email) => {
        if (email && email.trim() !== '') {
          formData.append('planComunication.EmailsCc', email.trim());
        }
      });
    } else {
      formData.append('planComunication.EmailsCc', '');
    }

    // Phases
    formData.append('phases.planning.WasPlanned', this.formData.phases.planning.WasPlanned || '');
    if (this.formData.phases.planning.JustificationPlanned) {
      formData.append(
        'phases.planning.Justification',
        this.formData.phases.planning.JustificationPlanned,
      );
    }
    formData.append(
      'phases.testHomology.WasTested',
      this.formData.phases.testHomology.WasTested || '',
    );
    if (this.formData.phases.testHomology.JustificationTest) {
      formData.append(
        'phases.testHomology.Justification',
        this.formData.phases.testHomology.JustificationTest,
      );
    }
    formData.append(
      'phases.executionWindow.stage',
      this.formData.phases.executionWindow.stage || 'Durante',
    );
    if (this.formData.phases.executionWindow.startDate) {
      formData.append(
        'phases.executionWindow.startDate',
        this.formatDateToISO(this.formData.phases.executionWindow.startDate),
      );
    }
    if (this.formData.phases.executionWindow.endDate) {
      formData.append(
        'phases.executionWindow.endDate',
        this.formatDateToISO(this.formData.phases.executionWindow.endDate),
      );
    }
    formData.append('phases.validation.stage', this.formData.phases.validation.stage || 'Depois');
    if (this.formData.phases.validation.startDate) {
      formData.append(
        'phases.validation.startDate',
        this.formatDateToISO(this.formData.phases.validation.startDate),
      );
    }
    if (this.formData.phases.validation.endDate) {
      formData.append(
        'phases.validation.endDate',
        this.formatDateToISO(this.formData.phases.validation.endDate),
      );
    }

    // === PLANNING ===
    formData.append('Planning.ExecutionPlanning', this.formData.planningExecutation.Ativity || '');
    formData.append(
      'Planning.ProbabilityOfSuccessExecution',
      this.mapProbabilityToBackend(this.formData.planningExecutation.ProbabilityOfSuccess),
    );
    formData.append(
      'Planning.ExecutingArea',
      this.formData.planningExecutation.TechnologyArea || '',
    );

    // WasRemediationPlanned deve ser enviado sempre
    const wasPlanned = this.mapRemediationToBackend(
      this.formData.PlanningRemediation.WasRemediationPlanned,
    );
    // 🔧 ADICIONE ESTA LINHA (é a principal correção)
    formData.append('Planning.WasRemediationPlanned', wasPlanned);

    // 🔧 CORRIJA AS CONDIÇÕES ABAIXO: troque 'SIM' por 'Sim' e 'NAO' por 'Não'
    if (wasPlanned === 'Sim') {
      formData.append(
        'Planning.RemediationPlanning',
        this.formData.PlanningRemediation.Ativity || '',
      );
      formData.append(
        'Planning.ProbabilityOfSuccessRemediation',
        this.mapProbabilityToBackend(this.formData.PlanningRemediation.ProbabilityOfSuccess),
      );
    } else if (wasPlanned === 'Não') {
      formData.append(
        'Planning.UnplannedRemediationJustification',
        this.formData.PlanningRemediation.JustificationRemediation || '',
      );
    }
  }

  private mapActivityToBackend(activity: string): string {
    const activityMap: Record<string, string> = {
      Atualização: 'Atualização',
      Correção: 'Atualização',
      Melhoria: 'Atualização',
      Desativação: 'Desativação',
      Substituição: 'Substituição',
      Implantação: 'Implantação',
      'Alteração de configuração': 'Alteração de configuração',
    };
    return activityMap[activity] || 'Atualização';
  }

  private mapProbabilityToBackend(probability: string): string {
    const probMap: Record<string, string> = {
      Baixo: 'Baixo',
      Medio: 'Medio',
      Médio: 'Medio',
      Alto: 'Alto',
    };
    return probMap[probability] || 'Baixo';
  }

  private formatDateToISO(dateValue: any): string {
    if (!dateValue) return '';
    try {
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

  private generateTicket(response: any): string {
    // 1. Tenta campos mais comuns
    if (response?.ticket) return response.ticket;
    if (response?.id) return `RDM-${response.id}`;
    if (response?.rdmId) return response.rdmId;
    if (response?.codigo) return response.codigo;

    // 2. Se a resposta tiver uma estrutura aninhada (ex.: { data: { ticket: ... } })
    if (response?.data) {
      const fromData = this.generateTicket(response.data);
      if (fromData !== 'Ticket não disponível') return fromData;
    }

    // 3. Se não encontrou, loga e retorna um valor que será tratado no template
    console.error('Não foi possível extrair o ticket da resposta:', response);
    return ''; // ou 'Ticket não disponível'
  }

  // ============================================
  // EDIÇÃO (PUT com JSON)
  // ============================================
  private submitEdit(token: string): void {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });

    const url = buildApiUrl(API_PATHS.RDM_BY_ID(this.ticket));
    const requestData = this.preparePutData();

    this.http
      .put(url, requestData, { headers })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.showSuccessModal = true;
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.isLoading = false;
          this.handleEditError(error);
          this.cdr.detectChanges();
        },
      });
  }

  private preparePutData(): any {
    return {
      identification: {
        type: this.formData.identification.Type,
        title: this.formData.identification.Title,
      },
      solution: {
        objectiveOrSolution: this.formData.solution.ObjectiveOrSolution,
      },
      categorization: {
        systemOrService: this.formData.impactCategory.ChangeSystem,
        environmentService: this.formData.impactCategory.Environment,
        objectiveOfTheChange: this.mapActivityToBackend(this.formData.impactCategory.Activity),
        affectedItems: this.formData.impactCategory.ICsImpacted,
        systemUrl: this.formData.impactCategory.SystemUrl,
        gitRepository: this.formData.impactCategory.GitRepository,
      },
      impactPriority: {
        affectedFunctionalities: this.formData.impactCategory.ImpactedServices,
        serviceCondition: this.formData.impactPriority.ServiceCondition,
        impact: this.formData.impactPriority.Impact,
        urgency: this.formData.impactPriority.Urgency,
      },
      planComunication: {
        emailsCc: this.formData.planComunication.EmailsCc || [],
      },
      phases: {
        planning: {
          wasPlanned: this.formData.phases.planning.WasPlanned || 'NAO',
          justification: this.formData.phases.planning.JustificationPlanned || '',
        },
        testHomology: {
          wasTested: this.formData.phases.testHomology.WasTested || 'NAO',
          justification: this.formData.phases.testHomology.JustificationTest || '',
        },
        executionWindow: {
          startDate: this.formatDateToISO(this.formData.phases.executionWindow.startDate),
          endDate: this.formatDateToISO(this.formData.phases.executionWindow.endDate),
        },
        validation: {
          startDate: this.formatDateToISO(this.formData.phases.validation.startDate),
          endDate: this.formatDateToISO(this.formData.phases.validation.endDate),
        },
      },
      planning: {
        executionPlanning: this.formData.planningExecutation.Ativity,
        probabilityOfSuccessExecution: this.formData.planningExecutation.ProbabilityOfSuccess,
        probabilityOfSuccessRemediation: this.formData.PlanningRemediation.ProbabilityOfSuccess,
        executingArea: this.formData.planningExecutation.TechnologyArea,
        wasRemediationPlanned: this.mapRemediationToBackend(
          this.formData.PlanningRemediation.WasRemediationPlanned,
        ),
        remediationPlanning: this.formData.PlanningRemediation.Ativity || '',
        unplannedRemediationJustification:
          this.formData.PlanningRemediation.JustificationRemediation || '',
      },
    };
  }

  private mapRemediationToBackend(value: string | undefined): string {
    if (value === 'SIM') return 'Sim';
    if (value === 'NAO') return 'Não';
    return 'Não'; // valor padrão
  }

  private handleEditError(error: any): void {
    if (error.status === 400 && error.error) {
      if (error.error.errors) {
        this.errorMessages = Object.entries(error.error.errors).map(
          ([field, messages]) => `${field}: ${(messages as string[]).join(', ')}`,
        );
      } else if (error.error.message) {
        this.errorMessage = error.error.message;
      } else {
        this.errorMessage = 'Erro de validação. Verifique os dados informados.';
      }
    } else if (error.status === 401) {
      this.errorMessage = 'Sessão expirada. Por favor, faça login novamente.';
    } else if (error.status === 403) {
      this.errorMessage = 'Você não tem permissão para editar esta solicitação.';
    } else if (error.status === 404) {
      this.errorMessage = `Solicitação "${this.ticket}" não encontrada.`;
    } else {
      this.errorMessage = `Erro ao atualizar solicitação: ${error.message || 'Erro desconhecido'}`;
    }
  }

  // ============================================
  // MANIPULAÇÃO DE EMAILS
  // ============================================
  isValidCurrentEmail(): boolean {
    if (!this.currentEmailInput || this.currentEmailInput.trim() === '') return false;
    return this.isValidEmail(this.currentEmailInput.trim());
  }

  addCurrentEmail(): void {
    if (!this.isValidCurrentEmail()) {
      this.emailError = 'Digite um e-mail válido.';
      return;
    }
    const email = this.currentEmailInput.trim().toLowerCase();
    if (!this.formData.planComunication.EmailsCc) {
      this.formData.planComunication.EmailsCc = [];
    }
    if (this.formData.planComunication.EmailsCc.includes(email)) {
      this.emailError = 'Este e-mail já foi adicionado.';
      return;
    }
    this.formData.planComunication.EmailsCc.push(email);
    this.currentEmailInput = '';
    this.emailError = '';
    this.markFieldAsTouched('planComunication.EmailsCc');
    this.cdr.detectChanges();
  }

  removeEmail(index: number): void {
    if (this.formData.planComunication.EmailsCc) {
      this.formData.planComunication.EmailsCc.splice(index, 1);
      this.markFieldAsTouched('planComunication.EmailsCc');
      this.cdr.detectChanges();
    }
  }

  onEmailKeyup(event: KeyboardEvent): void {
    const input = event.target as HTMLInputElement;
    this.currentEmailInput = input.value;
    if (this.emailError) this.emailError = '';
  }

  onEmailKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      if (event.key === ',') {
        const input = event.target as HTMLInputElement;
        this.currentEmailInput = input.value.replace(',', '').trim();
      }
      this.addCurrentEmail();
    }
    if (event.key === 'Backspace' && this.currentEmailInput === '') {
      const emails = this.formData.planComunication.EmailsCc;
      if (emails && emails.length > 0) {
        this.removeEmail(emails.length - 1);
      }
    }
  }

  onEmailPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pastedText = event.clipboardData?.getData('text') || '';
    const emails = pastedText
      .split(/[,;\s\n]+/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0 && this.isValidEmail(e));
    if (!this.formData.planComunication.EmailsCc) {
      this.formData.planComunication.EmailsCc = [];
    }
    emails.forEach((email) => {
      if (!this.formData.planComunication.EmailsCc!.includes(email)) {
        this.formData.planComunication.EmailsCc!.push(email);
      }
    });
    this.currentEmailInput = '';
    this.markFieldAsTouched('planComunication.EmailsCc');
    this.cdr.detectChanges();
  }

  onEmailBlur(): void {
    if (this.isValidCurrentEmail()) {
      this.addCurrentEmail();
    }
  }

  getInvalidEmails(): string[] {
    if (!this.formData?.planComunication?.EmailsCc) return [];
    return this.formData.planComunication.EmailsCc.filter((e) => !this.isValidEmail(e));
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // ============================================
  // CHECKBOXE NÃO APLICÁVEIS
  // ============================================
  onEmailsNotApplicableChange(checked: boolean): void {
    this.emailsNotApplicable = checked;
    if (checked) {
      this.formData.planComunication.EmailsCc = [];
      this.currentEmailInput = '';
      this.emailError = '';
    }
    this.markFieldAsTouched('planComunication.EmailsCc');
    this.updateCurrentStepValidity();
  }

  // ============================================
  // EXIBIÇÃO CONDICIONAL DE CAMPOS
  // ============================================
  shouldShowUrlAndGitFields(): boolean {
    const activity = this.formData?.impactCategory?.Activity;
    const area = this.formData?.planningExecutation?.TechnologyArea;
    const visible = area !== 'BancoDeDados' && area !== 'Seguranca' && activity !== 'Redes';

    if (!visible) {
      // Quando não visível, define como "Não Aplicável" para envio
      if (this.formData) {
        this.formData.impactCategory.SystemUrl = 'Não Aplicável';
        this.formData.impactCategory.GitRepository = 'Não Aplicável';
      }
    } else {
      // Se estava "Não Aplicável" e agora está visível, limpa para o usuário preencher
      if (this.formData?.impactCategory?.SystemUrl === 'Não Aplicável') {
        this.formData.impactCategory.SystemUrl = '';
      }
      if (this.formData?.impactCategory?.GitRepository === 'Não Aplicável') {
        this.formData.impactCategory.GitRepository = '';
      }
    }
    return visible;
  }

  // ============================================
  // MODAIS
  // ============================================
  openHelpModal(): void {
    this.showHelpModal = true;
  }

  closeHelpModal(): void {
    this.showHelpModal = false;
  }

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
      this.syncSystemSelection();
      this.emailsNotApplicable = this.formData.planComunication.EmailsCc.length === 0;

      this.touchedFields.add('planComunication.EmailsCc');
      this.updateCurrentStepValidity();

      // Atualiza validação e detecção de mudanças
      this.updateCurrentStepValidity();
      this.cdr.detectChanges();

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

    // Categorization -> impactCategory
    if (foundRDM.categorization) {
      formData.impactCategory.ChangeSystem = foundRDM.categorization.systemOrService || '';
      formData.impactCategory.Environment = foundRDM.categorization.environmentService || '';
      const activity = foundRDM.categorization.objectiveOfTheChange || '';
      formData.impactCategory.Activity = this.mapBackendToActivity(activity);
      formData.impactCategory.ICsImpacted = foundRDM.categorization.affectedItems || '';
    }

    // ImpactPriority -> impactPriority (correção: usar nomes minúsculos)
    if (foundRDM.impactPriority) {
      formData.impactCategory.ImpactedServices =
        foundRDM.impactPriority.affectedFunctionalities || '';

      if (foundRDM.impactPriority.serviceCondition) {
        formData.impactPriority.ServiceCondition = this.normalizeImpactValue(
          foundRDM.impactPriority.serviceCondition,
        );
      } else if (foundRDM.impactPriority.impacatOfLevel) {
        formData.impactPriority.ServiceCondition = this.normalizeImpactValue(
          foundRDM.impactPriority.impacatOfLevel,
        );
      }

      if (foundRDM.impactPriority.impact) {
        formData.impactPriority.Impact = foundRDM.impactPriority.impact;
      }

      if (foundRDM.impactPriority.urgency) {
        formData.impactPriority.Urgency = foundRDM.impactPriority.urgency;
      }
    }

    // Plan Communication
    if (foundRDM.planComunication) {
      if (foundRDM.planComunication.emailsCc) {
        if (Array.isArray(foundRDM.planComunication.emailsCc)) {
          formData.planComunication.EmailsCc = foundRDM.planComunication.emailsCc.filter(
            (email) => email && email.trim() !== '',
          );
        } else if (typeof foundRDM.planComunication.emailsCc === 'string') {
          formData.planComunication.EmailsCc = (foundRDM.planComunication.emailsCc as string)
            .split(',')
            .map((email) => email.trim())
            .filter((email) => email.length > 0);
        }
      }
    }

    // Phases
    if (foundRDM.phases) {
      this.mapPhaseData(formData, foundRDM.phases);
    }

    // Planning
    if (foundRDM.planning) {
      formData.planningExecutation.Ativity = foundRDM.planning.executionPlanning || '';
      formData.planningExecutation.ProbabilityOfSuccess = this.mapBackendProbability(
        foundRDM.planning.probabilityOfSuccessExecution || '',
      );

      // Remediação
      formData.PlanningRemediation.Ativity = foundRDM.planning.remediationPlanning || '';
      formData.PlanningRemediation.ProbabilityOfSuccess = this.mapBackendProbability(
        foundRDM.planning.probabilityOfSuccessRemediation || '',
      );
      formData.PlanningRemediation.WasRemediationPlanned = this.mapRemediationFromBackend(
        foundRDM.planning?.wasRemediationPlanned,
      );
      formData.PlanningRemediation.JustificationRemediation =
        foundRDM.planning.unplannedRemediationJustification ||
        foundRDM.planning.justificationRemediation ||
        '';

      formData.planningExecutation.TechnologyArea = this.normalizeTechnologyArea(
        foundRDM.planning.executingArea || '',
      );
      formData.PlanningRemediation.TechnologyArea = formData.planningExecutation.TechnologyArea;
      formData.impactCategory.SystemUrl = foundRDM.planning.systemUrl || '';
      formData.impactCategory.GitRepository = foundRDM.planning.gitUrl || '';
    }
  }

  /**
   * Mapeia os dados das fases (phases) da RDM encontrada para o formulário.
   */
  private mapPhaseData(formData: ApiFormData, phases: any): void {
    // Planning phase
    if (phases.planning) {
      formData.phases.planning.WasPlanned = phases.planning.wasPlanned === 'SIM' ? 'SIM' : 'NAO';
      formData.phases.planning.JustificationPlanned = phases.planning.justification || '';
    }

    // Test/Homology phase
    if (phases.testHomology) {
      formData.phases.testHomology.WasTested =
        phases.testHomology.wasTested === 'SIM' ? 'SIM' : 'NAO';
      formData.phases.testHomology.JustificationTest = phases.testHomology.justification || '';
    }

    // Execution Window
    if (phases.executionWindow) {
      formData.phases.executionWindow.startDate = this.convertISOToDatetimeLocal(
        phases.executionWindow.startDate,
      );
      formData.phases.executionWindow.endDate = this.convertISOToDatetimeLocal(
        phases.executionWindow.endDate,
      );
      formData.phases.executionWindow.stage = 'Durante';
    }

    // Validation
    if (phases.validation) {
      formData.phases.validation.startDate = this.convertISOToDatetimeLocal(
        phases.validation.startDate,
      );
      formData.phases.validation.endDate = this.convertISOToDatetimeLocal(
        phases.validation.endDate,
      );
      formData.phases.validation.stage = 'Depois';
    }
  }

  private normalizeTicket(ticket: string): string {
    const trimmed = ticket.trim();
    if (!trimmed.toLowerCase().startsWith('rdm-')) return trimmed;
    const [, date, ...rest] = trimmed.split('-');
    const suffix = rest.join('-').toLowerCase();
    return `RDM-${date}-${suffix}`;
  }

  onTicketInput(): void {
    if (!this.searchTicket) return;
    const value = this.searchTicket.trim();
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

  private showCopySuccessMessage(): void {
    this.successMessage = `Dados da RDM ${this.foundRDM?.ticket} copiados com sucesso!`;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.successMessage = '';
      this.cdr.detectChanges();
    }, 5000);
  }

  private handleCopyError(_: unknown): void {
    this.isCopying = false;
    this.searchError = 'Erro ao copiar os dados. Por favor, tente novamente.';
    this.cdr.detectChanges();
  }

  private resetToFirstStep(): void {
    this.currentStep = 1;
    this.scrollToTop();
  }

  // ============================================
  // MODAL DE CANCELAMENTO (EDIÇÃO)
  // ============================================
  showCancelModal(): void {
    if (this.hasUnsavedChanges()) {
      this.showCancelModalVisible = true;
    } else {
      this.confirmCancelEdit();
    }
    this.cdr.detectChanges();
  }

  onCancelModalClosed(): void {
    this.showCancelModalVisible = false;
    this.cdr.detectChanges();
  }

  confirmCancelEdit(): void {
    this.showCancelModalVisible = false;
    if (this.originalFormData && this.hasUnsavedChanges()) {
      this.resetFormToOriginal();
    }
    this.router.navigate(['/user']);
    this.cdr.detectChanges();
  }

  hasUnsavedChanges(): boolean {
    if (this.requestForm?.dirty) return true;
    if (!this.originalFormData) return false;
    return JSON.stringify(this.formData) !== JSON.stringify(this.originalFormData);
  }

  private resetFormToOriginal(): void {
    if (this.originalFormData) {
      this.formData = JSON.parse(JSON.stringify(this.originalFormData));
      if (this.requestForm) this.requestForm.reset(this.formData);
    }
  }

  // DEV JULIA BENEDICTO DA CRUZ

  // ============================================
  // MANIPULAÇÃO DE ARQUIVOS (CRIAÇÃO)
  // ============================================
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;

    this.selectedFiles = [];
    this.clearMessages();

    const file = files[0];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!this.ALLOWED_FILE_TYPES.includes(fileExtension)) {
      this.errorMessage = `Tipo de arquivo não permitido. Apenas arquivos ZIP (.zip) são permitidos.`;
      input.value = '';
      this.cdr.detectChanges();
      return;
    }

    if (file.size > this.MAX_FILE_SIZE) {
      this.errorMessage = `Arquivo muito grande. Tamanho máximo: 5MB`;
      input.value = '';
      this.cdr.detectChanges();
      return;
    }

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
  // UTILITÁRIOS
  // ============================================
  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.showBackToTop = window.scrollY > this.SCROLL_THRESHOLD;
    this.cdr.detectChanges();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.isEditMode && this.hasUnsavedChanges()) {
      event.preventDefault();
      event.returnValue = 'Você tem alterações não salvas. Tem certeza que deseja sair?';
    }
  }

  @HostListener('document:input', ['$event'])
  onDocumentInput(event: Event): void {
    const target = event.target as HTMLElement;
    if (target.closest('.rdm-form')) {
      setTimeout(() => {
        this.cdr.detectChanges();
        this.updateCurrentStepValidity();
      }, 50);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.showSearchModal) {
      this.closeSearchModal();
    }
  }

  private checkWindowScroll(): void {
    this.showBackToTop = window.scrollY > this.SCROLL_THRESHOLD;
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  resetForm(): void {
    if (this.isEditMode) return; // não deve resetar em edição
    this.formData = this.createEmptyFormData();
    this.selectedFiles = [];
    this.currentStep = 1;
    this.clearMessages();
    this.currentEmailInput = '';
    this.emailError = '';
    this.fieldErrors = {};
    this.touchedFields.clear();
    this.stepValidity = {
      1: false,
      2: false,
      3: false,
      4: false,
      5: false,
      6: true,
    };
    this.stepValid = false;
    this.emailsNotApplicable = false;
    this.cdr.detectChanges();
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.errorMessages = [];
    this.successMessage = '';
    this.cdr.detectChanges();
  }

  private handleRequestError(error: any): void {
    this.isLoading = false;
    if (error && typeof error === 'object') {
      if (error.errorMessages && Array.isArray(error.errorMessages)) {
        this.errorMessages = error.errorMessages;
        this.cdr.detectChanges();
        return;
      }
      if (error.errors && Array.isArray(error.errors)) {
        this.errorMessages = error.errors;
        this.cdr.detectChanges();
        return;
      }
      if (error.message) {
        this.errorMessage = error.message;
        this.cdr.detectChanges();
        return;
      }
    }
    if (error instanceof Error) {
      this.errorMessage = error.message;
    } else if (typeof error === 'string') {
      this.errorMessage = error;
    } else {
      this.errorMessage = 'Erro desconhecido ao enviar solicitação';
    }
    this.cdr.detectChanges();
  }

  closeSuccessModal(): void {
    this.showSuccessModal = false;
    if (this.isEditMode) {
      this.router.navigate(['/user']);
    } else {
      // criação: limpa o formulário
      this.resetForm();
      this.currentStep = 1;
      this.scrollToTop();
      this.cdr.detectChanges();
    }
  }

  get prioridadeCalculada(): string {
    const impacto = this.formData.impactPriority?.Impact;
    const urgencia = this.formData.impactPriority?.Urgency;
    if (!impacto || !urgencia) return '';
    if (impacto === 'Alto' || urgencia === 'Alto') return 'Alto';
    if (impacto === 'Medio' || urgencia === 'Medio') return 'Médio';
    return 'Baixo';
  }

  get riscoCalculado(): number | null {
    const impacto = this.formData.impactPriority?.Impact;
    const urgencia = this.formData.impactPriority?.Urgency;

    if (!impacto || !urgencia) return null;

    const mapa: Record<string, Record<string, number>> = {
      Baixo: { Baixo: 1, Medio: 2, Alto: 3 },
      Medio: { Baixo: 4, Medio: 5, Alto: 6 },
      Alto: { Baixo: 7, Medio: 8, Alto: 9 },
    };

    // Normaliza os valores (pode vir como 'Medio' ou 'Médio' – vamos tratar)
    const impactoKey = impacto === 'Médio' ? 'Medio' : impacto;
    const urgenciaKey = urgencia === 'Médio' ? 'Medio' : urgencia;

    return mapa[impactoKey]?.[urgenciaKey] || null;
  }

  getRiskLabel(risk: number | null): string {
    if (risk === null) return '';
    if (risk <= 3) return '🟢 Baixo';
    if (risk <= 6) return '🟡 Médio';
    return '🔴 Alto';
  }

  getTooltipForLevel(level: number): string {
    let classificacao = '';
    if (level <= 3) {
      classificacao = '🟢 Baixo';
    } else if (level <= 6) {
      classificacao = '🟡 Médio';
    } else {
      classificacao = '🔴 Alto';
    }
    return `${classificacao}`;
  }
}
