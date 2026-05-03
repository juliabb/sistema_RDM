// src/app/pages/admin/admin-nav/admin-nav.component.ts
import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { APP_CONSTANTS } from '../../../shared/constants/app.constants';

interface AdminTabItem {
  id: string;
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-admin-nav',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  templateUrl: './admin-nav.html',
  styleUrls: ['./admin-nav.css'],
})
export class AdminNavComponent {
  tabs: AdminTabItem[] = [
    {
      id: 'users',
      label: 'Usuários Cadastrados',
      icon: 'people',
      route: '/admin/users-list',
    },
    {
      id: 'pending-users',
      label: 'Usuários Pendentes',
      icon: 'pending',
      route: '/admin/pending-users',
    },
    {
      id: 'pending-rdm',
      label: 'RDM Pendentes',
      icon: 'assignment',
      route: '/admin/pending-rdm',
    },
    {
      id: 'rdm-validation',
      label: 'Validação',
      icon: 'check_circle',
      route: '/admin/rdm-validation',
    },
    {
      id: 'reports',
      label: 'Relatórios',
      icon: 'bar_chart',
      route: '/admin/reports',
    },
    {
      id: 'system-service',
      label: 'Sistemas',
      route: '/admin/system-service',
      icon: 'settings_applications',
    },
    {
      id: 'rdm-list',
      label: 'Lista de RDM',
      icon: 'list_alt',
      route: '/admin/rdm-list',
    },
  ];

  constructor(public router: Router) {}
  version = APP_CONSTANTS.VERSION;

  // Verifica se a rota atual é ativa
  isActive(route: string): boolean {
    return (
      this.router.url === route || (route === '/admin/dashboard' && this.router.url === '/admin')
    );
  }

  navigateToDashboard(): void {
    this.router.navigate(['/user']);
  }

  onKeyDown(event: KeyboardEvent, route: string): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.router.navigate([route]);
    }
  }

  onTabClick(tab: AdminTabItem): void {
    if (!this.isActive(tab.route)) {
      this.router.navigate([tab.route]);
    }
  }
}
