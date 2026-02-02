// src/app/pages/admin/dashboard/dashboard.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="admin-welcome">
      <div class="welcome-card">
        <mat-icon class="welcome-icon">admin_panel_settings</mat-icon>
        <h1>Bem-vindo ao Painel Administrativo</h1>
        <p>Selecione uma das opções no menu lateral para gerenciar o sistema.</p>
        <div class="dashboard-stats">
          <div class="stat-card">
            <mat-icon>people</mat-icon>
            <h3>Usuários</h3>
            <p>Gerencie usuários cadastrados</p>
          </div>
          <div class="stat-card">
            <mat-icon>assignment</mat-icon>
            <h3>RDMs</h3>
            <p>Aprove ou rejeite solicitações</p>
          </div>
          <div class="stat-card">
            <mat-icon>pending</mat-icon>
            <h3>Pendentes</h3>
            <p>Verifique aprovações pendentes</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-welcome {
      padding: 2rem;
      min-height: 70vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .welcome-card {
      text-align: center;
      max-width: 800px;
      padding: 3rem;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }

    .welcome-icon {
      font-size: 64px;
      height: 64px;
      width: 64px;
      color: #4361ee;
      margin-bottom: 1.5rem;
    }

    h1 {
      color: #2d3748;
      margin-bottom: 1rem;
    }

    p {
      color: #718096;
      font-size: 1.1rem;
      margin-bottom: 2rem;
    }

    .dashboard-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      margin-top: 2rem;
    }

    .stat-card {
      padding: 1.5rem;
      background: #f7fafc;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      transition: transform 0.3s ease;
    }

    .stat-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 25px rgba(0,0,0,0.1);
    }

    .stat-card mat-icon {
      font-size: 40px;
      height: 40px;
      width: 40px;
      color: #4361ee;
      margin-bottom: 1rem;
    }

    .stat-card h3 {
      color: #2d3748;
      margin-bottom: 0.5rem;
    }

    .stat-card p {
      color: #718096;
      font-size: 0.9rem;
      margin: 0;
    }
  `]
})
export class DashboardComponent {}
