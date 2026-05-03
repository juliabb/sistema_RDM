// src/app/pages/admin/rdm-list/rdm-list.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { RdmService } from '../../../services/rdm-service';
import { RDMList, RDMPagedResult, RDMSearchParams } from '../../../models/rdm-models';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ModalComponent } from '../../../components/modal/modal.component';
import { PaginationComponent } from '../../../components/pagination/pagination.component';

@Component({
  selector: 'app-rdm-list',
  standalone: true,
  imports: [FormsModule, CommonModule, MatIconModule, ModalComponent, PaginationComponent],
  templateUrl: './rdm-list.html',
  styleUrls: ['./rdm-list.css'],
})
export class RDMListComponent implements OnInit, OnDestroy {
  // Dados principais - todas as RDMs e versão filtrada
  rdmData: RDMList[] = [];
  filteredRDM: RDMList[] = [];
  isLoading = false;

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
  pageSizeOptions: number[] = [5, 10, 20, 50];

  // Listas únicas para preenchimento de dropdowns de filtro
  uniqueStatuses: string[] = [];
  uniqueDepartments: string[] = [];
  uniqueApprovers: string[] = [];

  // Configuração de ordenação - campo atual e direção
  sortBy = 'date';
  sortOrder: 'asc' | 'desc' = 'desc';

  // Controle do modal de resumo
  showSummaryModal = false;
  selectedRDMForSummary: RDMList | null = null;

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
   * Atualiza manualmente a lista de RDMs (botão Atualizar)
   */
  refreshData(): void {
    this.loadRDM();
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

        this.totalPages = result.totalPages || Math.ceil(this.totalItems / this.pageSize) || 0;

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
   * Abre o modal de resumo com as informações de reprovação/correção
   */
  openSummaryModal(rdm: RDMList): void {
    this.selectedRDMForSummary = rdm;
    this.showSummaryModal = true;
  }

  /**
   * Fecha o modal de resumo
   */
  closeSummaryModal(): void {
    this.showSummaryModal = false;
    this.selectedRDMForSummary = null;
  }

  /**
   * Normaliza o status para um valor padrão (aprovado, reprovado, pendente, corrigir, cancelado)
   */

  getNormalizedStatus(status?: string): string {
    if (!status) return 'pendente';
    const s = status.toLowerCase();

    // Radical 'aprovad' pega "aprovado" e "aprovada"
    if (s.includes('aprovad')) return 'aprovado';
    // Radical 'reprovad' pega "reprovado", "reprovada", "rejeitado"
    if (s.includes('reprovad') || s.includes('rejeitad')) return 'reprovado';
    if (s.includes('corrigir')) return 'corrigir';
    if (s.includes('cancelad')) return 'cancelado';
    if (s.includes('pendent')) return 'pendente';
    return 'pendente';
  }

  /**
   * Retorna o label apropriado para o campo de data baseado no status
   */
  getStatusBasedLabel(status: string | undefined, field: 'date' | 'responsible'): string {
    const normalized = this.getNormalizedStatus(status);
    if (field === 'date') {
      switch (normalized) {
        case 'aprovado':
          return 'Data Aprovação:';
        case 'reprovado':
          return 'Data Reprovação:';
        case 'corrigir':
          return 'Data Solicitação Correção:';
        case 'cancelado':
          return 'Data Cancelamento:';
        default:
          return 'Data Atualização:';
      }
    }
    return '';
  }

  /**
   * Retorna classe CSS adicional para a mensagem baseada no status
   */
  getMessageClass(status?: string): string {
    const normalized = this.getNormalizedStatus(status);
    switch (normalized) {
      case 'aprovado':
        return 'message-success';
      case 'reprovado':
        return 'message-error';
      case 'corrigir':
        return 'message-warning';
      case 'cancelado':
        return 'message-cancelled';
      default:
        return 'message-info';
    }
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

    // Limpa espaços e converte para minúsculas
    const cleanStatus = status.trim().toLowerCase();

    // Verificações explícitas para cada caso
    if (cleanStatus.includes('aprovado') || cleanStatus.includes('aprovada')) {
      return 'approved';
    }
    if (
      cleanStatus.includes('reprovado') ||
      cleanStatus.includes('rejeitado') ||
      cleanStatus.includes('reprovada')
    ) {
      return 'rejected';
    }
    if (cleanStatus.includes('pendente')) {
      return 'pending';
    }
    if (cleanStatus.includes('corrigir')) {
      return 'corrigir';
    }
    if (cleanStatus.includes('cancelado') || cleanStatus.includes('cancelada')) {
      return 'cancelled';
    }
    if (cleanStatus.includes('concluído') || cleanStatus.includes('concluída')) {
      return 'completed';
    }
    if (cleanStatus.includes('análise') || cleanStatus.includes('analise')) {
      return 'analysis';
    }

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

  // Manipuladores de eventos de paginação
  onPageSizeChange(newSize: number): void {
    this.pageSize = newSize;
    this.currentPage = 1; // volta para a primeira página ao mudar o tamanho
    this.loadRDM();
  }
}
