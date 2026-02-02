// src/app/services/admin-services.ts
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { API_PATHS, buildApiUrl } from '../config/api.config';
import { AuthService } from './auth-services';

export interface PendingUser {
  name: string;
  email: string;
  situation: string;
}

export interface UserDetail {
  name: string;
  email: string;
  department?: string;
  situation: string;
  role: string;
}

interface AdminApiResponse {
  usersPending: PendingUser[];
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  // Método para obter dados administrativos (usuários pendentes)
  getAdminData(): Observable<any> {
    const token = this.authService.getToken();
    if (!token) {
      return throwError(() => new Error('Usuário não autenticado'));
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'accept': 'text/plain'
    });

    return this.http.get<AdminApiResponse>(
      buildApiUrl(API_PATHS.ADMIN_BASE),
      { headers }
    ).pipe(
      catchError(error => {
        console.error('Erro no AdminService.getAdminData:', error);
        return throwError(() => error);
      })
    );
  }

  // Método para obter detalhes de um usuário
  getUser(search: string): Observable<UserDetail> {
    const token = this.authService.getToken();
    if (!token) {
      return throwError(() => new Error('Usuário não autenticado'));
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'accept': 'text/plain'
    });

    return this.http.get<UserDetail>(
      buildApiUrl(API_PATHS.ADMIN_GET_USER(search)),
      { headers }
    ).pipe(
      catchError(error => {
        console.error('Erro no AdminService.getUser:', error);
        return throwError(() => error);
      })
    );
  }

  // Método para atualizar situação do usuário
  updateUserSituation(email: string, situation: string): Observable<any> {
    const token = this.authService.getToken();
    if (!token) {
      return throwError(() => new Error('Usuário não autenticado'));
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    const body = { situation };

    return this.http.put(
      buildApiUrl(API_PATHS.ADMIN_APPROVE_USER(email)),
      body,
      { headers, observe: 'response' }
    ).pipe(
      catchError(error => {
        console.error('Erro no AdminService.updateUserSituation:', error);
        return throwError(() => error);
      })
    );
  }

  // Método para resetar senha do usuário
  resetUserPassword(email: string, newPassword: string): Observable<any> {
    const token = this.authService.getToken();
    if (!token) {
      return throwError(() => new Error('Usuário não autenticado'));
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    const body = { newPassword };

    return this.http.put(
      buildApiUrl(API_PATHS.ADMIN_RESET_PASSWORD(email)),
      body,
      { headers, observe: 'response' }
    ).pipe(
      catchError(error => {
        console.error('Erro no AdminService.resetUserPassword:', error);
        return throwError(() => error);
      })
    );
  }

  // Método para alterar role do usuário
  changeUserRole(email: string, role: string): Observable<any> {
    const token = this.authService.getToken();
    if (!token) {
      return throwError(() => new Error('Usuário não autenticado'));
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    const body = { role };

    return this.http.put(
      buildApiUrl(API_PATHS.ADMIN_CHANGE_ROLE(email)),
      body,
      { headers, observe: 'response' }
    ).pipe(
      catchError(error => {
        console.error('Erro no AdminService.changeUserRole:', error);
        return throwError(() => error);
      })
    );
  }
}
