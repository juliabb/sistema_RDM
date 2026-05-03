// src/app/pages/dashboard/dashboard.component.ts
import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { HeaderComponent } from '../../components/header/header.component';
import { DashboardNavComponent } from './dashboard-nav/dashboard-nav';
import { RdmFormComponent } from './rdm-form/rdm-form';
import { AuthService } from '../../services/auth-service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    HeaderComponent,
    DashboardNavComponent,
    RouterOutlet,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
  activeTab = 'new-request'; // usado apenas para destacar o item ativo no menu
  isAdmin = false;
  user: any = null;

  @ViewChild(RdmFormComponent) rdmForm?: RdmFormComponent;

  private router = inject(Router);
  private authService = inject(AuthService);

  ngOnInit(): void {
    this.loadUserData();

    // Sincroniza activeTab com a rota atual
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.updateActiveTabFromUrl();
    });

    this.updateActiveTabFromUrl(); // inicial
  }

  private loadUserData() {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.user = user;
      this.isAdmin = user.role === 'admin';
    }
  }

  private updateActiveTabFromUrl(): void {
    const url = this.router.url;
    if (url.includes('/user/new-request')) {
      this.activeTab = 'new-request';
    } else if (url.includes('/user/my-requests')) {
      this.activeTab = 'my-requests';
    } else {
      // fallback (não deve ocorrer devido ao redirect)
      this.activeTab = 'new-request';
    }
  }

  // Método chamado pelo menu lateral quando uma aba é selecionada
  onTabSelect(tabId: string): void {
    if (tabId === 'search-rdm') {
      // Ação especial: mantém a aba atual (new-request) e emite para abrir modal
      this.router.navigate(['/user/new-request']);
      setTimeout(() => this.rdmForm?.openSearchModal(), 0);
      return;
    }

    // Navega para a rota correspondente
    this.router.navigate(['/user', tabId]);
  }

  // Método chamado pelo menu para abrir o modal de busca (caso já esteja na aba correta)
  onOpenSearch(): void {
    // Garante que estamos na aba de nova solicitação
    this.router.navigate(['/user/new-request']).then(() => {
      setTimeout(() => this.rdmForm?.openSearchModal(), 0);
    });
  }
}

