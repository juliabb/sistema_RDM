import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from './auth-service';
import { buildApiUrl, API_PATHS } from '../config/api.config';

export interface Notification {
  id: number;
  ticket: string;
  title: string;
  message: string;
  requestId?: number;
  link?: string;
  read?: boolean;
  createdAt?: Date;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {}

  /**
   * Retorna headers com token de autenticação
   */
  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    if (!token) {
      // Em caso de não ter token, ainda retorna headers básicos (mas a API pode rejeitar)
      console.warn('Token não encontrado para requisição de notificações');
      return new HttpHeaders({ 'Content-Type': 'application/json' });
    }
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
  }

  /**
   * Busca todas as notificações não lidas do usuário logado
   */
  getNotifications(): Observable<Notification[]> {
    const headers = this.getHeaders();
    const url = buildApiUrl(API_PATHS.NOTIFICATION_BASE);

    return this.http.get<Notification[]>(url, { headers }).pipe(
      catchError((error) => {
        console.error('Erro ao buscar notificações:', error);
        return of([]);
      }),
    );
  }

  /**
   * Marca uma notificação específica como lida
   * @param id ID da notificação
   */
  markAsRead(id: number): Observable<void> {
    const headers = this.getHeaders();
    const url = buildApiUrl(API_PATHS.NOTIFICATION_MARK_READ(id));

    return this.http.put<void>(url, {}, { headers }).pipe(
      catchError((error) => {
        console.error(`Erro ao marcar notificação ${id} como lida:`, error);
        return of(void 0);
      }),
    );
  }

  /**
   * Marca múltiplas notificações como lidas (chamadas individuais em paralelo)
   * @param ids Array de IDs das notificações
   */
  markMultipleAsRead(ids: number[]): Observable<void> {
    if (!ids || ids.length === 0) {
      return of(void 0);
    }

    const requests = ids.map((id) => this.markAsRead(id));
    // Aguarda todas as chamadas terminarem, mas não se importa com resultados individuais
    return from(Promise.all(requests.map((req) => req.toPromise()))).pipe(
      map(() => void 0),
      catchError((error) => {
        console.error('Erro ao marcar múltiplas notificações como lidas:', error);
        return of(void 0);
      }),
    );
  }

  /**
   * Marca todas as notificações como lidas (se existir endpoint específico)
   * Caso não exista, você pode usar markMultipleAsRead com os IDs obtidos de getNotifications
   */
  markAllAsRead(): Observable<void> {
    // Opção 1: se tiver endpoint dedicado
    // const headers = this.getHeaders();
    // const url = buildApiUrl(API_PATHS.NOTIFICATION_MARK_ALL_READ);
    // return this.http.put<void>(url, {}, { headers }).pipe(...)

    // Opção 2: buscar todas e marcar uma por uma (implementação alternativa)
    return new Observable((subscriber) => {
      this.getNotifications().subscribe({
        next: (notifications) => {
          const ids = notifications.map((n) => n.id);
          if (ids.length === 0) {
            subscriber.next();
            subscriber.complete();
            return;
          }
          this.markMultipleAsRead(ids).subscribe({
            next: () => {
              subscriber.next();
              subscriber.complete();
            },
            error: (err) => subscriber.error(err),
          });
        },
        error: (err) => subscriber.error(err),
      });
    });
  }
}
