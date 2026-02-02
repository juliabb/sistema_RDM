// src/app/services/user-services.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { buildApiUrl, API_PATHS } from '../config/api.config';

export interface UserProfileData {
  name: string;
  email: string;
  department?: string;
  role?: string;
  lastName?: string;
}

export interface ChangePasswordRequest {
  password: string;    // Senha atual
  newPassword: string; // Nova senha
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  constructor(private http: HttpClient) {}

  // GET /api/User/get-profile - Perfil do usuário logado
  getUserProfile(): Observable<UserProfileData> {
    const url = buildApiUrl(API_PATHS.USER_PROFILE);
    return this.http.get<UserProfileData>(url)
      .pipe(
        catchError(this.handleError)
      );
  }

  // PUT /api/User - Atualizar perfil
  updateUserProfile(profileData: Partial<UserProfileData>): Observable<any> {
    const url = buildApiUrl(API_PATHS.USER_BASE);
    return this.http.put(url, profileData)
      .pipe(
        catchError(this.handleError)
      );
  }

  // PUT /api/User/change-password - Alterar senha
  changePassword(passwordData: ChangePasswordRequest): Observable<any> {
    const url = buildApiUrl(API_PATHS.USER_CHANGE_PASSWORD);
    return this.http.put(url, passwordData)
      .pipe(
        catchError(this.handleError)
      );
  }

  private handleError(error: any): Observable<never> {
    console.error(' Erro no UserService:', {
      status: error.status,
      message: error.message,
      url: error.url,
      error: error.error
    });

    let errorMessage = 'Erro ao processar solicitação';

    if (error.status === 401) {
      errorMessage = 'Sessão expirada. Faça login novamente.';
    } else if (error.status === 400) {
      // Extrai mensagens específicas da API
      const errorMessages = error.error?.errorMessages || [error.error?.detail];
      errorMessage = Array.isArray(errorMessages)
        ? errorMessages.join(', ')
        : errorMessages || 'Senha atual incorreta.';
    } else if (error.status === 404) {
      errorMessage = 'Recurso não encontrado.';
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return throwError(() => new Error(errorMessage));
  }
}
