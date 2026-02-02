// src/app/guards/role-guard.ts
import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth-services';

export const createRoleGuard = (allowedRoles: string[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isLogged()) {
      localStorage.setItem('redirectUrl', router.url);
      return router.parseUrl('/');
    }

    const userRole = authService.getRole();
    if (!userRole) {
      router.navigate(['/dashboard']);
      return false;
    }

    const hasAccess = allowedRoles.some((role) =>
      userRole.toLowerCase().includes(role.toLowerCase())
    );

    if (!hasAccess) {
      router.navigate(['/dashboard'], {
        queryParams: {
          error: 'insufficient_permissions',
          requiredRoles: allowedRoles.join(', '),
        },
      });
      return false;
    }

    return true;
  };
};
