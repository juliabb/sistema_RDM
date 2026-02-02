// src/app/components/header/header.component.ts
import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService, UserProfile } from '../../services/auth-services';
import { jwtDecode } from 'jwt-decode';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterModule, MatIconModule],
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

  private userSubscription?: Subscription;

  constructor(private readonly authService: AuthService, private readonly router: Router) {}

  ngOnInit() {
    this.loadUserFromToken();

    this.userSubscription = this.authService.currentUser$.subscribe((user: UserProfile | null) => {
      this.updateUserData(user);
    });
  }

  ngOnDestroy() {
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

      this.userName = user.name.charAt(0).toUpperCase() + user.name.slice(1);
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

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu-container') && !target.closest('.user-info')) {
      this.showUserMenu = false;
    }
  }

  navigateToHome() {
    if (this.isLoggedIn) {
      this.router.navigate(['/dashboard']);
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
        `Acesso negado! \n\nSeu usuário tem a role: "${this.userRole}" \n\nApenas administradores podem acessar esta área.`
      );
      this.router.navigate(['/dashboard']);
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
