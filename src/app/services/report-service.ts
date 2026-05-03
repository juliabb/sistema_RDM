// src/app/services/report.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL, API_PATHS } from '../config/api.config';
import { AuthService } from './auth-service';

export interface RdmAmountReport {
  quantity: number;
  defaultQuantity: number;
  normalQuantity: number;
  emergencyRdmQuantity: number;
  approvedCount: number;
  rejectedCount: number;
  successfulExecutedCount: number;
  withoutSuccessExecutedCount: number;
  executedWithRemarksCount: number;
  canceledCount: number;
}

export interface SystemServiceQuantity {
  systemService: string;
  quantity: number;
}

@Injectable({
  providedIn: 'root',
})
export class ReportService {
  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {}

  /**
   * Obtém o relatório de quantidades de RDMs para o período informado.
   */
  getRdmAmountReport(startDate: string, endDate: string): Observable<RdmAmountReport> {
    const token = this.authService.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    const url = `${API_BASE_URL}${API_PATHS.ADMIN_RDM_REPORT(startDate, endDate)}`;
    return this.http.get<RdmAmountReport>(url, { headers });
  }

  getSystemServicesReport(startDate: string, endDate: string): Observable<SystemServiceQuantity[]> {
    const token = this.authService.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    const url = `${API_BASE_URL}${API_PATHS.ADMIN_SYSTEM_REPORT(startDate, endDate)}`;
    return this.http.get<SystemServiceQuantity[]>(url, { headers });
  }

  /**
   * Faz o download do relatório em Excel para o período informado.
   * @param startDate Data inicial no formato YYYY-MM-DD
   * @param endDate Data final no formato YYYY-MM-DD
   * @returns Observable com o blob do arquivo Excel
   */
  downloadExcel(startDate: string, endDate: string): Observable<Blob> {
    const token = this.authService.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    const url = `${API_BASE_URL}${API_PATHS.RDM_EXCEL(startDate, endDate)}`;

    return this.http.get(url, {
      headers,
      responseType: 'blob',
    });
  }

  // report-service.ts
  getSystemDetail(startDate: string, endDate: string, search: string): Observable<any> {
    const token = this.authService.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    const url = `${API_BASE_URL}/api/Admin/RDM/Services/${startDate}/${endDate}/${encodeURIComponent(search)}`;
    return this.http.get<any[]>(url, { headers });
  }
}
