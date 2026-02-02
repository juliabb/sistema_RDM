// src/app/guards/redirect-guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth-services';

export const RedirectGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Se usuário já está autenticado, redireciona para sua página inicial
  if (authService.isLogged()) {
    const initialUrl = authService.getInitialUrl();
    return router.parseUrl(initialUrl);
  }

  // Caso contrário, permite acesso à página de autenticação
  return true;
};
