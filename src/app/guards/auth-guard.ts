// src/app/guards/auth-guard.ts
import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth-service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLogged()) {
    // Salva a URL que o usuário tentou acessar
    localStorage.setItem('redirectUrl', state.url);

    // Redireciona para login
    return router.parseUrl('/');
  }

  return true;
};
