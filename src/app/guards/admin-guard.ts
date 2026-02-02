// src/app/guards/admin-guard.ts
import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth-services';

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Primeiro verifica autenticação
  if (!authService.isLogged()) {
    localStorage.setItem('redirectUrl', router.url);
    return router.parseUrl('/');
  }

  // Depois verifica se é administrador
  if (!authService.isAdmin()) {
    // Redireciona para dashboard com parâmetro de erro
    router.navigate(['/dashboard'], {
      queryParams: {
        error: 'access_denied',
        message: 'Apenas administradores podem acessar esta área.',
      },
    });
    return false;
  }

  return true;
};
