// src/app/guards/admin-guard.ts
import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth-service';

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
    // Redireciona para /user com parâmetro de erro
    router.navigate(['/user'], {
      queryParams: {
        error: 'access_denied',
        message: 'Apenas administradores podem acessar esta área.',
      },
    });
    return false;
  }

  return true;
};
