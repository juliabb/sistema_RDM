// src/app/pages/auth/auth-component.ts
import { Component } from '@angular/core';
import { LoginComponent } from './login/login';
import { RegisterComponent } from './register/register';
import { AuthService } from '../../services/auth-services';
import { Router } from '@angular/router';
import { OnInit } from '@angular/core';

@Component({
  selector: 'app-auth-container',
  standalone: true,
  imports: [LoginComponent, RegisterComponent],
  template: `
    <div class="container">
      <div class="divider background-image-section">
        <div class="logo">
          <img src="img/logo-prodesp-branco.svg" alt="Logo Prodesp" class="logo-img" />
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

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    // Se já está logado e está na página de login, redireciona
    if (this.authService.isLogged() && (this.router.url === '/' || this.router.url === '/login')) {
      this.router.navigate(['/dashboard']);
    }
  }

  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
  }

  onRegisterSuccess() {
    setTimeout(() => {
      this.isLoginMode = true;
    }, 3000);
  }
}
