// src/app/pages/dashboard/requests-table/requests-table.ts
import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../services/auth-services';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RDMList } from '../../../models/rdm-models';

// Importar configurações da API
import { buildApiUrl, API_PATHS } from '../../../config/api.config';

// Interface local que estende RDMList para incluir propriedades específicas deste componente
interface RequestItem extends Omit<RDMList, 'type' | 'impact' | 'urgency'> {
  type?: number;
  impact?: number;
  urgency?: number;
  problemDescription?: string;
  objectiveOrSolution?: string;
  requesterEmail?: string; // Adicionado para verificar o solicitante
}

interface PaginationMetadata {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}

@Component({
  selector: 'app-requests-table',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './requests-table.html',
  styleUrls: ['./requests-table.css']
})
export class RequestsTableComponent implements OnInit, OnDestroy {
  // Dados e estado
  requests: RequestItem[] = [];
  filteredRequests: RequestItem[] = [];
  isLoading = false;
  errorMessage = '';

  // Filtros
  searchTerm = '';
  statusFilter = '';
  private searchSubject = new Subject<string>();
  totalItemsOriginal = 0;

  // Controle de download
  downloadingPDF = false;
  downloadError = '';

  // Configuração de paginação
  currentPage = 1;
  pageSize = 5;
  totalItems = 0;
  totalPages = 0;

  // Cache estático para melhorar performance
  private static requestsCache = new Map<number, RequestItem[]>();
  private static paginationCache = new Map<number, PaginationMetadata>();
  private static lastLoadedPage = 1;

  // Gerenciamento de subscriptions
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService,
    private readonly cdr: ChangeDetectorRef,
    private readonly router: Router
  ) {
    // Configura debounce para busca
    this.searchSubject.pipe(
      takeUntil(this.destroy$),
      debounceTime(300)
    ).subscribe(() => {
      this.applyFilters();
    });
  }

  ngOnInit(): void {
    const pageToLoad = RequestsTableComponent.lastLoadedPage || 1;

    if (RequestsTableComponent.requestsCache.has(pageToLoad)) {
      this.loadFromStaticCache(pageToLoad);
    } else {
      this.loadRequests(pageToLoad, false);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.searchSubject.complete();
  }

  // ==================== NOVOS MÉTODOS PARA EDIÇÃO ====================

  /**
   * Verifica se o usuário pode editar uma solicitação
   * Apenas solicitações pendentes do próprio usuário podem ser editadas
   */
  canEditRequest(request: RequestItem): boolean {
    if (!request) return false;

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return false;

    // Verifica se o usuário atual é o solicitante
    // Compara email do solicitante com email do usuário logado
    const isRequester = request.requesterEmail?.toLowerCase() === currentUser.email.toLowerCase();

    // Verifica se a solicitação está pendente
    const isPending = request.status?.toLowerCase() === 'pendente';

    return isRequester && isPending;
  }

  /**
   * Navega para a página de edição da solicitação
   */
  editRequest(request: RequestItem): void {
    if (!this.canEditRequest(request)) {
      this.errorMessage = 'Você só pode editar suas próprias solicitações pendentes.';
      this.cdr.detectChanges();
      setTimeout(() => {
        this.errorMessage = '';
        this.cdr.detectChanges();
      }, 3000);
      return;
    }

    this.router.navigate(['/rdm-edit', request.ticket]);
  }

  /**
   * Navega para página de detalhes da requisição
   */
  viewRequest(request: RequestItem): void {
    const isAdmin = this.authService.isAdmin();

    if (isAdmin) {
      this.router.navigate(['/admin/rdm', request.ticket]);
    } else {
      this.router.navigate(['/rdm-details', request.ticket]);
    }
  }

  // ==================== MÉTODOS EXISTENTES ====================

  applyFilters(): void {
    if (!this.requests || this.requests.length === 0) {
      this.filteredRequests = [];
      this.totalItems = 0;
      this.totalPages = 0;
      return;
    }

    let filtered = [...this.requests];

    if (this.searchTerm.trim()) {
      const searchTermLower = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(request => {
        const ticketMatch = request.ticket?.toLowerCase().includes(searchTermLower);
        const titleMatch = request.title?.toLowerCase().includes(searchTermLower);
        return ticketMatch || titleMatch;
      });
    }

    if (this.statusFilter) {
      filtered = filtered.filter(request => {
        const requestStatus = request.status?.toLowerCase() || '';
        return requestStatus === this.statusFilter.toLowerCase();
      });
    }

    this.filteredRequests = filtered;
    this.totalItems = filtered.length;
    this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.pageSize));

    if (this.currentPage > this.totalPages) {
      this.currentPage = 1;
    }

    this.cdr.detectChanges();
  }

  onSearch(): void {
    this.searchSubject.next(this.searchTerm);
  }

  onStatusChange(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = '';
    this.filteredRequests = [...this.requests];
    this.totalItems = this.totalItemsOriginal;
    this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.pageSize));
    this.currentPage = 1;
    this.cdr.detectChanges();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.applyFilters();
  }

  private loadFromStaticCache(page: number): void {
    const cachedRequests = RequestsTableComponent.requestsCache.get(page);
    const cachedPagination = RequestsTableComponent.paginationCache.get(page);

    if (cachedRequests) {
      this.requests = [...cachedRequests];
      this.filteredRequests = [...cachedRequests];
      this.currentPage = page;
      RequestsTableComponent.lastLoadedPage = page;

      if (cachedPagination) {
        this.updatePagination(cachedPagination);
      }

      this.totalItemsOriginal = this.totalItems;
      this.cdr.detectChanges();
    } else {
      this.loadRequests(page, false);
    }
  }

  loadRequests(page?: number, forceRefresh = false): void {
    if (page !== undefined && page !== this.currentPage) {
      this.currentPage = page;
    }

    const token = this.authService.getToken();
    if (!token) {
      this.errorMessage = 'Você precisa estar logado para visualizar as solicitações.';
      this.cdr.detectChanges();
      return;
    }

    if (this.isLoading && !forceRefresh) {
      return;
    }

    if (!forceRefresh && RequestsTableComponent.requestsCache.has(this.currentPage)) {
      this.loadFromStaticCache(this.currentPage);
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.requests = [];
    this.filteredRequests = [];

    const headers = this.createHeaders(token);
    const rdmLoggedUserUrl = buildApiUrl(API_PATHS.RDM_LOGGED_USER);
    const url = `${rdmLoggedUserUrl}?PageNumber=${this.currentPage}&PageSize=${this.pageSize}`;

    this.http.get<any>(url, {
      headers,
      observe: 'response'
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        this.handleSuccessResponse(response);
      },
      error: (error: HttpErrorResponse) => {
        this.handleErrorResponse(error);
      }
    });
  }

  getStatusLabel(status?: string): string {
    if (!status) return 'Não informado';

    const statusMap: Record<string, string> = {
      'pendente': 'Pendente',
      'aprovado': 'Aprovado',
      'reprovado': 'Reprovado',
    };

    return statusMap[status.toLowerCase()] || status;
  }

  formatDate(dateString?: string): string {
    if (!dateString) return 'Não informado';

    if (/^\d{2}-\d{2}-\d{4} \d{2}:\d{2}$/.test(dateString)) {
      const [datePart, timePart] = dateString.split(' ');
      const [dayStr, monthStr, yearStr] = datePart.split('-');
      const [hourStr, minuteStr] = timePart.split(':');

      const day = parseInt(dayStr, 10);
      const month = parseInt(monthStr, 10) - 1;
      const year = parseInt(yearStr, 10);
      let hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);

      hour = hour - 3;

      const adjustedDate = new Date(year, month, day, hour, minute);

      const formattedDay = adjustedDate.getDate().toString().padStart(2, '0');
      const formattedMonth = (adjustedDate.getMonth() + 1).toString().padStart(2, '0');
      const formattedYear = adjustedDate.getFullYear();
      const formattedHour = adjustedDate.getHours().toString().padStart(2, '0');
      const formattedMinute = adjustedDate.getMinutes().toString().padStart(2, '0');

      return `${formattedDay}/${formattedMonth}/${formattedYear} ${formattedHour}:${formattedMinute}`;
    }

    return dateString;
  }

  private handleSuccessResponse(response: any): void {
    this.isLoading = false;

    let responseData: any[] = [];

    if (Array.isArray(response.body)) {
      responseData = response.body;
    } else if (response.body && typeof response.body === 'object') {
      if (response.body.rdms && Array.isArray(response.body.rdms)) {
        responseData = response.body.rdms;
      }
    }

    this.requests = responseData.map((item: any) => ({
      ticket: item.ticket || item.Ticket || '',
      name: item.name || item.Name || '',
      title: item.title || item.Title || '',
      date: item.date || item.Date || '',
      status: item.status || item.Status || '',
      createdAt: item.createdAt || item.date || item.Date || '',
      area: item.area || item.Area || '',
      problemDescription: item.problemDescription || item.problemJustification || '',
      type: item.type,
      impact: item.impact,
      urgency: item.urgency,
      objectiveOrSolution: item.objectiveOrSolution || '',
      requesterEmail: item.email || item.requesterEmail || '',
      department: item.department || '',
      priority: item.priority || '',
      typeString: item.typeString || '',
      approvedDate: item.approvedDate || '',
      approvedBy: item.approvedBy || '',
      rejectedDate: item.rejectedDate || '',
      rejectedBy: item.rejectedBy || '',
      rejectionReason: item.rejectionReason || ''
    }));

    this.filteredRequests = [...this.requests];
    RequestsTableComponent.requestsCache.set(this.currentPage, [...this.requests]);
    RequestsTableComponent.lastLoadedPage = this.currentPage;
    this.processPagination(response, responseData.length);
    this.totalItemsOriginal = this.totalItems;
    this.cdr.detectChanges();
  }

  private processPagination(response: any, dataLength: number): void {
    const paginationHeader = response.headers.get('Pagination');

    if (paginationHeader) {
      try {
        const pagination: PaginationMetadata = JSON.parse(paginationHeader);
        this.updatePagination(pagination);
        RequestsTableComponent.paginationCache.set(this.currentPage, { ...pagination });
        return;
      } catch {
        // Fallback para cálculo manual
      }
    }

    this.calculatePaginationFromData(dataLength);
  }

  private calculatePaginationFromData(dataLength: number): void {
    this.totalItems = dataLength;
    this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.pageSize));

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
  }

  private updatePagination(pagination: PaginationMetadata): void {
    this.currentPage = pagination.currentPage || this.currentPage;
    this.pageSize = pagination.itemsPerPage || this.pageSize;
    this.totalItems = pagination.totalItems || 0;
    this.totalPages = pagination.totalPages || 0;
  }

  private handleErrorResponse(error: HttpErrorResponse): void {
    this.isLoading = false;

    const errorMessages: Record<number, string> = {
      401: 'Sessão expirada. Por favor, faça login novamente.',
      403: 'Você não tem permissão para visualizar estas solicitações.',
      404: 'Nenhuma solicitação encontrada para seu usuário.',
      500: 'Erro no servidor. Tente novamente mais tarde.',
      0: 'Não foi possível conectar ao servidor. Verifique sua conexão.',
    };

    this.errorMessage = errorMessages[error.status] ||
                       `Erro ${error.status || 'desconhecido'}: Não foi possível carregar as solicitações`;

    this.cdr.detectChanges();
  }

  downloadPDF(request: RequestItem): void {
    const token = this.authService.getToken();
    if (!token) {
      this.downloadError = 'Token não encontrado! Faça login novamente.';
      this.cdr.detectChanges();
      return;
    }

    this.downloadingPDF = true;
    this.downloadError = '';
    this.cdr.detectChanges();

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/pdf'
    });

    const reportUrl = buildApiUrl(API_PATHS.REPORT_BY_TICKET(request.ticket));
    this.http.get(reportUrl, {
      headers,
      responseType: 'blob',
      observe: 'response'
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        this.downloadingPDF = false;

        const contentType = response.headers.get('Content-Type');
        if (contentType !== 'application/pdf') {
          this.downloadError = 'O arquivo não está disponível no formato PDF.';
          this.cdr.detectChanges();
          return;
        }

        const blob = response.body as Blob;
        let filename = `RDM-${request.ticket}.pdf`;
        const contentDisposition = response.headers.get('Content-Disposition');

        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename\*?=["']?([^"']+)["']?/i);
          if (filenameMatch && filenameMatch[1]) {
            if (filenameMatch[1].includes("UTF-8''")) {
              filename = decodeURIComponent(filenameMatch[1].split("UTF-8''")[1]);
            } else {
              filename = filenameMatch[1];
            }
          }
        }

        this.savePDF(blob, filename);
        this.cdr.detectChanges();
      },
      error: (error: HttpErrorResponse) => {
        this.downloadingPDF = false;
        this.handlePDFError(error);
        this.cdr.detectChanges();
      }
    });
  }

  private handlePDFError(error: HttpErrorResponse): void {
    const errorMessages: Record<number, string> = {
      401: 'Sessão expirada. Faça login novamente.',
      403: 'Você não tem permissão para baixar este PDF.',
      404: 'PDF não encontrado para esta solicitação.',
      500: 'Erro no servidor ao gerar o PDF.',
      0: 'Não foi possível conectar ao servidor. Verifique sua conexão.',
    };

    this.downloadError = errorMessages[error.status] ||
                        'Erro ao baixar o PDF. Tente novamente mais tarde.';
  }

  private savePDF(blob: Blob, filename: string): void {
    if (!blob || blob.size === 0) {
      this.downloadError = 'O PDF está vazio ou corrompido.';
      return;
    }

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;

    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }, 100);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }

    this.currentPage = page;
    RequestsTableComponent.lastLoadedPage = page;
    this.requests = [];
    this.filteredRequests = [];
    this.loadRequests(page, false);
    this.scrollToTop();
  }

  nextPage(): void {
    if (this.hasNextPage()) {
      this.goToPage(this.currentPage + 1);
    }
  }

  previousPage(): void {
    if (this.hasPreviousPage()) {
      this.goToPage(this.currentPage - 1);
    }
  }

  hasNextPage(): boolean {
    return this.currentPage < this.totalPages;
  }

  hasPreviousPage(): boolean {
    return this.currentPage > 1;
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;

    let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  refreshRequests(): void {
    RequestsTableComponent.requestsCache.delete(this.currentPage);
    RequestsTableComponent.paginationCache.delete(this.currentPage);
    this.loadRequests(this.currentPage, true);
  }

  private createHeaders(token: string): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    });
  }

  private scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  getStatusClass(status?: string): string {
    if (!status) return '';

    const statusMap: Record<string, string> = {
      'pendente': 'status-pendente',
      'aprovado': 'status-aprovado',
      'reprovado': 'status-reprovado',
    };

    return statusMap[status.toLowerCase()] || '';
  }

  static clearCache(): void {
    RequestsTableComponent.requestsCache.clear();
    RequestsTableComponent.paginationCache.clear();
    RequestsTableComponent.lastLoadedPage = 1;
  }

  // Getters para template
  get hasRequests(): boolean {
    return this.filteredRequests.length > 0;
  }

  get isEmpty(): boolean {
    return !this.isLoading && !this.hasRequests && !this.errorMessage;
  }

  get showPagination(): boolean {
    return this.totalPages > 1;
  }

  getItemRange(): string {
    if (!this.hasRequests) return '0-0 de 0';

    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, this.totalItems);
    return `${start}-${end} de ${this.totalItems}`;
  }
}
