// src/app/services/rdm-validation.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from './auth-service';
import { buildApiUrl, API_PATHS } from '../config/api.config';

export interface ValidationItem {
  ticket: string;
  name: string;
  title: string;
  date: string; // "DD-MM-YYYY HH:mm"
  status: string; // "No prazo" ou "Vencido" (vindo da API)
  result: string; // "Aberto", "cancelada", "sucesso", "sem-sucesso", "com-ressalva"
  reviewer: string;
  resultsDescription: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class RdmValidationService {
  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getValidations(pageNumber: number, pageSize: number): Observable<PaginatedResponse<ValidationItem>> {
    const token = this.authService.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    const url = buildApiUrl(API_PATHS.ADMIN_RDM_VALIDATION);
    return this.http.get<ValidationItem[]>(url, {
      headers,
      params: { PageNumber: pageNumber.toString(), PageSize: pageSize.toString() },
      observe: 'response'
    }).pipe(
      map((response: HttpResponse<ValidationItem[]>) => {
        const paginationHeader = response.headers.get('Pagination');
        let pagination = { currentPage: 1, itemsPerPage: 10, totalItems: 0, totalPages: 1 };
        if (paginationHeader) {
          try {
            pagination = JSON.parse(paginationHeader);
          } catch (e) {
            console.error('Erro ao fazer parse do header Pagination', e);
          }
        }
        return {
          items: response.body || [],
          currentPage: pagination.currentPage,
          itemsPerPage: pagination.itemsPerPage,
          totalItems: pagination.totalItems,
          totalPages: pagination.totalPages
        };
      })
    );
  }

  updateResult(ticket: string, result: string, resultsDescription: string): Observable<void> {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
    const url = buildApiUrl(API_PATHS.UPDATE_RESULT(ticket));

    return this.http.put<void>(url, { result, resultsDescription }, { headers });
  }
}
