// src/app/components/header/header.component.ts
import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Subscription, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService, UserProfile } from '../../services/auth-service';
import { jwtDecode } from 'jwt-decode';
import { MatIconModule } from '@angular/material/icon';
import { ThemeService } from '../../services/theme.service';
import { NotificationPopupComponent } from '../notification-popup/notification-popup.component';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterModule, MatIconModule, NotificationPopupComponent],
  templateUrl: './header.html',
  styleUrls: ['./header.css'],
})
export class HeaderComponent implements OnInit, OnDestroy {
  userName = '';
  userInitials = '';
  userEmail = '';
  userRole = '';
  showUserMenu = false;
  isLoggedIn = false;
  isUserAdmin = false;
  isUserTeamMember = false;
  isDark = false;

  showNotifications = false;
  unreadNotificationsCount = 0;
  private notificationSubscription?: Subscription;

  private destroy$ = new Subject<void>();
  private userSubscription?: Subscription;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly themeService: ThemeService,
    private notificationService: NotificationService,
  ) {}

  ngOnInit() {
    this.loadUserFromToken();

    this.userSubscription = this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user: UserProfile | null) => {
        this.updateUserData(user);
      });

    this.themeService.currentTheme$.pipe(takeUntil(this.destroy$)).subscribe((theme) => {
      this.isDark = theme === 'dark';
    });

    if (this.isLoggedIn) {
      this.updateUnreadCount();
      // Atualizar a cada 30 segundos
      setInterval(() => this.updateUnreadCount(), 30000);
    }
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  private loadUserFromToken(): void {
    const token = this.authService.getToken();
    if (!token) {
      this.clearUserData();
      return;
    }

    try {
      const decoded: any = jwtDecode(token);

      const roleClaim =
        decoded['role'] ||
        decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
        decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/roles'];

      const userRole = Array.isArray(roleClaim) ? roleClaim[0] : roleClaim || 'user';

      const userFromToken: UserProfile = {
        id: decoded.nameid || decoded.sub || 0,
        name: decoded.unique_name || decoded.name || 'Usuário',
        email: decoded.email || '',
        role: userRole.toLowerCase(),
      };

      this.updateUserData(userFromToken);
      this.authService.setCurrentUser(userFromToken);
    } catch (error) {
      this.clearUserData();
    }
  }

  private updateUserData(user: UserProfile | null): void {
    if (user) {
      // Verifica se a role precisa ser atualizada do token
      if (user.role === 'user' || !user.role) {
        const token = this.authService.getToken();
        if (token) {
          try {
            const decoded: any = jwtDecode(token);
            const roleClaim =
              decoded['role'] ||
              decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
              decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/roles'];

            const role = Array.isArray(roleClaim) ? roleClaim[0] : roleClaim;

            if (role) {
              user.role = role.toLowerCase();
            }
          } catch (error) {
            console.error('Erro ao decodificar token:', error);
          }
        }
      }

      this.userName = this.formatUserName(user.name);
      this.userEmail = user.email;
      this.userRole = user.role || 'N/A';
      this.userInitials = this.getInitials(user.name);
      this.isLoggedIn = true;

      // Definir flags baseadas na role
      const normalizedRole = this.userRole.toLowerCase();
      this.isUserAdmin = normalizedRole === 'administrador' || normalizedRole === 'admin';
      this.isUserTeamMember = normalizedRole === 'teammember' || normalizedRole === 'team member';
    } else {
      this.clearUserData();
    }
  }

  private clearUserData() {
    this.userName = 'Convidado';
    this.userEmail = '';
    this.userRole = '';
    this.userInitials = '?';
    this.isLoggedIn = false;
    this.isUserAdmin = false;
    this.isUserTeamMember = false;
  }

  private getInitials(name: string): string {
    if (!name) return '?';
    const names = name.split(' ');
    return names.length === 1
      ? names[0].charAt(0).toUpperCase()
      : (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  }

  private formatUserName(name: string): string {
    return name
      .toLowerCase()
      .split(' ')
      .filter((word) => word)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu-container') && !target.closest('.user-info')) {
      this.showUserMenu = false;
    }
    if (!target.closest('.notification-container') && !target.closest('.notification-icon')) {
      this.showNotifications = false;
    }
  }

  toggleNotifications(event: Event): void {
    event.stopPropagation();
    this.showNotifications = !this.showNotifications;
    if (this.showUserMenu) {
      this.showUserMenu = false;
    }
  }

  closeNotifications(): void {
    this.showNotifications = false;
  }

  onNotificationRead(notificationId: number): void {
    // Atualizar contador
    this.updateUnreadCount();
  }

  updateUnreadCount(): void {
    // Opcional: chamar API para obter contagem
    this.notificationService.getNotifications().subscribe((notifications) => {
      this.unreadNotificationsCount = notifications.length;
    });
  }

  navigateToHome() {
    if (this.isLoggedIn) {
      this.router.navigate(['/user']);
    } else {
      this.router.navigate(['/login']);
    }
  }

  toggleUserMenu(event: Event) {
    event.stopPropagation();
    this.showUserMenu = !this.showUserMenu;
  }

  navigateToChangePassword() {
    this.showUserMenu = false;
    this.router.navigate(['/settings/change-password']);
  }

  navigateToDashboardAdmin() {
    this.showUserMenu = false;

    if (this.authService.isAdmin()) {
      this.router.navigate(['/admin']);
    } else {
      alert(
        `Acesso negado! \n\nSeu usuário tem a role: "${this.userRole}" \n\nApenas administradores podem acessar esta área.`,
      );
      this.router.navigate(['/user']);
    }
  }

  logout() {
    this.showUserMenu = false;
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  isLoginPage(): boolean {
    return this.router.url === '/login';
  }

  // Esconder a role do usuário se não for administrador
  shouldShowRole(): boolean {
    // Mostrar role apenas se for administrador
    return this.isUserAdmin;
  }
}
