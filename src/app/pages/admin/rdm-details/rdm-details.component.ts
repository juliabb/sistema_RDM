// src/app/pages/admin/rdm-details/rdm-details.component.ts
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule, NavigationEnd } from '@angular/router';
import { Observable, Subject, filter, takeUntil } from 'rxjs';
import { RdmService } from '../../../services/rdm-services';
import { ModalComponent } from '../../../components/modal/modal.component';
import { AuthService } from '../../../services/auth-services';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DateFixerService } from '../../../services/date-fixer.services';
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
  deploymentWindow: {
    impactType: string;
  };
  planComunication: {
    whosNotified: string;
    moment: string;
    comunicationType: string;
    technologyArea: string;
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

  // Propriedades para modo de edição
  isEditMode = false;
  isSaving = false;
  formData: RDMFormData = this.createEmptyFormData();

  // Subject para gerenciar subscriptions e evitar memory leaks
  private destroy$ = new Subject<void>();

  // Propriedades para controle do modal
  showModal = false;
  modalType: 'approve' | 'reject' = 'approve';
  modalTitle = '';
  modalButtonText = 'Fechar';
  rejectionReason = '';
  isProcessing = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private rdmService: RdmService,
    private authService: AuthService,
    private http: HttpClient,
    private dateFormatter: DateFixerService,
    private snackBar: MatSnackBar,
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
      identification: {
        type: '',
        title: '',
        area: '',
      },
      solution: {
        objectiveOrSolution: '',
      },
      category: {
        objective: '',
        action: '',
        impact: '',
        urgency: '',
      },
      impactCategory: {
        changeSystem: '',
        activity: '',
        impactedServices: '',
        environment: '',
        iCsImpacted: '',
      },
      deploymentWindow: {
        impactType: '',
      },
      planComunication: {
        whosNotified: '',
        moment: '',
        comunicationType: '',
        technologyArea: '',
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

  /**
   * Popula o formulário de edição com dados da API
   * @param apiData Dados recebidos da API
   */
  private populateFormData(apiData: any): void {
    this.formData.identification = {
      type: apiData.identification?.type || '',
      title: apiData.identification?.title || '',
      area: apiData.identification?.area || '',
    };

    this.formData.solution = {
      objectiveOrSolution: apiData.solution?.objectiveOrSolution || '',
    };

    this.formData.category = {
      objective: apiData.category?.objective || '',
      action: apiData.category?.action || '',
      impact: apiData.category?.impact || '',
      urgency: apiData.category?.urgency || '',
    };

    this.formData.impactCategory = {
      changeSystem: apiData.impactCategory?.changeSystem || '',
      activity: apiData.impactCategory?.activity || '',
      impactedServices: apiData.impactCategory?.impactedServices || '',
      environment: apiData.impactCategory?.environment || '',
      iCsImpacted: apiData.impactCategory?.iCsImpacted || '',
    };

    this.formData.deploymentWindow = {
      impactType: apiData.deploymentWindow?.impactType || '',
    };

    this.formData.planComunication = {
      whosNotified: apiData.planComunication?.whosNotified || '',
      moment: apiData.planComunication?.moment || '',
      comunicationType: apiData.planComunication?.comunicationType || '',
      technologyArea: apiData.planComunication?.technologyArea || '',
    };
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

    // Simulação de salvamento (substituir por chamada real à API)
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
        deploymentWindow: { ...this.formData.deploymentWindow },
        planComunication: { ...this.formData.planComunication },
      };

      this.showSuccessNotification('Alterações salvas com sucesso!');
    }, 1500);
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
        this.rdmDetails = {
          ...apiData,
          // Garante que a data está disponível
          date: apiData.date,
          createdAt: apiData.date,
          dateRequest: apiData.date,
        };

        this.isLoading = false;
        this.populateFormData(this.rdmDetails);
        this.rdmStatus = apiData.status || 'Pendente';

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

    this.rdmService.downloadRDMReport(this.ticketId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `RDM-${this.ticketId}-${new Date().toISOString().slice(0, 10)}.pdf`;
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
      error: () => {
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

  /**
   * Abre modal para aprovação do RDM
   */
  approveRDM(): void {
    if (!this.authService.isAdmin()) {
      this.showErrorNotification('Apenas administradores podem aprovar RDM.');
      return;
    }

    this.modalType = 'approve';
    this.showModal = true;
    this.rejectionReason = ''; // Limpa motivo de rejeição
  }

  /**
   * Abre modal para rejeição do RDM
   */
  rejectRDM(): void {
    if (!this.authService.isAdmin()) {
      this.showErrorNotification('Apenas administradores podem rejeitar RDM.');
      return;
    }

    this.modalType = 'reject';
    this.showModal = true;
    this.rejectionReason = ''; // Começa vazio
  }

  /**
   * Processa a aprovação/reprovação do RDM
   * Envia atualização de status para a API
   */
  processRDM(): void {
    if (!this.ticketId || !this.authService.isAdmin()) return;

    // Validação específica para reprovação
    if (this.modalType === 'reject') {
      if (!this.rejectionReason.trim()) {
        this.snackBar.open('Informe o motivo da reprovação', 'Fechar', {
          duration: 3000,
          panelClass: ['warning-snackbar'],
        });
        return;
      }

      this.isProcessing = true;

      // REPROVAÇÃO
      const rejectData = {
        status: 'Reprovado',
        subject: this.rejectionReason.trim(),
      };

      this.rdmService.updateRDMStatus(this.ticketId, rejectData).subscribe({
        next: () => {
          this.snackBar.open(`RDM ${this.ticketId} reprovada com sucesso!`, 'Fechar', {
            duration: 3000,
            panelClass: ['success-snackbar'],
          });

          this.closeModal();

          // Atualiza o status localmente
          if (this.rdmDetails) {
            this.rdmDetails.status = 'Reprovado';
            this.rdmDetails.rejectionReason = this.rejectionReason;
          }

          // Recarrega os dados
          setTimeout(() => {
            this.loadRDMDetails();
          }, 1000);
        },
        error: (error) => {
          const errorMessage = `Erro ao reprovar RDM ${this.ticketId}`;

          this.snackBar.open(errorMessage, 'Fechar', {
            duration: 5000,
            panelClass: ['error-snackbar'],
          });

          this.closeModal();
        },
        complete: () => {
          this.isProcessing = false;
        },
      });
    }

    // APROVAÇÃO
    else if (this.modalType === 'approve') {
      this.isProcessing = true;

      const approveData = {
        status: 'Aprovado',
        subject: `RDM ${this.ticketId} Aprovada`,
      };

      this.rdmService.updateRDMStatus(this.ticketId, approveData).subscribe({
        next: () => {
          this.snackBar.open(`RDM ${this.ticketId} aprovada com sucesso!`, 'Fechar', {
            duration: 3000,
            panelClass: ['success-snackbar'],
          });

          this.closeModal();

          // Atualiza o status localmente
          if (this.rdmDetails) {
            this.rdmDetails.status = 'Aprovado';
          }

          // Recarrega os dados
          setTimeout(() => {
            this.loadRDMDetails();
          }, 1000);
        },
        error: (error) => {
          const errorMessage = `Erro ao aprovar RDM ${this.ticketId}`;

          this.snackBar.open(errorMessage, 'Fechar', {
            duration: 5000,
            panelClass: ['error-snackbar'],
          });

          this.closeModal();
        },
        complete: () => {
          this.isProcessing = false;
        },
      });
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
   * Mapeia valores de atividade para labels amigáveis
   * @param value Valor da atividade
   * @returns Label formatada
   */
  getActivityLabel(value?: string): string {
    if (!value) return 'Não informado';

    const map: Record<string, string> = {
      Ajuste: 'Ajuste',
      Ativação: 'Ativação',
      Atualização: 'Atualização',
      Conserto: 'Conserto',
      Desativação: 'Desativação',
      Manutenção: 'Manutenção',
      Substituição: 'Substituição',
    };

    return map[value] || value;
  }

  /**
   * Mapeia valores de ambiente para labels amigáveis
   * @param value Valor do ambiente
   * @returns Label formatada
   */
  getEnvironmentLabel(value?: string): string {
    if (!value) return 'Não informado';

    const map: Record<string, string> = {
      Produção: 'Produção',
      Homologação: 'Homologação',
      Desenvolvimento: 'Desenvolvimento',
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
   * Mapeia valores de tipo de comunicação para labels amigáveis
   * @param value Valor do tipo de comunicação
   * @returns Label formatada
   */
  getComunicationTypeLabel(value?: string): string {
    if (!value) return 'Não informado';

    const map: Record<string, string> = {
      Email: 'E-mail',
      Teams: 'Teams',
      Telefone: 'Telefone',
    };

    return map[value] || value;
  }

  /**
   * Mapeia valores de área de tecnologia para labels amigáveis
   * @param value Valor da área de tecnologia
   * @returns Label formatada
   */
  getTechnologyAreaLabel(value?: string): string {
    if (!value) return 'Não informado';

    const map: Record<string, string> = {
      BancoDeDados: 'Banco de Dados',
      Linux: 'Linux',
      Windows: 'Windows',
      Redes: 'Redes',
      'Banco de Dados': 'Banco de Dados',
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
    this.isProcessing = false;
  }

  /**
   * Retorna para a tela anterior baseada no contexto
   */
  goBack(): void {
    if (this.isAdminView) {
      this.router.navigate(['/admin/pending-rdm']);
    } else {
      this.router.navigate(['/dashboard']);
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
