// src/app/interceptors/auth-interceptor.ts
import { Injectable, inject } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth-services';
import { isPublicEndpoint } from '../config/api.config';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Verificar se o endpoint é público
    if (this.isPublicEndpoint(req.url, req.method)) {
      return next.handle(req);
    }

    const token = this.authService.getToken();

    if (!token) {
      this.handleUnauthorized();
      return throwError(() => new Error('Token não encontrado'));
    }

    // Adicionar token ao header
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 || error.status === 403) {
          this.handleUnauthorized();
        }
        return throwError(() => error);
      })
    );
  }

  private isPublicEndpoint(url: string, method: string): boolean {
    return isPublicEndpoint(url, method);
  }

  private handleUnauthorized(): void {
    this.authService.clearAuth();

    // Salvar a URL atual para redirecionar após login
    const currentUrl = this.router.url;
    if (currentUrl && currentUrl !== '/' && !currentUrl.includes('/login')) {
      localStorage.setItem('redirectUrl', currentUrl);
    }

    // Navegar para login com parâmetro de sessão expirada
    this.router.navigate(['/'], {
      queryParams: { sessionExpired: 'true' },
    });
  }
}
