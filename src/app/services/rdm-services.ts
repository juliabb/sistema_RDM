// src/app/services/rdm-services.ts
import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpHeaders,
  HttpParams,
  HttpResponse,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { AuthService } from './auth-services';
import { buildApiUrl, API_PATHS } from '../config/api.config';
import {
  RDM,
  RDMDetails,
  ApproveRDMRequest,
  RDMList,
  RDMSearchParams,
  RDMPagedResult,
} from '../models/rdm-models';

@Injectable({
  providedIn: 'root',
})
export class RdmService {
  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {}

  /**
   * Cria headers HTTP com token de autenticação
   * @throws Error se token não estiver disponível
   */
  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    if (!token) {
      throw new Error('Token de autenticação não encontrado');
    }
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
  }

  /**
   * Busca RDMs com status pendente (para administradores)
   * @param page Número da página
   * @param pageSize Tamanho da página
   * @returns Lista de RDMs pendentes
   */
  getPendingRDM(page: number = 1, pageSize: number = 10): Observable<RDM[]> {
    const headers = this.getHeaders();
    const params = new HttpParams()
      .set('PageNumber', page.toString())
      .set('PageSize', pageSize.toString());

    const url = buildApiUrl(API_PATHS.ADMIN_RDM_PENDING);

    return this.http.get<RDM[]>(url, { headers, params }).pipe(
      catchError(() => {
        return of([]); // Retorna array vazio em caso de erro
      }),
    );
  }

  /**
   * Busca informações resumidas de um RDM específico (apenas status)
   * @param ticketId ID do ticket do RDM
   * @returns Objeto contendo status do RDM
   */
  getRDMShortInfo(ticketId: string): Observable<{ status: string }> {
    const headers = this.getHeaders();
    const url = buildApiUrl(API_PATHS.RDM_SHORT(ticketId));

    return this.http.get<{ status: string }>(url, { headers }).pipe(
      catchError(() => {
        // Fallback: Retorna status padrão em caso de erro
        return of({ status: 'Pendente' });
      }),
    );
  }

  /**
   * Busca todas as RDMs com filtros, paginação e ordenação
   * @param params Parâmetros de busca, filtragem e paginação
   * @returns Resultado paginado de RDMs
   */
  getAllRDM(params: RDMSearchParams = {}): Observable<RDMPagedResult> {
    const headers = this.getHeaders();
    let httpParams = new HttpParams();

    // Configura parâmetros de paginação
    if (params.page) {
      httpParams = httpParams.set('PageNumber', params.page.toString());
    }
    if (params.pageSize) {
      httpParams = httpParams.set('PageSize', params.pageSize.toString());
    }

    const url = buildApiUrl(API_PATHS.ADMIN_GET_ALL_USERS);

    return this.http.get<any[]>(url, { headers, params: httpParams }).pipe(
      map((response) => {
        if (!Array.isArray(response)) {
          return this.createEmptyPagedResult(params);
        }

        try {
          const allRDM = this.transformAllUsersResponse(response);
          const filteredRDM = this.applyRDMFilters(allRDM, params);
          const sortedRDM = this.sortRDM(filteredRDM, params.sortBy, params.sortOrder);

          return this.createPagedResult(sortedRDM, params.page || 1, params.pageSize || 10);
        } catch {
          return this.createEmptyPagedResult(params);
        }
      }),
      catchError(() => {
        return of(this.createEmptyPagedResult(params));
      }),
    );
  }

  /**
   * Atualiza status de um RDM (aprovação/rejeição)
   * @param ticketId ID do ticket do RDM
   * @param data Dados de atualização de status
   * @returns Observable com resposta da operação
   */
  updateRDMStatus(ticketId: string, data: ApproveRDMRequest): Observable<any> {
    const headers = this.getHeaders();
    const url = buildApiUrl(API_PATHS.ADMIN_RDM_APPROVE(ticketId));

    // Normaliza status para formato esperado pela API
    const normalizedData = {
      status: this.normalizeStatusForAPI(data.status),
      subject: data.subject || '',
    };

    return this.http
      .put(url, normalizedData, {
        headers,
        observe: 'response',
      })
      .pipe(
        map((response: HttpResponse<any>) => {
          // Retorna o corpo da resposta ou um objeto vazio se for 204 No Content
          return response.body || { success: true, statusCode: response.status };
        }),
        catchError((error: HttpErrorResponse) => {
          // Se for erro 500 (relacionado a anexos) abordagem diferente
          if (
            error.status === 500 &&
            error.error &&
            error.error.includes('GetAttachmentsUseCase')
          ) {
            // Tentativa alternativa: não chamar o serviço de anexos
            return throwError(
              () => new Error('Erro no backend ao processar anexos. Contate o administrador.'),
            );
          }

          // Re-lança o erro para tratamento no componente
          return throwError(() => error);
        }),
      );
  }

  /**
   * Normaliza texto do status para formato esperado pela API
   * @param status Status textual a ser normalizado
   * @returns Status no formato padrão da API
   */
  private normalizeStatusForAPI(status: string): string {
    const statusLower = status.toLowerCase();

    if (
      statusLower.includes('aprovado') ||
      statusLower.includes('aprovada') ||
      statusLower.includes('approved')
    ) {
      return 'Aprovado';
    }
    if (
      statusLower.includes('rejeitado') ||
      statusLower.includes('rejeitada') ||
      statusLower.includes('reprovado') ||
      statusLower.includes('reprovada') ||
      statusLower.includes('rejected')
    ) {
      return 'Reprovado';
    }
    if (statusLower.includes('pendente') || statusLower.includes('pending')) {
      return 'Pendente';
    }

    return status;
  }

  /**
   * Busca detalhes completos de um RDM por ID
   * @param ticketId ID do ticket do RDM
   * @returns Detalhes completos do RDM
   */
  getRDMById(ticketId: string): Observable<any> {
    const headers = this.getHeaders();

    return this.http.get<any>(buildApiUrl(API_PATHS.RDM_BY_ID(ticketId)), { headers }).pipe(
      switchMap((details) => {
        // Busca também informações resumidas para status atualizado
        return this.http.get<any>(buildApiUrl(API_PATHS.RDM_SHORT(ticketId)), { headers }).pipe(
          map((shortInfo) => {
            return {
              ...details,
              status: shortInfo.status || 'Pendente',
            };
          }),
        );
      }),
    );
  }

  /**
   * Download do relatório PDF de um RDM
   * @param ticketId ID do ticket do RDM
   * @returns Blob contendo o PDF
   */
  downloadRDMReport(ticketId: string): Observable<Blob> {
    const headers = this.getHeaders().set('Accept', 'application/pdf');
    const url = buildApiUrl(API_PATHS.REPORT_BY_TICKET(ticketId));

    return this.http
      .get(url, {
        headers,
        responseType: 'blob',
      })
      .pipe(
        catchError(() => {
          // Retorna blob vazio em caso de erro
          return of(new Blob());
        }),
      );
  }

  /**
   * Download do anexo de um RDM
   * @param ticketId ID do ticket do RDM
   * @returns Observable com o blob do anexo
   */
  downloadAttachment(ticketId: string): Observable<Blob> {
    const headers = this.getHeaders();
    const url = buildApiUrl(API_PATHS.RDM_ATTACHMENTS(ticketId));

    return this.http
      .get(url, {
        headers,
        responseType: 'blob',
      })
      .pipe(
        catchError((error) => {
          return throwError(() => error);
        }),
      );
  }
  /**
   * Verifica se existe anexo para um RDM
   * @param ticketId ID do ticket do RDM
   * @returns Observable com boolean indicando se existe anexo
   */
  checkAttachmentExists(ticketId: string): Observable<boolean> {
    const headers = this.getHeaders();
    const url = buildApiUrl(API_PATHS.RDM_ATTACHMENTS(ticketId));

    // Usamos GET com observe: 'response' para verificar sem baixar o arquivo completo
    return this.http
      .get(url, {
        headers,
        observe: 'response',
        responseType: 'blob', // Importante: responseType blob para não tentar parsear como JSON
      })
      .pipe(
        map((response) => {
          // Se a resposta for OK, existe anexo
          return response.status === 200;
        }),
        catchError((error) => {
          // Se for 404, não existe anexo
          if (error.status === 404) {
            return of(false);
          }

          return of(false);
        }),
      );
  }
  /**
   * Transforma resposta da API em formato padronizado para listagem
   * @param apiData Dados brutos da API
   * @returns Lista padronizada de RDMs
   */
  private transformAllUsersResponse(apiData: any[]): RDMList[] {
    if (!apiData || apiData.length === 0) {
      return [];
    }

    return apiData.map((item) => {
      let status = item.status || 'Pendente';
      if (typeof status === 'string') {
        status = this.normalizeStatus(status);
      }

      return {
        ticket: item.ticket || `RDM-${Date.now()}`,
        name: item.name || 'Não informado',
        title: item.title || 'Sem título',
        date: item.date || item.createdAt || new Date().toISOString(),
        status: status,
        department: item.department || item.department || 'Não especificado',
        priority: item.priority || 'Média',
        type: item.type || item.identification?.type || 'Não especificado',
        area: item.area || 'Não especificado',
        approvedDate: item.approvedDate || item.approvedAt,
        approvedBy: item.approvedBy,
        requesterEmail: item.email || item.requesterEmail || '',
        createdAt: item.createdAt || item.date,
        rejectedDate: item.rejectedDate || item.rejectedAt,
        rejectedBy: item.rejectedBy,
        rejectionReason: item.rejectionReason || item.subject || '',
      };
    });
  }

  /**
   * Normaliza status para exibição consistente na interface
   * @param status Status textual
   * @returns Status normalizado
   */
  private normalizeStatus(status: string): string {
    const statusLower = status.toLowerCase();

    if (
      statusLower.includes('aprovado') ||
      statusLower.includes('approved') ||
      statusLower.includes('aprovada')
    ) {
      return 'Aprovada';
    }
    if (
      statusLower.includes('rejeitado') ||
      statusLower.includes('rejected') ||
      statusLower.includes('rejeitada')
    ) {
      return 'Reprovado';
    }
    if (statusLower.includes('pendente') || statusLower.includes('pending')) {
      return 'Pendente';
    }
    if (
      statusLower.includes('concluído') ||
      statusLower.includes('concluida') ||
      statusLower.includes('completed')
    ) {
      return 'Concluída';
    }
    if (statusLower.includes('em análise') || statusLower.includes('analysis')) {
      return 'Em Análise';
    }
    if (
      statusLower.includes('cancelado') ||
      statusLower.includes('cancelada') ||
      statusLower.includes('cancelled')
    ) {
      return 'Cancelada';
    }

    return status;
  }

  /**
   * Aplica filtros à lista de RDMs
   * @param rdmList Lista de RDMs a filtrar
   * @param params Parâmetros de filtragem
   * @returns Lista filtrada de RDMs
   */
  private applyRDMFilters(rdmList: RDMList[], params: RDMSearchParams): RDMList[] {
    let filtered = [...rdmList];

    // Filtro de busca geral
    if (params.search) {
      const searchTerm = params.search.toLowerCase();
      filtered = filtered.filter((rdm) => {
        return (
          (rdm.ticket && rdm.ticket.toLowerCase().includes(searchTerm)) ||
          (rdm.name && rdm.name.toLowerCase().includes(searchTerm)) ||
          (rdm.title && rdm.title.toLowerCase().includes(searchTerm)) ||
          (rdm.department && rdm.department.toLowerCase().includes(searchTerm)) ||
          (rdm.approvedBy && rdm.approvedBy.toLowerCase().includes(searchTerm))
        );
      });
    }

    // Filtro por status
    if (params.status && params.status.trim() !== '') {
      filtered = filtered.filter(
        (rdm) => rdm.status && rdm.status.toLowerCase() === params.status?.toLowerCase(),
      );
    }

    // Filtro por departamento
    if (params.department && params.department.trim() !== '') {
      filtered = filtered.filter(
        (rdm) =>
          rdm.department && rdm.department.toLowerCase() === params.department?.toLowerCase(),
      );
    }

    // Filtro por data
    if (params.dateFrom || params.dateTo) {
      filtered = filtered.filter((rdm) => {
        if (!rdm.date) return false;

        const rdmDate = new Date(rdm.date);
        if (isNaN(rdmDate.getTime())) return false;

        let isValid = true;

        if (params.dateFrom) {
          const fromDate = new Date(params.dateFrom);
          fromDate.setHours(0, 0, 0, 0);
          isValid = isValid && rdmDate >= fromDate;
        }

        if (params.dateTo) {
          const toDate = new Date(params.dateTo);
          toDate.setHours(23, 59, 59, 999);
          isValid = isValid && rdmDate <= toDate;
        }

        return isValid;
      });
    }

    return filtered;
  }

  /**
   * Ordena lista de RDMs por campo específico
   * @param rdmList Lista de RDMs a ordenar
   * @param sortBy Campo para ordenação
   * @param sortOrder Direção da ordenação (asc/desc)
   * @returns Lista ordenada de RDMs
   */
  private sortRDM(
    rdmList: RDMList[],
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'desc',
  ): RDMList[] {
    if (!sortBy || rdmList.length === 0) return rdmList;

    return [...rdmList].sort((a, b) => {
      let valueA: any = a[sortBy as keyof RDMList];
      let valueB: any = b[sortBy as keyof RDMList];

      // Tratamento de valores nulos
      if (valueA == null && valueB == null) return 0;
      if (valueA == null) return sortOrder === 'asc' ? -1 : 1;
      if (valueB == null) return sortOrder === 'asc' ? 1 : -1;

      // Conversão especial para campos de data
      if (sortBy.includes('date') || sortBy.includes('Date')) {
        try {
          const dateA = new Date(valueA).getTime();
          const dateB = new Date(valueB).getTime();

          if (isNaN(dateA) && isNaN(dateB)) return 0;
          if (isNaN(dateA)) return sortOrder === 'asc' ? -1 : 1;
          if (isNaN(dateB)) return sortOrder === 'asc' ? 1 : -1;

          valueA = dateA;
          valueB = dateB;
        } catch {
          // Em caso de erro, mantém como string
        }
      }

      // Conversão para string para comparação não-numérica
      if (typeof valueA !== 'number' && typeof valueB !== 'number') {
        valueA = String(valueA).toLowerCase();
        valueB = String(valueB).toLowerCase();
      }

      if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }

  /**
   * Cria estrutura paginada de resultados
   * @param items Itens completos
   * @param page Página atual
   * @param pageSize Tamanho da página
   * @returns Resultado paginado
   */
  private createPagedResult(items: RDMList[], page: number, pageSize: number): RDMPagedResult {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pagedItems = items.slice(startIndex, endIndex);

    return {
      items: pagedItems,
      totalCount: items.length,
      page: page,
      pageSize: pageSize,
      totalPages: Math.ceil(items.length / pageSize),
    };
  }

  /**
   * Cria resultado paginado vazio
   * @param params Parâmetros originais
   * @returns Resultado paginado vazio
   */
  private createEmptyPagedResult(params: RDMSearchParams): RDMPagedResult {
    return {
      items: [],
      totalCount: 0,
      page: params.page || 1,
      pageSize: params.pageSize || 10,
      totalPages: 0,
    };
  }

  /**
   * Busca RDM com dados completos para usuários normais
   * Combina endpoint de detalhes com endpoint de metadados para obter a data de criação
   * @param ticketId ID do ticket do RDM
   * @returns Detalhes do RDM com dados de múltiplas fontes
   */
  getRDMWithDate(ticketId: string): Observable<any> {
    const token = this.authService.getToken();
    if (!token) {
      return throwError(() => new Error('Token de autenticação não encontrado'));
    }

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });

    // Primeiro busca os detalhes completos
    return this.http.get<any>(buildApiUrl(API_PATHS.RDM_BY_ID(ticketId)), { headers }).pipe(
      switchMap((details) => {
        // Depois busca os dados curtos para obter a DATA
        const shortUrl = buildApiUrl(API_PATHS.RDM_SHORT(ticketId));

        return this.http.get<any>(shortUrl, { headers }).pipe(
          map((shortData) => {
            return {
              // Dados detalhados
              ...details,

              // Dados do ticket-short (incluindo DATA)
              ticket: ticketId,
              name: shortData.name || 'Usuário',
              title: details.identification?.title || shortData.title || 'Sem título',
              status: shortData.status || details.status || 'Pendente',

              // **A DATA DE CRIAÇÃO VEM AQUI**:
              date: shortData.date, // "17-01-2026 00:46" (formato UTC)
              dateRequest: shortData.date,
              createdAt: shortData.date,
            };
          }),
          catchError(() => {
            // Fallback se endpoint de metadados falhar
            return of({
              ...details,
              ticket: ticketId,
              name: 'Usuário',
              title: details.identification?.title || 'Sem título',
              status: details.status || 'Pendente',
              date: null,
              dateRequest: null,
              createdAt: null,
            });
          }),
        );
      }),
      catchError((error) => {
        return throwError(() => error);
      }),
    );
  }

  /**
   * Busca RDM para administradores com acesso completo
   * O endpoint admin retorna os dados completos, mas a data está em identification.dateCreated
   * @param ticketId ID do ticket do RDM
   * @returns Detalhes completos do RDM com data de criação
   */
  getRDMForAdmin(ticketId: string): Observable<any> {
    const headers = this.getHeaders();

    // Busca dados detalhados do endpoint de admin
    const detailsUrl = buildApiUrl(API_PATHS.ADMIN_GET_TICKET_ALLUSERS(ticketId));

    return this.http.get<any>(detailsUrl, { headers }).pipe(
      switchMap((details) => {
        // NOTA: A data de criação está em identification.dateCreated no formato "DD-MM-YYYY HH:mm" (UTC)
        let creationDate = details.identification?.dateCreated; // Ex: "18-01-2026 00:50"

        // Se não tiver a data em identification.dateCreated, busca do ticket-short como fallback
        if (!creationDate) {
          const shortUrl = buildApiUrl(API_PATHS.RDM_SHORT(ticketId));
          return this.http.get<any>(shortUrl, { headers }).pipe(
            map((shortData) => {
              return this.formatAdminResponse(details, ticketId, shortData.date);
            }),
            catchError(() => {
              // Fallback para data atual formatada no mesmo padrão
              const now = new Date();
              const fallbackDate = `${now
                .getDate()
                .toString()
                .padStart(
                  2,
                  '0',
                )}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()} ${now
                .getHours()
                .toString()
                .padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
              return of(this.formatAdminResponse(details, ticketId, fallbackDate));
            }),
          );
        } else {
          return of(this.formatAdminResponse(details, ticketId, creationDate));
        }
      }),
      catchError((error) => {
        return throwError(() => error);
      }),
    );
  }

  /**
   * Formata a resposta do admin para o formato esperado pelo componente
   * @param details Dados detalhados do endpoint admin
   * @param ticketId ID do ticket
   * @param dateFromAPI Data de criação no formato "DD-MM-YYYY HH:mm" (UTC)
   * @returns Dados formatados para o template
   */
  private formatAdminResponse(details: any, ticketId: string, dateFromAPI: string | null): any {
    // Extrai o nome do solicitante - O nome está em identification.name
    const userName = details.identification?.name || details.name || 'Não informado';

    // A data vem do identification.dateCreated ou do parâmetro
    const creationDate =
      dateFromAPI || details.identification?.dateCreated || details.dateRequest || details.date;

    // Garante que a data está no formato correto para o frontend
    let formattedDate = creationDate;
    if (creationDate && creationDate.includes('-') && !creationDate.includes('T')) {
      // Já está no formato "DD-MM-YYYY HH:mm" que o frontend espera
      formattedDate = creationDate;
    }

    return {
      // Dados detalhados do formulário
      ...details,

      // Dados principais para o cabeçalho
      ticket: ticketId,
      name: userName,
      userName: userName,
      title: details.identification?.title || 'Sem título',
      status: details.status || 'Pendente',

      // **A DATA DE CRIAÇÃO VEM AQUI NO FORMATO CORRETO**:
      date: formattedDate, // "18-01-2026 00:50" (UTC)
      dateRequest: formattedDate,
      createdAt: formattedDate,

      // Estrutura completa para o template (garante que identification existe)
      identification: details.identification || {},
      solution: details.solution || {},
      category: details.category || {},
      impactCategory: details.impactCategory || {},
      deploymentWindow: details.deploymentWindow || {},
      planComunication: details.planComunication || {},
      phases: details.phases || {},
      planningExecutation: details.planningExecutation || {},
      planningRemediation: details.planningRemediation || {},
    };
  }

  /**
   * Extrai data da resposta do endpoint de admin (método legado)
   */
  private extractDateFromAdminResponse(details: any): string {
    // Prioridade 1: Extrair data do título
    if (details.identification?.title) {
      const dateFromTitle = this.extractDateFromTitle(details.identification.title);
      if (dateFromTitle) {
        return dateFromTitle;
      }
    }

    // Prioridade 2: Campo 'date' direto
    if (details.date) return details.date;

    // Prioridade 3: Campo 'createdAt'
    if (details.createdAt) return details.createdAt;

    // Prioridade 4: Data das fases
    if (details.phases?.execute?.startDate) return details.phases.execute.startDate;

    // Prioridade 5: Outras fontes
    if (details.phases?.planning?.startDate) return details.phases.planning.startDate;
    if (details.deploymentWindow?.startTime) return details.deploymentWindow.startTime;

    // Prioridade 6: Data atual como fallback
    return new Date().toISOString();
  }

  /**
   * Extrai data do título no formato "DD/MM/AAAA-HH:mm"
   * (Método auxiliar para uso em outros contextos)
   */
  private extractDateFromTitle(title: string): string | null {
    if (!title) return null;

    const cleanTitle = title.trim();

    // Tenta padrão "DD/MM/AAAA-HH:mm"
    const pattern1 = /(\d{2})\/(\d{2})\/(\d{4})-(\d{2}):(\d{2})/;
    const match1 = cleanTitle.match(pattern1);

    if (match1) {
      const [, day, month, year, hour, minute] = match1;
      return `${year}-${month}-${day}T${hour}:${minute}:00`;
    }

    // Tenta padrão "DD/MM/AAAA HH:mm"
    const pattern2 = /(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})/;
    const match2 = cleanTitle.match(pattern2);

    if (match2) {
      const [, day, month, year, hour, minute] = match2;
      return `${year}-${month}-${day}T${hour}:${minute}:00`;
    }

    return null;
  }
}
