// src/app/services/auth-services.ts
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { BehaviorSubject, Observable } from 'rxjs';

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: string;
  department?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'current_user';
  private currentUserSubject = new BehaviorSubject<UserProfile | null>(null);
  public currentUser$: Observable<UserProfile | null> = this.currentUserSubject.asObservable();
  private readonly router = inject(Router);

  constructor() {
    this.loadUserFromToken();
  }

  /**
   * Decodifica o token JWT e extrai informações do usuário
   */
  private decodeToken(token: string): UserProfile | null {
    try {
      const decoded: any = jwtDecode(token);

      // Extrai informações do token (ajuste conforme sua estrutura JWT)
      return {
        id: decoded.id || decoded.sub || 0,
        name: decoded.name || decoded.fullName || '',
        email: decoded.email || '',
        role: decoded.role || decoded.roles?.[0] || 'teamMember',
        department: decoded.department || ''
      };
    } catch (error) {
      console.error('Erro ao decodificar token:', error);
      return null;
    }
  }

  /**
   * Carrega usuário do token no localStorage
   */
  private loadUserFromToken(): void {
    const token = this.getToken();
    if (token && this.isTokenValid(token)) {
      const user = this.decodeToken(token);
      if (user) {
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        this.currentUserSubject.next(user);
      }
    }
  }

  /**
   * Verifica se o token é válido
   */
  private isTokenValid(token: string): boolean {
    try {
      const decoded: any = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      return decoded.exp > currentTime;
    } catch {
      return false;
    }
  }

  /**
   * Salva token e atualiza informações do usuário
   */
  saveToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    const user = this.decodeToken(token);
    if (user) {
      this.setCurrentUser(user);
    }
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  setCurrentUser(user: UserProfile): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  getCurrentUser(): UserProfile | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  removeCurrentUser(): void {
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSubject.next(null);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    return this.isTokenValid(token);
  }

  // Método compatível com o código existente
  isLogged(): boolean {
    return this.isAuthenticated();
  }

  // Verifica se é administrador
  isAdmin(): boolean {
    const user = this.getCurrentUser();
    if (!user || !user.role) return false;

    const roleLower = user.role.toLowerCase();
    return roleLower === 'administrador' ||
           roleLower === 'admin' ||
           roleLower.includes('admin');
  }

  // Verifica se é team member
  isTeamMember(): boolean {
    const user = this.getCurrentUser();
    if (!user || !user.role) return false;

    const roleLower = user.role.toLowerCase();
    return roleLower === 'teammember' ||
           roleLower === 'membro do time' ||
           roleLower.includes('team');
  }

  getRole(): string | null {
    const user = this.getCurrentUser();
    return user?.role || null;
  }

  clearAuth(): void {
    this.removeToken();
    this.removeCurrentUser();
  }

  logout(): void {
    this.clearAuth();
    this.router.navigate(['/']);
  }

  /**
   * Obtém URL inicial baseada no role do usuário
   */
  getInitialUrl(): string {
    if (this.isAdmin()) {
      return '/admin';
    } else if (this.isTeamMember()) {
      return '/dashboard';
    }
    return '/dashboard'; // Fallback
  }
}
