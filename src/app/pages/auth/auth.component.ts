// src/app/pages/auth/auth-component.ts
import { Component } from '@angular/core';
import { LoginComponent } from './login/login';
import { RegisterComponent } from './register/register';
import { AuthService } from '../../services/auth-service';
import { Router } from '@angular/router';
import { OnInit } from '@angular/core';
import { ThemeMode, ThemeService } from '../../services/theme.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-auth-container',
  standalone: true,
  imports: [LoginComponent, RegisterComponent],
  template: `
    <div class="container">
      <div class="divider background-image-section">
        <div class="logo">
          <img src="img/shiftflow_branco.png" alt="Logo ShiftFlow" class="logo-img" />
        </div>
        <div class="text">
          <div class="title">
            <h1>Sistema requisição de mudança - RDM</h1>
            <p>Sistema integrado para controlar e acompanhar suas solicitações.</p>
          </div>
        </div>
      </div>

      <div class="right">
            @if (isLoginMode) {
          <app-login (toggleMode)="toggleMode()"></app-login>
        } @else {
          <app-register
            (toggleMode)="toggleMode()"
            (registerSuccess)="onRegisterSuccess()"
          ></app-register>
        }
      </div>
    </div>
  `,
  styleUrls: ['./login/login.css'],
})
export class AuthContainerComponent implements OnInit {
  isLoginMode = true;
  isDark = false;

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private router: Router,
    private themeService: ThemeService,
  ) {}

  ngOnInit() {
    // Se já está logado e está na página de login, redireciona
    if (this.authService.isLogged() && (this.router.url === '/' || this.router.url === '/login')) {
      this.router.navigate(['/user']);
    }

    // Assina as mudanças de tema
    this.themeService.currentTheme$
      .pipe(takeUntil(this.destroy$))
      .subscribe((themeMode: ThemeMode) => {
        this.isDark = themeMode === 'dark';
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
  }

  onRegisterSuccess() {
    setTimeout(() => {
      this.isLoginMode = true;
    }, 4000);
  }
}
