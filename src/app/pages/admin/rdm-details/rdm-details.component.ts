// src/app/pages/admin/rdm-details/rdm-details.component.ts
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule, NavigationEnd } from '@angular/router';
import { Observable, Subject, filter, takeUntil } from 'rxjs';
import { RdmService } from '../../../services/rdm-service';
import { ModalComponent } from '../../../components/modal/modal.component';
import { AuthService } from '../../../services/auth-service';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DateFixerService } from '../../../services/date-fixer.service';
import { MatSnackBar } from '@angular/material/snack-bar';

// Interface para estrutura dos dados do formulário RDM
interface RDMFormData {
  identification: {
    type: string;
    title: string;
    area: string;
  };
  solution: {
    objectiveOrSolution: string;
  };
  category: {
    objective: string;
    action: string;
    impact: string;
    urgency: string;
  };
  impactCategory: {
    changeSystem: string;
    activity: string;
    impactedServices: string;
    environment: string;
    iCsImpacted: string;
  };
  // Impacto e prioridade
  impactPriority?: {
    ServiceCondition: string;
    Impact: string;
    Urgency: string;
  };
  deploymentWindow: {
    impactType: string;
  };
  planComunication: {
    whosNotified: string;
    moment: string;
    comunicationType: string;
    technologyArea: string;
    emailsCc?: string[];
  };
  phases?: any;
  planningExecutation?: any;
  planningRemediation?: any;
}

@Component({
  selector: 'app-rdm-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ModalComponent,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './rdm-details.html',
  styleUrls: ['./rdm-details.css'],
})
export class RDMDetailsComponent implements OnInit, OnDestroy {
  ticketId = '';
  rdmDetails: any = null;
  rdmStatus: string = 'Pendente';
  isLoading = false;
  errorMessage = '';
  downloadingPDF = false;
  downloadingAttachment = false;
  downloadError = '';
  hasAttachment = false;

  // Propriedades para controle de contexto de visualização
  isAdminView = false;
  showAdminActions = false;

  // Controle de edição do campo de observação
  editandoObservacao = false;

  // Propriedades para modo de edição
  isEditMode = false;
  isSaving = false;
  formData: RDMFormData = this.createEmptyFormData();

  // Subject para gerenciar subscriptions e evitar memory leaks
  private destroy$ = new Subject<void>();

  // Propriedades para controle do modal
  showModal = false;
  modalType: 'approve' | 'edit' | 'reject' | 'cancel' = 'approve';
  modalTitle = '';
  modalButtonText = 'Fechar';
  rejectionReason = '';
  correctionReason = '';
  isProcessing = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private rdmService: RdmService,
    private authService: AuthService,
    private http: HttpClient,
    private dateFormatter: DateFixerService,
    private snackBar: MatSnackBar,
    private location: Location,
  ) {}

  ngOnInit(): void {
    // 1. Detecta mudanças na rota para atualizar contexto
    this.router.events
      .pipe(
        takeUntil(this.destroy$),
        filter((event) => event instanceof NavigationEnd),
      )
      .subscribe(() => {
        this.detectViewContext();
      });

    // 2. Inicializa o contexto de visualização
    this.detectViewContext();

    // 3. Obtém o ticket ID da rota e carrega os detalhes
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const ticketId = params.get('id');
      if (ticketId) {
        this.ticketId = ticketId;
        this.loadRDMDetails();
        // Verifica se existe anexo
        this.checkAttachment();
      } else {
        this.errorMessage = 'ID do RDM não encontrado na URL';
      }
    });
  }

  ngOnDestroy(): void {
    // Limpa todas as subscriptions ao destruir o componente
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Formata data com hora (usado em outros componentes)
   * @param dateString Data a ser formatada
   * @returns String formatada com data e hora
   */
  formatDateWithTime(dateString?: string): string {
    return this.dateFormatter.formatWithTime(dateString);
  }

  /**
   * Cria estrutura vazia para o formulário de edição
   * @returns Objeto RDMFormData vazio
   */
  private createEmptyFormData(): RDMFormData {
    return {
      identification: { type: '', title: '', area: '' },
      solution: { objectiveOrSolution: '' },
      category: { objective: '', action: '', impact: '', urgency: '' },
      impactCategory: {
        changeSystem: '',
        activity: '',
        impactedServices: '',
        environment: '',
        iCsImpacted: '',
      },
      impactPriority: {
        ServiceCondition: '',
        Impact: '',
        Urgency: '',
      },
      deploymentWindow: { impactType: '' },
      planComunication: {
        whosNotified: '',
        moment: '',
        comunicationType: '',
        technologyArea: '',
        emailsCc: [], // opcional
      },
      phases: {},
      planningExecutation: {},
      planningRemediation: {
        Ativity: '',
        ProbabilityOfSuccess: '',
        TechnologyArea: '',
        WasRemediationPlanned: '',
        JustificationRemediation: '',
      },
    };
  }

  /**
   * Detecta o contexto de visualização baseado na URL e permissões
   * Define se é visualização admin e se deve mostrar ações administrativas
   */
  private detectViewContext(): void {
    const url = this.router.url;
    const navigation = this.router.getCurrentNavigation();

    // Verifica se está em rota de admin
    this.isAdminView =
      url.includes('/admin/') ||
      url.includes('/admin/rdm/') ||
      (navigation?.extras?.state as any)?.forceAdminView === true;

    // Força visualização admin se veio da lista de admin
    if ((navigation?.extras?.state as any)?.fromAdminList) {
      this.isAdminView = true;
    }

    // IMPORTANTE: Mostra ações administrativas apenas para usuários ADMIN
    // independentemente da URL, verifica a role do usuário
    this.showAdminActions = this.authService.isAdmin();
  }

  toggleEditarObservacao(): void {
    this.editandoObservacao = !this.editandoObservacao;
  }

  /**
   * Popula o formulário de edição com dados da API
   * @param apiData Dados recebidos da API
   */
  private populateFormData(apiData: any): void {
    // Identificação
    this.formData.identification = {
      type: apiData.identification?.type || '',
      title: apiData.identification?.title || '',
      area: apiData.identification?.area || '',
    };

    // Solução
    this.formData.solution = {
      objectiveOrSolution: apiData.solution?.objectiveOrSolution || '',
    };

    // ImpactCategory (categorização)
    this.formData.impactCategory = {
      changeSystem: apiData.categorization?.systemOrService || '',
      environment: apiData.categorization?.environmentService || '',
      activity: apiData.categorization?.objectiveOfTheChange || '',
      iCsImpacted: apiData.categorization?.affectedItems || '',
      impactedServices: apiData.impactPriority?.affectedFunctionalities || '',
    };

    //ImpactPriority
    this.formData.impactPriority = {
      ServiceCondition: apiData.impactPriority?.serviceCondition || '',
      Impact: apiData.impactPriority?.impact || '',
      Urgency: apiData.impactPriority?.urgency || '',
    };

    // PlanComunication
    this.formData.planComunication = {
      whosNotified: apiData.planComunication?.whosNotified || '',
      moment: '',
      comunicationType: apiData.planComunication?.comunicationType || '',
      technologyArea: apiData.planComunication?.technologyArea || '',
      emailsCc: apiData.planComunication?.emailsCc || [],
    };

    // Phases (cronograma)
    if (apiData.phases) {
      this.formData.phases = {
        planning: {
          WasPlanned: apiData.phases.planning?.wasPlanned || '',
          JustificationPlanned: apiData.phases.planning?.justification || '',
        },
        testHomology: {
          WasTested: apiData.phases.testHomology?.wasTested || '',
          JustificationTest: apiData.phases.testHomology?.justification || '',
        },
        executionWindow: {
          startDate: this.formatDateForInput(apiData.phases.executionWindow?.startDate),
          endDate: this.formatDateForInput(apiData.phases.executionWindow?.endDate),
        },
        validation: {
          startDate: this.formatDateForInput(apiData.phases.validation?.startDate),
          endDate: this.formatDateForInput(apiData.phases.validation?.endDate),
        },
      };
    }

    // Planning (execução e remediação)
    if (apiData.planning) {
      this.formData.planningExecutation = {
        Ativity: apiData.planning.executionPlanning || '',
        TechnologyArea: apiData.planning.executingArea || '',
        ProbabilityOfSuccess: apiData.planning.probabilityOfSuccessExecution || '',
      };

      this.formData.planningRemediation = {
        Ativity: apiData.planning.remediationPlanning || '',
        ProbabilityOfSuccess: apiData.planning.probabilityOfSuccessRemediation || '',
      };
    }
  }

  private formatDateForInput(dateString?: string): string {
    if (!dateString) return '';
    // Se a data vier no formato ISO, pode ser convertida para o formato aceito pelo input
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  /**
   * Alterna entre modo de visualização e modo de edição
   * Ao sair do modo de edição, restaura os dados originais
   */
  toggleEditMode(): void {
    if (this.isEditMode) {
      this.populateFormData(this.rdmDetails);
    }
    this.isEditMode = !this.isEditMode;
  }

  /**
   * Submete as alterações feitas no formulário
   * Em produção, deve enviar para a API
   */
  onSubmit(): void {
    if (!this.isEditMode || !this.ticketId) return;

    this.isSaving = true;
    this.errorMessage = '';

    // Simulação de salvamento
    setTimeout(() => {
      this.isSaving = false;
      this.isEditMode = false;

      // Atualiza os dados locais com as alterações
      this.rdmDetails = {
        ...this.rdmDetails,
        identification: { ...this.formData.identification },
        solution: { ...this.formData.solution },
        category: { ...this.formData.category },
        impactCategory: { ...this.formData.impactCategory },
        impactPriority: { ...this.formData.impactPriority },
        deploymentWindow: { ...this.formData.deploymentWindow },
        planComunication: { ...this.formData.planComunication },
      };

      this.showSuccessNotification('Alterações salvas com sucesso!');
    }, 1500);
  }

  get emailsParaNotificacao(): string[] {
    if (!this.rdmDetails?.planComunication?.emailsCc) return [];
    return this.rdmDetails.planComunication.emailsCc.filter(
      (email: any) => email && typeof email === 'string' && email.trim() !== '',
    );
  }

  /**
   * Obtém a data do RDM para exibição no cabeçalho (sem hora)
   * @returns Data formatada ou 'Não informado'
   */
  getHeaderDate(): string {
    if (!this.rdmDetails) return 'Não informado';

    if (this.rdmDetails.date) {
      return this.formatDateOnly(this.rdmDetails.date);
    }

    if (this.rdmDetails.createdAt) {
      return this.formatDateOnly(this.rdmDetails.createdAt);
    }

    if (this.rdmDetails.phases?.execute?.startDate) {
      return this.formatDateOnly(this.rdmDetails.phases.execute.startDate);
    }

    return 'Não informado';
  }

  /**
   * Formata data SEM hora (para exibição em rdm-details)
   * @param dateString Data a ser formatada
   * @returns String formatada sem hora
   */
  formatDateOnly(dateString?: string): string {
    return this.dateFormatter.formatDateOnly(dateString);
  }

  /**
   * Método de compatibilidade - alias para formatDateOnly
   * @param dateString Data a ser formatada
   * @returns String formatada sem hora
   */
  formatDate(dateString?: string): string {
    return this.formatDateOnly(dateString);
  }

  /**
   * Carrega os detalhes do RDM da API
   * Usa endpoint diferente para admin e usuário normal
   */
  loadRDMDetails(): void {
    this.isLoading = true;
    this.errorMessage = '';

    let rdmObservable: Observable<any>;

    if (this.authService.isAdmin()) {
      rdmObservable = this.rdmService.getRDMForAdmin(this.ticketId);
    } else {
      rdmObservable = this.rdmService.getRDMWithDate(this.ticketId);
    }

    rdmObservable.subscribe({
      next: (apiData: any) => {
        // Extrai o status de onde ele realmente vem (identification.status)
        const status = apiData.identification?.status || apiData.status || 'Pendente';

        this.rdmDetails = {
          ...apiData,
          status: status, // Garante que status está no nível raiz
          date: apiData.date || apiData.identification?.dateCreated,
          createdAt: apiData.date || apiData.identification?.dateCreated,
          dateRequest: apiData.date || apiData.identification?.dateCreated,
        };

        this.isLoading = false;
        this.populateFormData(this.rdmDetails);
        this.rdmStatus = status; // Atualiza também a propriedade auxiliar

        // Verifica anexo após carregar os detalhes
        this.checkAttachment();
      },
      error: (error: any) => {
        this.errorMessage = `Erro ao carregar RDM: ${error.message}`;
        this.isLoading = false;
      },
    });
  }

  /**
   * Formata a data para exibição no template (igual ao usado nas listas)
   * Converte formato "DD-MM-YYYY HH:mm" (UTC) para "DD/MM/YYYY HH:mm" (UTC-3)
   * @param dateString Data no formato "DD-MM-YYYY HH:mm" (UTC)
   * @returns Data formatada com ajuste de fuso horário ou 'Não informado'
   */
  formatDateLikeList(dateString?: string): string {
    if (!dateString) return 'Não informado';

    // Formato do endpoint admin: "DD-MM-YYYY HH:mm" (UTC)
    if (/^\d{2}-\d{2}-\d{4} \d{2}:\d{2}$/.test(dateString)) {
      const [datePart, timePart] = dateString.split(' ');
      const [dayStr, monthStr, yearStr] = datePart.split('-');
      const [hourStr, minuteStr] = timePart.split(':');

      const day = parseInt(dayStr, 10);
      const month = parseInt(monthStr, 10) - 1;
      const year = parseInt(yearStr, 10);
      let hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);

      // Ajuste de fuso: UTC → Brasil (UTC-3)
      hour = hour - 3;

      // Cria a data ajustada
      const adjustedDate = new Date(year, month, day, hour, minute);

      const formattedDay = adjustedDate.getDate().toString().padStart(2, '0');
      const formattedMonth = (adjustedDate.getMonth() + 1).toString().padStart(2, '0');
      const formattedYear = adjustedDate.getFullYear();
      const formattedHour = adjustedDate.getHours().toString().padStart(2, '0');
      const formattedMinute = adjustedDate.getMinutes().toString().padStart(2, '0');

      return `${formattedDay}/${formattedMonth}/${formattedYear} ${formattedHour}:${formattedMinute}`;
    }

    // Se não for o formato esperado, tenta formatar com o DateFixer
    return this.formatDateWithTime(dateString);
  }

  /**
   * Baixa o relatório PDF do RDM
   */
  downloadPDF(): void {
    this.downloadingPDF = true;
    this.downloadError = '';

    const title = this.rdmDetails?.title || 'sem-titulo';
    const sanitizedTitle = title.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');

    this.rdmService.downloadRDMReport(this.ticketId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SES_CIC_FORM-${this.ticketId}-${sanitizedTitle}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        this.downloadingPDF = false;
      },
      error: (error) => {
        this.downloadError = 'Erro ao gerar o PDF. Tente novamente.';
        this.downloadingPDF = false;
      },
    });
  }

  /**
   * Verifica se existe anexo para este RDM
   */
  private checkAttachment(): void {
    if (!this.ticketId) return;
    this.rdmService.checkAttachmentExists(this.ticketId).subscribe({
      next: (hasAttachment) => {
        this.hasAttachment = hasAttachment;
      },
      error: (err) => {
        console.error('Error in checkAttachment subscription:', err);
        this.hasAttachment = false;
      },
    });
  }

  /**
   * Baixa o anexo do RDM
   */
  downloadAttachment(): void {
    if (!this.ticketId || !this.hasAttachment) return;

    this.downloadingAttachment = true;
    this.downloadError = '';

    this.rdmService.downloadAttachment(this.ticketId).subscribe({
      next: (blob) => {
        // Cria um link temporário para download
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `anexo-${this.ticketId}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);

        this.downloadingAttachment = false;
      },
      error: (error) => {
        this.downloadingAttachment = false;
        this.hasAttachment = false; // Atualiza o estado pois o anexo pode ter sido removido
      },
    });
  }

  // Retorna label amigável para condição do serviço
  getServiceConditionLabel(value?: string): string {
    if (!value) return 'Não informado';
    const map: Record<string, string> = {
      SemIndisponibilidade: 'Sem Indisponibilidade',
      Intermitência: 'Intermitência',
      IndisponibilidadeParcial: 'Indisponibilidade Parcial',
      IndisponibilidadeTotal: 'Indisponibilidade Total',
      'Sem Indisponibilidade': 'Sem Indisponibilidade',
      Intermitencia: 'Intermitência',
    };
    return map[value] || value;
  }

  // Label genérica para níveis (Baixo/Médio/Alto)
  getLevelLabel(value?: string): string {
    if (!value) return 'Não informado';
    const map: Record<string, string> = {
      Baixo: 'Baixo',
      Medio: 'Médio',
      Alto: 'Alto',
      Médio: 'Médio',
    };
    return map[value] || value;
  }

  // Retorna descrição textual do risco
  getRiskLabel(risk: number): string {
    if (risk <= 3) return '🟢 Baixo';
    if (risk <= 6) return '🟡 Médio';
    if (risk <= 7) return '🔴 Alto';
    return '🔴 Alto';
  }

  // Retorna o tooltip para cada nível da barra
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

  /**
   * Abre modal para aprovação do RDM
   */

  approveRDM(): void {
    // Verifica se é admin
    if (!this.authService.isAdmin()) {
      this.showErrorNotification('Apenas administradores podem aprovar RDM.');
      return;
    }

    // Status deve ser pendente
    if (this.rdmDetails?.status?.toLowerCase() !== 'pendente') {
      this.snackBar.open('Esta RDM não está mais pendente e não pode ser aprovada.', 'Fechar', {
        duration: 3000,
        panelClass: ['warning-snackbar'],
      });
      return;
    }

    this.modalType = 'approve';
    this.showModal = true;
    this.rejectionReason = '';
  }

  /**
   * Abre modal para Reprovação do RDM
   */
  rejectRDM(): void {
    if (!this.authService.isAdmin()) {
      this.showErrorNotification('Apenas administradores podem rejeitar RDM.');
      return;
    }
    if (this.rdmDetails?.status?.toLowerCase() !== 'pendente') {
      this.snackBar.open('Esta RDM não está mais pendente e não pode ser rejeitada.', 'Fechar', {
        duration: 3000,
      });
      return;
    }
    this.modalType = 'reject';
    this.showModal = true;
    this.rejectionReason = '';
  }

  editRDM(): void {
    if (!this.authService.isAdmin()) {
      this.showErrorNotification('Apenas administradores podem pedir correção RDM.');
      return;
    }
    if (this.rdmDetails?.status?.toLowerCase() !== 'pendente') {
      this.snackBar.open('Esta RDM não está mais pendente e não pode ser corrigida.', 'Fechar', {
        duration: 3000,
      });
      return;
    }
    this.modalType = 'edit';
    this.showModal = true;
    this.correctionReason = '';
  }

  /**
   * Abre modal de confirmação para cancelar a solicitação (usuário comum)
   */
  cancelRequest(): void {
    // Verifica se o status permite cancelamento
    const statusLower = this.rdmDetails?.status?.toLowerCase();
    if (statusLower !== 'pendente' && statusLower !== 'corrigir') {
      this.snackBar.open('Esta solicitação não pode ser cancelada no momento.', 'Fechar', {
        duration: 3000,
        panelClass: ['warning-snackbar'],
      });
      return;
    }

    this.modalType = 'cancel';
    this.showModal = true;
    // Não precisamos de motivo, mas podemos manter a variável limpa
    this.rejectionReason = '';
  }

  /**
   * Processa a aprovação/reprovação do RDM
   * Envia atualização de status para a API
   */
  processRDM(): void {
    // Validações comuns a todas as ações (exceto cancel)
    if (!this.ticketId) {
      this.snackBar.open('Ticket não identificado.', 'Fechar', { duration: 3000 });
      return;
    }

    // AÇÕES DE ADMIN (aprove, reject, edit)
    if (['approve', 'reject', 'edit'].includes(this.modalType)) {
      if (!this.authService.isAdmin()) {
        this.snackBar.open('Apenas administradores podem executar esta ação.', 'Fechar', {
          duration: 3000,
        });
        return;
      }
    }

    // REPROVAÇÃO
    if (this.modalType === 'reject') {
      if (!this.rejectionReason?.trim()) {
        this.snackBar.open('Informe o motivo da reprovação.', 'Fechar', { duration: 3000 });
        return;
      }

      this.isProcessing = true;
      const payload = { status: 'Reprovado', subject: this.rejectionReason.trim() };

      this.rdmService.updateRDMStatus(this.ticketId, payload).subscribe({
        next: () => {
          this.snackBar.open(`RDM ${this.ticketId} reprovada com sucesso!`, 'Fechar', {
            duration: 3000,
          });
          this.closeModal();
          if (this.rdmDetails) this.rdmDetails.status = 'Reprovado';
          setTimeout(() => this.loadRDMDetails(), 1000);
        },
        error: () => {
          this.snackBar.open(`Erro ao reprovar RDM ${this.ticketId}`, 'Fechar', { duration: 5000 });
          this.isProcessing = false;
          this.closeModal();
        },
        complete: () => {
          this.isProcessing = false;
        },
      });
      return;
    }

    // APROVAÇÃO
    if (this.modalType === 'approve') {
      this.isProcessing = true;
      const payload = { status: 'Aprovado', subject: `RDM ${this.ticketId} Aprovada` };

      this.rdmService.updateRDMStatus(this.ticketId, payload).subscribe({
        next: () => {
          this.snackBar.open(`RDM ${this.ticketId} aprovada com sucesso!`, 'Fechar', {
            duration: 3000,
          });
          this.closeModal();
          if (this.rdmDetails) this.rdmDetails.status = 'Aprovado';
          setTimeout(() => this.loadRDMDetails(), 1000);
        },
        error: () => {
          this.snackBar.open(`Erro ao aprovar RDM ${this.ticketId}`, 'Fechar', { duration: 5000 });
          this.isProcessing = false;
          this.closeModal();
        },
        complete: () => {
          this.isProcessing = false;
        },
      });
      return;
    }

    // CORREÇÃO (edit)
    if (this.modalType === 'edit') {
      if (!this.correctionReason?.trim()) {
        this.snackBar.open('Informe o motivo da correção.', 'Fechar', { duration: 3000 });
        return;
      }

      this.isProcessing = true;
      const payload = { status: 'Corrigir', subject: this.correctionReason.trim() };

      this.rdmService.updateRDMStatus(this.ticketId, payload).subscribe({
        next: () => {
          this.snackBar.open(`RDM ${this.ticketId} encaminhada para correção!`, 'Fechar', {
            duration: 3000,
          });
          this.closeModal();
          if (this.rdmDetails) this.rdmDetails.status = 'Corrigir';
          setTimeout(() => this.loadRDMDetails(), 1000);
        },
        error: () => {
          this.snackBar.open(`Erro ao solicitar correção da RDM ${this.ticketId}`, 'Fechar', {
            duration: 5000,
          });
          this.isProcessing = false;
          this.closeModal();
        },
        complete: () => {
          this.isProcessing = false;
        },
      });
      return;
    }

    // CANCELAMENTO (usuário comum)
    if (this.modalType === 'cancel') {
      this.isProcessing = true;

      this.rdmService.cancelRDM(this.ticketId).subscribe({
        next: () => {
          this.snackBar.open(`Solicitação ${this.ticketId} cancelada com sucesso!`, 'Fechar', {
            duration: 3000,
          });
          this.closeModal();
          if (this.rdmDetails) this.rdmDetails.status = 'Cancelado';
          setTimeout(() => this.loadRDMDetails(), 1000);
        },
        error: (error) => {
          const msg = error?.error?.detail || `Erro ao cancelar a solicitação ${this.ticketId}`;
          this.snackBar.open(msg, 'Fechar', { duration: 5000 });
          this.isProcessing = false;
          this.closeModal();
        },
        complete: () => {
          this.isProcessing = false;
        },
      });
      return;
    }
  }

  /**
   * Mapeia valores de categoria para labels amigáveis
   * @param value Valor da categoria
   * @returns Label formatada
   */
  getCategoryLabel(value?: string): string {
    if (!value) return 'Não informado';

    const map: Record<string, string> = {
      Baixo: 'Baixo',
      Medio: 'Médio',
      Alto: 'Alto',
      baixo: 'Baixo',
      medio: 'Médio',
      alto: 'Alto',
    };

    return map[value] || value;
  }

  /**
   * Mapeia valores de tipo de impacto para labels amigáveis
   * @param value Valor do tipo de impacto
   * @returns Label formatada
   */
  getImpactTypeLabel(value?: string): string {
    if (!value) return 'Não informado';

    const map: Record<string, string> = {
      Atualização: 'Atualização',
      Correção: 'Correção',
      Degradação: 'Degradação',
      Indisponibilidade: 'Indisponibilidade',
      Intermitência: 'Intermitência',
    };

    return map[value] || value;
  }

  /**
   * Mapeia valores de momento para labels amigáveis
   * @param value Valor do momento
   * @returns Label formatada
   */
  getMomentLabel(value?: string): string {
    if (!value) return 'Não informado';

    const map: Record<string, string> = {
      Antes: 'Antes',
      Durante: 'Durante',
      Depois: 'Depois',
      Todos: 'Todos',
    };

    return map[value] || value;
  }

  /**
   * Mapeia valores de estágio para labels amigáveis
   * @param value Valor do estágio
   * @returns Label formatada
   */
  getStageLabel(value?: string): string {
    if (!value) return 'Não informado';

    const map: Record<string, string> = {
      Antes: 'Antes',
      Depois: 'Depois',
      Durante: 'Durante',
    };

    return map[value] || value;
  }

  /**
   * Retorna label amigável para nível de impacto
   */
  getImpactLevelLabel(value?: string): string {
    if (!value) return 'Não informado';
    const map: Record<string, string> = {
      SemIndisponibilidade: 'Sem Indisponibilidade',
      Intermitência: 'Intermitência',
      IndisponibilidadeParcial: 'Indisponibilidade Parcial',
      IndisponibilidadeTotal: 'Indisponibilidade Total',
      'Sem Indisponibilidade': 'Sem Indisponibilidade',
      Intermitencia: 'Intermitência',
    };
    return map[value] || value;
  }

  /**
   * Retorna label amigável para urgência
   */
  getUrgencyLabel(value?: string): string {
    if (!value) return 'Não informado';
    const map: Record<string, string> = {
      Baixo: 'Baixo',
      Medio: 'Médio',
      Alto: 'Alto',
      Médio: 'Médio',
    };
    return map[value] || value;
  }

  /**
   * Retorna label amigável para probabilidade de sucesso
   */
  getProbabilityLabel(value?: string): string {
    return this.getUrgencyLabel(value);
  }

  /**
   * Retorna label amigável para ambiente
   */
  getEnvironmentLabel(value?: string): string {
    if (!value) return 'Não informado';
    const map: Record<string, string> = {
      Produção: 'Produção',
      Homologação: 'Homologação',
      Desenvolvimento: 'Desenvolvimento',
      Treinamento: 'Treinamento',
    };
    return map[value] || value;
  }

  /**
   * Retorna label amigável para tipo de mudança (activity)
   */
  getActivityLabel(value?: string): string {
    if (!value) return 'Não informado';
    const map: Record<string, string> = {
      Atualização: 'Atualização',
      Correção: 'Correção',
      Melhoria: 'Melhoria',
      Desativação: 'Desativação',
      Substituição: 'Substituição',
      Implantação: 'Implantação',
      'Alteração de configuração': 'Alteração de configuração',
    };
    return map[value] || value;
  }

  /**
   * Retorna label amigável para tipo de comunicação
   */
  getComunicationTypeLabel(value?: string): string {
    if (!value) return 'Não informado';
    const map: Record<string, string> = {
      Email: 'E-mail',
    };
    return map[value] || value;
  }

  /**
   * Retorna label amigável para área de tecnologia
   */
  getTechnologyAreaLabel(value?: string): string {
    if (!value) return 'Não informado';
    const map: Record<string, string> = {
      BancoDeDados: 'Banco de Dados',
      Linux: 'Linux',
      Windows: 'Windows',
      Redes: 'Redes',
      Seguranca: 'Segurança',
      'Banco de Dados': 'Banco de Dados',
    };
    return map[value] || value;
  }

  /**
   * Determina se os campos de URL do sistema e repositório Git devem ser exibidos
   * Mesma lógica do formulário: Atividade = 'Atualização' e Área != 'BancoDeDados' e != 'Seguranca'
   */
  shouldShowUrlAndGit(): boolean {
    if (!this.rdmDetails) return false;
    const activity = this.rdmDetails.categorization?.objectiveOfTheChange || '';
    const area = this.rdmDetails.planning?.executingArea || '';
    return activity === 'Atualização' && area !== 'BancoDeDados' && area !== 'Seguranca';
  }

  /**
   * Verifica se deve exibir o card de informações técnicas.
   * Só exibe se a condição geral (atividade/área) for verdadeira
   * E se pelo menos um dos campos (systemUrl ou gitUrl) tiver valor válido.
   */
  shouldShowUrlAndGitCard(): boolean {
    if (!this.rdmDetails) return false;
    // Condição básica de exibição (mesma do formulário)
    const basicCondition = this.shouldShowUrlAndGit();
    if (!basicCondition) return false;

    const systemUrl = this.rdmDetails.planning?.systemUrl;
    const gitUrl = this.rdmDetails.planning?.gitUrl;

    const hasValidSystem = systemUrl && systemUrl.trim() !== '' && systemUrl !== 'Não Aplicável';
    const hasValidGit = gitUrl && gitUrl.trim() !== '' && gitUrl !== 'Não Aplicável';

    return hasValidSystem || hasValidGit;
  }

  /**
   * Verifica se o campo systemUrl possui valor válido para exibição.
   */
  hasValidUrlField(): boolean {
    const systemUrl = this.rdmDetails?.planning?.systemUrl;
    return systemUrl && systemUrl.trim() !== '' && systemUrl !== 'Não Aplicável';
  }

  /**
   * Verifica se o campo gitUrl possui valor válido para exibição.
   */
  hasValidGitField(): boolean {
    const gitUrl = this.rdmDetails?.planning?.gitUrl;
    return gitUrl && gitUrl.trim() !== '' && gitUrl !== 'Não Aplicável';
  }

  /**
   * Verifica se uma string é uma URL HTTP/HTTPS válida.
   */
  isValidHttpUrl(value: string | undefined | null): boolean {
    if (!value) return false;
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Exibe notificação de sucesso
   * @param message Mensagem a ser exibida
   */
  private showSuccessNotification(message: string): void {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #28a745;
      color: white;
      padding: 12px 24px;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      animation: slideIn 0.3s ease;
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;

    document.head.appendChild(style);
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
        document.head.removeChild(style);
      }, 300);
    }, 3000);
  }

  /**
   * Exibe notificação de erro
   * @param message Mensagem a ser exibida
   */
  private showErrorNotification(message: string): void {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #dc3545;
      color: white;
      padding: 12px 24px;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notification);
    notification.textContent = message;

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  /**
   * Fecha o modal e limpa os dados
   */
  closeModal(): void {
    this.showModal = false;
    this.rejectionReason = '';
    this.correctionReason = '';
    this.isProcessing = false;
  }

  /**
   * Retorna para a tela anterior
   */
  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      // fallback para uma rota padrão
      this.router.navigate(['/user']);
    }
  }

  /**
   * Retorna a classe CSS baseada no status do RDM
   * @param status Status do RDM
   * @returns Nome da classe CSS
   */
  getStatusClass(status?: string): string {
    if (!status) return 'pending';

    const statusLower = status.toLowerCase();
    if (statusLower.includes('aprovada') || statusLower.includes('aprovado')) return 'approved';
    if (statusLower.includes('rejeitada') || statusLower.includes('rejeitado')) return 'rejected';
    if (statusLower.includes('pendente')) return 'pending';
    if (statusLower.includes('concluída') || statusLower.includes('concluido')) return 'completed';
    if (statusLower.includes('em análise') || statusLower.includes('analise')) return 'analysis';
    if (statusLower.includes('cancelada') || statusLower.includes('cancelado')) return 'cancelled';
    if (statusLower.includes('corrigir')) return 'correction';

    return 'pending';
  }

  /**
   * Retorna o texto do status atual
   * @returns Texto do status
   */
  getStatusText(): string {
    return this.rdmStatus;
  }
}
