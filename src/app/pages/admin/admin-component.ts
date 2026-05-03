// src/app/pages/admin/admin-component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet, Router } from '@angular/router';
import { HeaderComponent } from '../../components/header/header.component';
import { AdminNavComponent } from './admin-nav/admin-nav.component';
import { AuthService } from '../../services/auth-service';
import { FooterComponent } from '../../components/footer/footer.component';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    RouterOutlet,
    HeaderComponent,
    AdminNavComponent,
    FooterComponent,
  ],
  template: `
    <div class="admin-layout">
      <app-admin-nav></app-admin-nav>

      <div class="admin-main">
        <app-header></app-header>

        <main class="admin-content">
          <router-outlet></router-outlet>
        </main>

        <app-footer></app-footer>
      </div>
    </div>
  `,
  styles: [
    `
      .admin-layout {
        display: flex;
        min-height: 100vh;
        background-color: var(--gray-50, #f5f5f5);
      }

      /* Conteúdo principal (ao lado da sidebar) */
      .admin-main {
        flex: 1;
        display: flex;
        flex-direction: column;
        margin-left: 70px;
        width: calc(100% - 70px);
        transition:
          margin-left var(--transition-base, 250ms ease),
          width var(--transition-base, 250ms ease);
        padding-top: 70px; /* altura exata do header */
        box-sizing: border-box;
      }

      /* Quando a sidebar expandir no hover, ajusta a margem */
      .admin-sidebar:hover ~ .admin-main {
        margin-left: 280px;
        width: calc(100% - 280px);
      }

      /* Área de conteúdo (abaixo do header) */
     .admin-content {
  flex: 1;
  padding: var(--spacing-lg);

  overflow-y: auto;
  background-color: var(--white);
  display: flex;
  flex-direction: column;
}

      .admin-content > * {
        flex: 1; /* faz o filho crescer para preencher */
        animation: fadeIn 0.3s ease-out;
      }

      /* Footer fica naturalmente abaixo do conteúdo */

      /* Responsividade */
      @media (max-width: 768px) {
        .admin-layout {
          flex-direction: column;
        }

        .admin-main {
          margin-left: 0 !important;
          width: 100% !important;
        }

        /* Desabilita o efeito hover no mobile */
        .admin-sidebar:hover ~ .admin-main {
          margin-left: 0;
          width: 100%;
        }

        .admin-content {
          padding: var(--spacing-md, 16px);
        }
      }

      /* Animação de transição de página */
      .admin-content > * {
        animation: fadeIn 0.3s ease-out;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ],
})
export class AdminComponent implements OnInit {
  constructor(
    public authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit() {
    if (!this.authService.isLogged()) {
      this.router.navigate(['/login']);
      return;
    }

    if (!this.authService.isAdmin()) {
      const user = this.authService.getCurrentUser();
      alert(
        `Acesso negado!\n\nSua role: "${
          user?.role || 'N/A'
        }"\nApenas administradores podem acessar.`,
      );
      this.router.navigate(['/user']);
      return;
    }
  }
}
