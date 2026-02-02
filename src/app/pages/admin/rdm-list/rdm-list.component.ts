// src/app/pages/admin/rdm-list/rdm-list.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { RdmService } from '../../../services/rdm-services';
import { RDMList, RDMPagedResult, RDMSearchParams } from '../../../models/rdm-models';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-rdm-list',
  standalone: true,
  imports: [FormsModule, CommonModule, MatIconModule],
  templateUrl: './rdm-list.html',
  styleUrls: ['./rdm-list.css'],
})
export class RDMListComponent implements OnInit, OnDestroy {
  // Dados principais - todas as RDMs e versão filtrada
  rdmData: RDMList[] = [];
  filteredRDM: RDMList[] = [];
  isLoading = false;

  // Controle de download de PDF - rastreia qual RDM está sendo baixada
  downloadingPDF: string | null = null;
  downloadError = '';

  // Filtros de busca - valores dos campos de filtro
  searchTerm = '';
  statusFilter = '';
  dateFromFilter = '';
  dateToFilter = '';
  departmentFilter = '';

  // Configuração de paginação - controle de navegação entre páginas
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 0;

  // Listas únicas para preenchimento de dropdowns de filtro
  uniqueStatuses: string[] = [];
  uniqueDepartments: string[] = [];
  uniqueApprovers: string[] = [];

  // Configuração de ordenação - campo atual e direção
  sortBy = 'date';
  sortOrder: 'asc' | 'desc' = 'desc';

  // Controle de debounce para busca em tempo real
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private rdmService: RdmService,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {
    // Configura debounce de 500ms para pesquisas em tempo real
    this.searchSubject
      .pipe(debounceTime(500), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.onSearch();
      });
  }

  ngOnInit(): void {
    // Carrega dados iniciais ao montar o componente
    this.loadRDM();
  }

  ngOnDestroy(): void {
    // Limpa subscriptions para evitar memory leaks
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carrega dados de RDM da API aplicando filtros atuais
   * Gerencia estado de loading e tratamento de erros
   */
  loadRDM(): void {
    this.isLoading = true;

    const params: RDMSearchParams = {
      search: this.searchTerm || undefined,
      status: this.statusFilter || undefined,
      dateFrom: this.dateFromFilter || undefined,
      dateTo: this.dateToFilter || undefined,
      department: this.departmentFilter || undefined,
      page: this.currentPage,
      pageSize: this.pageSize,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder,
    };

    this.rdmService.getAllRDM(params).subscribe({
      next: (result: RDMPagedResult) => {
        this.rdmData = result.items || [];
        this.filteredRDM = this.rdmData;
        this.totalItems = result.totalCount || 0;
        this.totalPages = result.totalPages || 0;

        this.updateUniqueLists();
        this.isLoading = false;

        // Notifica usuário se não há resultados
        if (this.rdmData.length === 0) {
          this.snackBar.open('Nenhuma RDM encontrada.', 'OK', {
            duration: 3000,
            panelClass: ['info-snackbar'],
          });
        }
      },
      error: () => {
        this.isLoading = false;
        this.snackBar.open('Erro ao carregar RDMs. Tente novamente mais tarde.', 'OK', {
          duration: 5000,
          panelClass: ['error-snackbar'],
        });
      },
    });
  }

  /**
   * Extrai valores únicos dos dados para preenchimento de dropdowns
   * Garante que filtros só mostrem opções realmente disponíveis
   */
  updateUniqueLists(): void {
    // Status únicos
    const statuses = this.rdmData
      .map((rdm) => rdm.status)
      .filter((status): status is string => !!status && status.trim() !== '');
    this.uniqueStatuses = [...new Set(statuses)].sort();

    // Departamentos únicos
    const departments = this.rdmData
      .map((rdm) => rdm.department)
      .filter((dept): dept is string => !!dept && dept.trim() !== '');
    this.uniqueDepartments = [...new Set(departments)].sort();

    // Aprovadores únicos
    const approvers = this.rdmData
      .map((rdm) => rdm.approvedBy)
      .filter((approver): approver is string => !!approver && approver.trim() !== '');
    this.uniqueApprovers = [...new Set(approvers)].sort();
  }

  /**
   * Aciona a busca com debounce quando o termo de pesquisa muda
   */
  onSearchChange(): void {
    this.searchSubject.next(this.searchTerm);
  }

  /**
   * Executa busca com filtros atuais, resetando para primeira página
   */
  onSearch(): void {
    this.currentPage = 1;
    this.loadRDM();
  }

  /**
   * Reaplica filtros quando algum seletor é alterado
   */
  onFilterChange(): void {
    this.currentPage = 1;
    this.loadRDM();
  }

  /**
   * Limpa todos os filtros aplicados e retorna à visualização padrão
   */
  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = '';
    this.dateFromFilter = '';
    this.dateToFilter = '';
    this.departmentFilter = '';
    this.currentPage = 1;
    this.loadRDM();
  }

  /**
   * Navega para uma página específica da lista paginada
   * @param page Número da página desejada (base 1)
   */
  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadRDM();
      window.scrollTo(0, 0); // Melhora UX voltando ao topo
    }
  }

  /**
   * Altera critério de ordenação da lista
   * @param field Campo pelo qual ordenar
   */
  changeSort(field: string): void {
    if (this.sortBy === field) {
      // Alterna direção se ordenando pelo mesmo campo
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      // Novo campo, ordem descendente por padrão
      this.sortBy = field;
      this.sortOrder = 'desc';
    }
    this.loadRDM();
  }

  /**
   * Formata datas do formato servidor para exibição brasileira
   * Converte UTC para UTC-3 (horário de Brasília)
   * @param dateString Data no formato "DD-MM-YYYY HH:mm" (UTC)
   * @returns Data formatada "DD/MM/YYYY HH:mm" ou mensagem padrão
   */
  formatDate(dateString?: string): string {
    if (!dateString) return 'Não informado';

    // Verifica se está no formato esperado do servidor
    if (/^\d{2}-\d{2}-\d{4} \d{2}:\d{2}$/.test(dateString)) {
      const [datePart, timePart] = dateString.split(' ');
      const [dayStr, monthStr, yearStr] = datePart.split('-');
      const [hourStr, minuteStr] = timePart.split(':');

      const day = parseInt(dayStr, 10);
      const month = parseInt(monthStr, 10) - 1; // Date usa meses 0-indexed
      const year = parseInt(yearStr, 10);
      let hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);

      // Ajuste de fuso: UTC → Brasil (UTC-3)
      hour = hour - 3;

      // Date ajusta automaticamente horas negativas para dia anterior
      const adjustedDate = new Date(year, month, day, hour, minute);

      // Formata cada componente com zero à esquerda
      const formattedDay = adjustedDate.getDate().toString().padStart(2, '0');
      const formattedMonth = (adjustedDate.getMonth() + 1).toString().padStart(2, '0');
      const formattedYear = adjustedDate.getFullYear();
      const formattedHour = adjustedDate.getHours().toString().padStart(2, '0');
      const formattedMinute = adjustedDate.getMinutes().toString().padStart(2, '0');

      return `${formattedDay}/${formattedMonth}/${formattedYear} ${formattedHour}:${formattedMinute}`;
    }

    // Retorna original se formato não reconhecido
    return dateString;
  }

  /**
   * Mapeia status para classes CSS de estilo
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
   * Navega para página de detalhes com contexto administrativo
   * @param ticket Identificador único do RDM
   */
  viewFullRDMDetails(ticket: string): void {
    this.router.navigate(['/admin/rdm', ticket], {
      state: {
        forceAdminView: true,
        fromAdminList: true,
      },
    });
  }

  /**
   * Inicia download do relatório PDF de um RDM específico
   * @param ticketId Identificador do RDM para download
   */
  downloadRDM(ticketId: string): void {
    this.downloadingPDF = ticketId;
    this.downloadError = '';

    this.rdmService.downloadRDMReport(ticketId).subscribe({
      next: (blob) => {
        if (blob.size === 0) {
          this.downloadError = 'PDF vazio ou não disponível';
          this.downloadingPDF = null;
          return;
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const filename = `RDM-${ticketId}-${new Date().toISOString().slice(0, 10)}.pdf`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();

        // Limpeza de recursos
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        this.downloadingPDF = null;

        this.snackBar.open(`PDF da RDM ${ticketId} baixado com sucesso!`, 'OK', {
          duration: 3000,
          panelClass: ['success-snackbar'],
        });
      },
      error: (error) => {
        let errorMessage = 'Erro ao baixar PDF';

        // Tratamento específico por código de status
        if (error.status === 400) {
          errorMessage = 'Parâmetros inválidos para gerar o PDF';
        } else if (error.status === 404) {
          errorMessage = 'RDM não encontrada para gerar PDF';
        } else if (error.status === 500) {
          errorMessage = 'Erro interno ao gerar PDF';
        }

        this.downloadError = errorMessage;
        this.downloadingPDF = null;

        this.snackBar.open(errorMessage, 'Fechar', {
          duration: 5000,
          panelClass: ['error-snackbar'],
        });
      },
    });
  }

  /**
   * Calcula intervalo de páginas visíveis na navegação
   * Mantém foco na página atual com máximo de 5 páginas visíveis
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

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  /**
   * Indica se há página anterior disponível
   */
  get canGoPrevious(): boolean {
    return this.currentPage > 1;
  }

  /**
   * Indica se há próxima página disponível
   */
  get canGoNext(): boolean {
    return this.currentPage < this.totalPages;
  }
}
