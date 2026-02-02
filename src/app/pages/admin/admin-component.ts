import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet, Router } from '@angular/router';
import { HeaderComponent } from '../../components/header/header.component';
import { AdminNavComponent } from './admin-nav/admin-nav.component';
import { AuthService } from '../../services/auth-services';
import { FooterComponent } from '../../components/footer/footer.component';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet, HeaderComponent, AdminNavComponent, FooterComponent],
  template: `
    <div class="app-container admin-container">
      <app-admin-nav></app-admin-nav>

      <div class="main-content admin-main-content">
        <app-header></app-header>

        <div class="content-area admin-content-area">

          <router-outlet></router-outlet>
 <app-footer></app-footer>
        </div>
      </div>

    </div>
  `,
  styles: [
    `
      .app-container.admin-container {
        display: flex;
        min-height: 100vh;
        background-color: #f5f5f5;
      }

      .main-content.admin-main-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        margin-left: 280px;
      }

      .content-area.admin-content-area {
        flex: 1;
        padding: 20px;
        overflow-y: auto;
      }

      /* Responsividade */
      @media (max-width: 768px) {
        .main-content.admin-main-content {
          margin-left: 0;
        }

        .app-container.admin-container {
          flex-direction: column;
        }
      }
    `,
  ],
})
export class AdminComponent implements OnInit {
  constructor(public authService: AuthService, private router: Router) {}

  ngOnInit() {
    // Verificação de autenticação e permissões
    if (!this.authService.isLogged()) {
      this.router.navigate(['/login']);
      return;
    }

    if (!this.authService.isAdmin()) {
      const user = this.authService.getCurrentUser();
      alert(
        `Acesso negado!\n\nSua role: "${
          user?.role || 'N/A'
        }"\nApenas administradores podem acessar.`
      );
      this.router.navigate(['/dashboard']);
      return;
    }
  }
}
