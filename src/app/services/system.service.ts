// src/app/services/system.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL, API_PATHS, buildApiUrl } from '../config/api.config';

export interface SystemService {
  systemService: string;
  department: string;
  status: string;
}

export interface PaginationInfo {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}

@Injectable({
  providedIn: 'root',
})
export class SystemServiceApi {
  private baseUrl = API_BASE_URL;

  constructor(private http: HttpClient) {}

  getAllSystems(): Observable<SystemService[]> {
    return this.http.get<SystemService[]>(`${this.baseUrl}${API_PATHS.SYSTEM_GET_ALL}`);
  }

  getSystemsPaginated(
    page: number,
    pageSize: number,
    systemService: string = '',
    department: string = '',
    status: string = '',
  ): Observable<{ data: SystemService[]; pagination: PaginationInfo }> {
    let params = new HttpParams()
      .set('PageNumber', page.toString())
      .set('PageSize', pageSize.toString());

    if (systemService.trim()) {
      params = params.set('systemService', systemService.trim());
    }
    if (department.trim()) {
      params = params.set('department', department.trim());
    }
    if (status) {
      // 'Ativo' ou 'Inativo' enviados diretamente
      params = params.set('status', status);
    }

    return this.http
      .get<SystemService[]>(buildApiUrl(API_PATHS.SYSTEM_PAGINATION), {
        params,
        observe: 'response',
      })
      .pipe(
        map((response: HttpResponse<SystemService[]>) => {
          const body = response.body || [];
          const paginationHeader = response.headers.get('Pagination');
          let pagination: PaginationInfo = {
            currentPage: 1,
            itemsPerPage: 10,
            totalItems: body.length,
            totalPages: 1,
          };

          if (paginationHeader) {
            try {
              pagination = JSON.parse(paginationHeader);
            } catch (e) {
              console.warn('Header Pagination inválido', e);
            }
          }

          return { data: body, pagination };
        }),
      );
  }

  getSystemByName(name: string): Observable<SystemService> {
    return this.http.get<SystemService>(`${this.baseUrl}${API_PATHS.SYSTEM_GET_BY_NAME(name)}`);
  }

  createSystem(system: SystemService): Observable<SystemService> {
    return this.http.post<SystemService>(`${this.baseUrl}${API_PATHS.SYSTEM_CREATE}`, system);
  }

  updateSystem(originalName: string, system: SystemService): Observable<void> {
    const encodedName = encodeURIComponent(originalName);
    return this.http.put<void>(`${this.baseUrl}${API_PATHS.SYSTEM_UPDATE(encodedName)}`, system);
  }
}
