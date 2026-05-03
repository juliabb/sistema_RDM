// src/app/services/refresh.service.ts
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class RefreshService {
  private refreshRequestsSource = new Subject<void>();
  refreshRequests$ = this.refreshRequestsSource.asObservable();

  private refreshRDMSource = new Subject<string>(); // Para refresh específico por ticket
  refreshRDM$ = this.refreshRDMSource.asObservable();

  /**
   * Solicita atualização da lista de solicitações
   */
  refreshRequests(): void {
    this.refreshRequestsSource.next();
  }

  /**
   * Solicita atualização de uma RDM específica (útil após edições)
   */
  refreshRDM(ticket: string): void {
    this.refreshRDMSource.next(ticket);
  }
}
