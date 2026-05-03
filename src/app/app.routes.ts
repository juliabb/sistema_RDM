// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';
import { adminGuard } from './guards/admin-guard';
import { RedirectGuard } from './guards/redirect-guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/auth/auth.component').then((m) => m.AuthContainerComponent),
    canActivate: [RedirectGuard],
  },
  {
    path: 'user',
    loadComponent: () =>
      import('./pages/dashboard/dashboard.component').then((m) => m.DashboardComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'new-request', pathMatch: 'full' },
      {
        path: 'new-request',
        loadComponent: () =>
          import('./pages/dashboard/rdm-form/rdm-form').then((m) => m.RdmFormComponent),
      },
      {
        path: 'my-requests',
        loadComponent: () =>
          import('./pages/dashboard/requests-table/requests-table').then(
            (m) => m.RequestsTableComponent,
          ),
      },
    ],
  },
  {
    path: 'rdm-details/:id',
    loadComponent: () =>
      import('./pages/admin/rdm-details/rdm-details.component').then((m) => m.RDMDetailsComponent),
    canActivate: [authGuard],
  },
  {
    path: 'rdm-edit/:ticket',
    loadComponent: () =>
      import('./pages/dashboard/rdm-form/rdm-form').then((m) => m.RdmFormComponent),
    canActivate: [authGuard],
  },

  // Container Admin COM ROTAS FILHAS
  {
    path: 'admin',
    loadComponent: () =>
      import('./pages/admin/dashboard-admin/dashboard-admin.component').then(
        (m) => m.DashboardAdminComponent,
      ),
    canActivate: [authGuard, adminGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'users-list',
      },
      {
        path: 'users-list',
        loadComponent: () =>
          import('./pages/admin/users-list/users-list.component').then((m) => m.UsersListComponent),
      },
      {
        path: 'pending-users',
        loadComponent: () =>
          import('./pages/admin/users-pending/users-pending.component').then(
            (m) => m.PendingUsersComponent,
          ),
      },
      {
        path: 'pending-rdm',
        loadComponent: () =>
          import('./pages/admin/rdm-pending/rdm-pending.component').then(
            (m) => m.PendingRDMComponent,
          ),
      },
      {
        path: 'rdm-list',
        loadComponent: () =>
          import('./pages/admin/rdm-list/rdm-list.component').then((m) => m.RDMListComponent),
      },
      {
        path: 'rdm/:id',
        loadComponent: () =>
          import('./pages/admin/rdm-details/rdm-details.component').then(
            (m) => m.RDMDetailsComponent,
          ),
      },
      {
        path: 'rdm-validation',
        loadComponent: () =>
          import('./pages/admin/rdm-validation/rdm-validation').then(
            (m) => m.RdmValidationComponent,
          ),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./pages/admin/rdm-reports/rdm-reports.component').then(
            (m) => m.RdmReportsComponent,
          ),
      },
      {
        path: 'system-service',
        loadComponent: () =>
          import('./pages/admin/system-service/system-service.component').then(
            (m) => m.SystemServiceComponent,
          ),
      },
      {
        path: '**',
        redirectTo: 'users-list',
      },
    ],
  },
  {
    path: 'settings/change-password',
    loadComponent: () =>
      import('./pages/settings/change-password/change-password').then(
        (m) => m.ChangePasswordComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full',
  },
];
