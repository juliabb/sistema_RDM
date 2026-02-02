// src/app/pages/admin/rdm-pending/rdm-pending.component.ts
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RdmService } from '../../../services/rdm-services';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ModalComponent } from '../../../components/modal/modal.component';
import { DateFixerService } from '../../../services/date-fixer.services';
import type { RDM } from '../../../models/rdm-models';

@Component({
  selector: 'app-rdm-pending',
  standalone: true,
  imports: [FormsModule, CommonModule, MatIconModule, MatProgressSpinnerModule, ModalComponent],
  providers: [RdmService, MatSnackBar],
  templateUrl: './rdm-pending.html',
  styleUrls: ['./rdm-pending.css'],
})
export class PendingRDMComponent implements OnInit {
  // Listas de RDMs - original e filtrada para busca
  pendingRDM: RDM[] = [];
  filteredRDM: RDM[] = [];

  // Estados de carregamento e erro
  isLoading = false;
  errorMessage = '';

  // Controle de busca
  searchTerm = '';

  // Configuração de paginação
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 0;

  // Controle de modais de aprovação/rejeição
  showApproveModal = false;
  showRejectModal = false;
  selectedRDM: RDM | null = null;
  rejectionReason = '';
  isProcessing = false;

  constructor(
    private rdmService: RdmService,
    private router: Router,
    private snackBar: MatSnackBar,
    private dateFormatter: DateFixerService,
  ) {}

  ngOnInit(): void {
    // Carrega RDMs pendentes ao inicializar componente
    this.loadPendingRDM();
  }

  /**
   * Carrega lista de RDMs pendentes da API
   * Gerencia estados de loading e tratamento de erros
   */
  loadPendingRDM(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.rdmService.getPendingRDM(this.currentPage, this.pageSize).subscribe({
      next: (data: any) => {
        this.pendingRDM = data;
        this.totalItems = data.length;
        this.totalPages = Math.ceil(this.totalItems / this.pageSize);
        this.filteredRDM = [...data];
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Erro ao carregar RDM pendentes. Tente novamente.';
        this.isLoading = false;
      },
    });
  }

  /**
   * Filtra RDMs baseado no termo de busca
   * Busca em ticket, nome, título e status
   */
  searchRDM(): void {
    if (!this.searchTerm.trim()) {
      this.filteredRDM = [...this.pendingRDM];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredRDM = this.pendingRDM.filter(
      (rdm) =>
        rdm.ticket.toLowerCase().includes(term) ||
        rdm.name.toLowerCase().includes(term) ||
        rdm.title.toLowerCase().includes(term) ||
        (rdm.status && rdm.status.toLowerCase().includes(term)),
    );
  }

  /**
   * Formata data COM hora para exibição em lista pendente
   * @param dateString Data a ser formatada
   * @returns Data formatada com data e hora
   */
  formatDateWithTime(dateString?: string): string {
    return this.dateFormatter.formatWithTime(dateString);
  }

  /**
   * Retorna classe CSS baseada no status do RDM
   * @param status Status textual do RDM
   * @returns Nome da classe CSS correspondente
   */

  getStatusClass(status?: string): string {
    if (!status) return 'pending';

    const statusLower = status.toLowerCase();

    if (
      statusLower.includes('rejeitado') ||
      statusLower.includes('rejeitada') ||
      statusLower === 'reprovado'
    ) {
      return 'rejected';
    }

    if (statusLower.includes('aprovado') || statusLower.includes('aprovada')) return 'approved';
    if (statusLower.includes('pendente')) return 'pending';
    if (statusLower.includes('concluído') || statusLower.includes('concluída')) return 'completed';
    if (statusLower.includes('em análise') || statusLower.includes('analise')) return 'analysis';
    if (statusLower.includes('cancelado') || statusLower.includes('cancelada')) return 'cancelled';

    return 'pending';
  }

  /**
   * Formata datas do formato ticket-short (DD-MM-YYYY HH:mm) com ajuste UTC→UTC-3
   * Compatível com RDMListComponent e RDMDetailsComponent
   */
  formatDateLikeList(dateString?: string): string {
    if (!dateString) return 'Não informado';

    // Formato do endpoint ticket-short: "DD-MM-YYYY HH:mm"
    if (/^\d{2}-\d{2}-\d{4} \d{2}:\d{2}$/.test(dateString)) {
      const [datePart, timePart] = dateString.split(' ');
      const [dayStr, monthStr, yearStr] = datePart.split('-');
      const [hourStr, minuteStr] = timePart.split(':');

      const day = parseInt(dayStr, 10);
      const month = parseInt(monthStr, 10) - 1; // Date usa meses 0-indexed
      const year = parseInt(yearStr, 10);
      let hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);

      // **CORREÇÃO DE FUSO HORÁRIO: UTC → UTC-3**
      // Exemplo: "17-01-2026 00:46" (UTC) → "16/01/2026 21:46" (UTC-3)
      hour = hour - 3;

      const adjustedDate = new Date(year, month, day, hour, minute);

      const formattedDay = adjustedDate.getDate().toString().padStart(2, '0');
      const formattedMonth = (adjustedDate.getMonth() + 1).toString().padStart(2, '0');
      const formattedYear = adjustedDate.getFullYear();
      const formattedHour = adjustedDate.getHours().toString().padStart(2, '0');
      const formattedMinute = adjustedDate.getMinutes().toString().padStart(2, '0');

      return `${formattedDay}/${formattedMonth}/${formattedYear} ${formattedHour}:${formattedMinute}`;
    }

    // Fallback para outros formatos
    return this.formatDateWithTime(dateString);
  }

  /**
   * Retorna ícone do Material baseado no status do RDM
   * @param status Status textual do RDM
   * @returns Nome do ícone Material
   */
  getStatusIcon(status?: string): string {
    if (!status) return 'pending';

    const statusLower = status.toLowerCase();
    if (statusLower.includes('pendente')) return 'pending';
    if (statusLower.includes('aprovado') || statusLower.includes('aprovada')) return 'check_circle';
    if (statusLower.includes('rejeitado') || statusLower.includes('rejeitada')) return 'cancel';
    if (statusLower.includes('análise') || statusLower.includes('analise')) return 'search';
    if (statusLower.includes('aguardando')) return 'hourglass_empty';
    return 'help_outline';
  }

  /**
   * Navega para página de detalhes do RDM
   * @param ticket ID do ticket do RDM
   */
  viewFullRDMDetails(ticket: string): void {
    this.router.navigate(['/admin/rdm', ticket]);
  }

  /**
   * Abre modal de aprovação para RDM específico
   * @param rdm Objeto RDM a ser aprovado
   */
  approveRDM(rdm: RDM): void {
    this.selectedRDM = rdm;
    this.showApproveModal = true;
  }

  /**
   * Abre modal de rejeição para RDM específico
   * @param rdm Objeto RDM a ser rejeitado
   */
  rejectRDM(rdm: RDM): void {
    this.selectedRDM = rdm;
    this.rejectionReason = '';
    this.showRejectModal = true;
  }

  /**
   * Confirma e processa aprovação do RDM selecionado
   * Envia atualização de status para API
   */
  confirmApprove(): void {
    if (!this.selectedRDM) return;

    this.isProcessing = true;

    const approveData = {
      status: 'Aprovado',
      subject: `RDM ${this.selectedRDM.ticket} Aprovada`,
    };

    this.rdmService.updateRDMStatus(this.selectedRDM.ticket, approveData).subscribe({
      next: () => {
        this.snackBar.open(`RDM ${this.selectedRDM!.ticket} aprovada com sucesso!`, 'Fechar', {
          duration: 3000,
          panelClass: ['success-snackbar'],
        });

        this.closeModal();
        this.loadPendingRDM(); // Recarrega lista após aprovação
      },
      error: () => {
        const errorMessage = `Erro ao aprovar RDM ${this.selectedRDM!.ticket}`;

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

  /**
   * Confirma e processa rejeição do RDM selecionado
   * Valida motivo da rejeição antes de enviar para API
   */
  confirmReject(): void {
    if (!this.selectedRDM || !this.rejectionReason.trim()) {
      this.snackBar.open('Informe o motivo da rejeição', 'Fechar', {
        duration: 3000,
        panelClass: ['warning-snackbar'],
      });
      return;
    }

    this.isProcessing = true;

    // Dados para rejeição
    const rejectData = {
      status: 'Reprovado',
      subject: this.rejectionReason.trim(),
    };

    this.rdmService.updateRDMStatus(this.selectedRDM.ticket, rejectData).subscribe({
      next: () => {
        this.snackBar.open(`RDM ${this.selectedRDM!.ticket} reprovada com sucesso!`, 'Fechar', {
          duration: 3000,
          panelClass: ['success-snackbar'],
        });

        this.closeModal();
        this.loadPendingRDM(); // Recarrega lista após rejeição
      },
      error: (error) => {
        const errorMessage = `Erro ao reprovar RDM ${this.selectedRDM!.ticket}`;

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

  /**
   * Fecha todos os modais e limpa estados relacionados
   */
  closeModal(): void {
    this.showApproveModal = false;
    this.showRejectModal = false;
    this.selectedRDM = null;
    this.rejectionReason = '';
    this.isProcessing = false;
  }

  /**
   * Navega para página específica na paginação
   * @param page Número da página desejada
   */
  changePage(page: number): void {
    this.currentPage = page;
    this.loadPendingRDM();
    window.scrollTo(0, 0); // Melhora UX retornando ao topo
  }

  /**
   * Calcula intervalo de páginas visíveis na navegação
   * Mantém foco na página atual com máximo de 5 páginas
   * @returns Array de números de páginas a exibir
   */
  get pages(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);

    // Ajusta início se intervalo for menor que máximo
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    // Preenche array com páginas
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  /**
   * Atualiza dados da lista de RDMs pendentes
   * Útil para recarregar após ações ou atualizações
   */
  refreshData(): void {
    this.loadPendingRDM();
  }
}
