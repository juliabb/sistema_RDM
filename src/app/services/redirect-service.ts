// src/app/services/redirect.service.ts
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth-service';

@Injectable({
  providedIn: 'root',
})
export class RedirectService {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  /**
   * Redireciona usuário para a página inicial baseada em seu role
   */
  redirectBasedOnRole(): void {
    if (!this.authService.isLogged()) {
      this.router.navigate(['/']);
      return;
    }

    const user = this.authService.getCurrentUser();
    if (!user) {
      this.router.navigate(['/']);
      return;
    }

    const roleLower = user.role.toLowerCase();

    if (roleLower === 'administrador' || roleLower === 'admin') {
      this.router.navigate(['/admin']);
    } else if (roleLower === 'teammember' || roleLower === 'membro do time') {
      this.router.navigate(['/user']);
    } else {
      // Fallback para dashboard geral
      this.router.navigate(['/user']);
    }
  }

  /**
   * Obtém a URL inicial baseada no role
   */
  getInitialUrl(): string {
    if (!this.authService.isLogged()) {
      return '/';
    }

    const user = this.authService.getCurrentUser();
    if (!user) {
      return '/';
    }

    const roleLower = user.role.toLowerCase();

    if (roleLower === 'administrador' || roleLower === 'admin') {
      return '/admin';
    } else if (roleLower === 'teammember' || roleLower === 'membro do time') {
      return '/user';
    }

    return '/user';
  }
}
