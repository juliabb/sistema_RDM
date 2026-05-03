// src/app/pages/dashboard/dashboard-nav/dashboard-nav.ts
import { Component, Output, EventEmitter, HostListener, OnInit, OnDestroy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AuthService, UserProfile } from '../../../services/auth-service';
import { APP_CONSTANTS } from '../../../shared/constants/app.constants';

@Component({
  selector: 'app-dashboard-nav',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './dashboard-nav.html',
  styleUrls: ['./dashboard-nav.css'],
})
export class DashboardNavComponent implements OnInit, OnDestroy {
  @Output() tabSelected = new EventEmitter<string>();
  @Output() openSearch = new EventEmitter<void>();

  isMobile = false;
  mobileMenuOpen = false;

  appVersion = APP_CONSTANTS.VERSION;
  teamsHelpUrl = 'https://teams.microsoft.com/l/chat/0/0?users=suporte@shiftflow.com.br';

  // ===== Modal da imagem =====
  showProcessFlowModal = false;
  zoomLevel = 1; // escala inicial (1 = 100%)
  readonly MIN_ZOOM = 0.5;
  readonly MAX_ZOOM = 3;
  readonly ZOOM_STEP = 0.25;

  // Lista base de abas (sem o admin)
  private baseTabs = [
    { id: 'new-request', label: 'Nova Solicitação' },
    { id: 'my-requests', label: 'Minhas Solicitações' },
    { id: 'search-rdm', label: 'Clonar - RDM', icon: 'search' },
    {
      id: 'help',
      label: 'Ajuda',
      isExternal: true,
      icon: 'help_outline',
    },
  ];

  // Aba do admin
  private adminTab = {
    id: 'admin-panel',
    label: 'Painel Admin',
    icon: 'admin_panel_settings',
    route: '/admin/users-list',
  };

  // Lista final que será exibida (dinâmica)
  tabs: any[] = [];

  activeTab = 'new-request';
  isUserAdmin = false;

  private userSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {
    this.checkMobile();
  }

  ngOnInit() {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.updateUserRole(currentUser);
      this.buildTabs();
    }

    this.userSubscription = this.authService.currentUser$.subscribe((user: UserProfile | null) => {
      this.updateUserRole(user);
      this.buildTabs();
    });

    // Sincroniza o activeTab com a rota atual sempre que a navegação terminar
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.syncActiveTabWithRoute();
    });

    // Sincronização inicial
    this.syncActiveTabWithRoute();
  }

  ngOnDestroy() {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  private updateUserRole(user: UserProfile | null) {
    if (user) {
      const normalizedRole = user.role?.toLowerCase() || '';
      this.isUserAdmin = normalizedRole === 'administrador' || normalizedRole === 'admin';
    } else {
      this.isUserAdmin = false;
    }
  }

  private buildTabs() {
    let tabs = [...this.baseTabs];
    if (this.isUserAdmin) {
      tabs.push(this.adminTab);
    }
    this.tabs = tabs;
  }

  @HostListener('window:resize')
  onResize() {
    this.checkMobile();
  }

  private checkMobile() {
    this.isMobile = window.innerWidth <= 768;
  }

  /**
   * Atualiza o activeTab com base na URL atual.
   */
  private syncActiveTabWithRoute(): void {
    const url = this.router.url;
    if (url.includes('/user/new-request')) {
      this.activeTab = 'new-request';
    } else if (url.includes('/user/my-requests')) {
      this.activeTab = 'my-requests';
    }
    // 'search-rdm' e 'help' não possuem rotas correspondentes
  }

  selectTab(tabId: string) {
    const selectedTab = this.tabs.find((tab) => tab.id === tabId);
    if (!selectedTab) return;

    // Painel Admin
    if (tabId === 'admin-panel') {
      if (!this.isUserAdmin) {
        alert('Acesso negado!');
        return;
      }
      this.router.navigate([this.adminTab.route]);
      if (this.isMobile) {
        this.mobileMenuOpen = false;
      }
      return;
    }

    // Link externo (Ajuda)
    if (selectedTab.isExternal && tabId === 'help') {
      window.open(this.teamsHelpUrl, '_blank');
      return;
    }

    // Clonar - RDM (abre modal na tela de nova solicitação)
    if (tabId === 'search-rdm') {
      this.router.navigate(['/user/new-request'], { queryParams: { openSearch: 'true' } });
      if (this.isMobile) {
        this.mobileMenuOpen = false;
      }
      return;
    }

    // Abas com rotas definidas: 'new-request' e 'my-requests'
    if (tabId === 'new-request' || tabId === 'my-requests') {
      this.router.navigate(['/user', tabId]);
      this.tabSelected.emit(tabId);
    }

    // Atualiza o estado visual imediatamente (a sincronização por rota confirmará depois)
    this.activeTab = tabId;

    if (this.isMobile) {
      this.mobileMenuOpen = false;
    }
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }
}
