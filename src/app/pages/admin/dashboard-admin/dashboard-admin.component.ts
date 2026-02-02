// src/app/pages/admin/dashboard-admin/dashboard-admin.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth-services';
import { HeaderComponent } from '../../../components/header/header.component';
import { AdminNavComponent } from '../admin-nav/admin-nav.component';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-dashboard-admin',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    HeaderComponent,
    AdminNavComponent,

  ],
  templateUrl: './dashboard-admin.html',
  styleUrls: ['./dashboard-admin.css'],
})
export class DashboardAdminComponent {
  constructor(
    public authService: AuthService,
    public router: Router // Tornar público para template
  ) {}

  // Verifica se está em uma rota de detalhes (que não mostra tabs)
  isDetailRoute(): boolean {
    return this.router.url.includes('/rdm/');
  }

  // Verifica se está em uma das rotas principais
  isMainRoute(): boolean {
    const mainRoutes = ['/admin/dashboard', '/admin/users-list',
                       '/admin/pending-users', '/admin/pending-rdm',
                       '/admin/rdm-list'];
    return mainRoutes.some(route => this.router.url === route);
  }

  navigateToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  get currentUserRole(): string {
    return this.authService.getCurrentUser()?.role || 'N/A';
  }
}
