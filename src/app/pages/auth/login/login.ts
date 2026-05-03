// src/app/pages/auth/login/login.ts
import { jwtDecode } from 'jwt-decode';
import {
  Component,
  inject,
  AfterViewInit,
  EventEmitter,
  Output,
  Inject,
  PLATFORM_ID,
  OnDestroy,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../../services/auth-service';
import { Router, ActivatedRoute } from '@angular/router';
import { RedirectService } from '../../../services/redirect-service';
import { MatIconModule } from '@angular/material/icon';
import { ModalComponent } from '../../../components/modal/modal.component';

// Importar configurações da API
import { buildApiUrl, API_PATHS } from '../../../config/api.config';

import { APP_CONSTANTS } from '../../../shared/constants/app.constants';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, MatIconModule, ModalComponent],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class LoginComponent implements AfterViewInit, OnDestroy {
  // Injeção de dependências
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly redirectService = inject(RedirectService); // Novo serviço

  private readonly isBrowser: boolean;
  private timeoutId?: number;

  @Output() toggleMode = new EventEmitter<void>();

  // Propriedades do componente
  errorMessage = '';
  successMessage = '';
  isLoading = false;
  showClearEmailButton = false;
  sessionExpired = false;

  showHelpModal = false;

  // Constantes
  private readonly LAST_EMAIL_KEY = 'last_login_email';
  private readonly API_TIMEOUT = 10000;
  version = APP_CONSTANTS.VERSION;

  // Formulário de login
  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  // URL de ajuda fictícia para portfólio
  helpUrl = 'mailto:suporte@shiftflow.com.br';

  constructor(@Inject(PLATFORM_ID) platformId: any) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.loadSavedEmail();
    this.checkQueryParams();
  }

  /**
   * Executado após o componente ser renderizado
   * Foca automaticamente no primeiro campo
   */
  ngAfterViewInit() {
    this.autoFocusFirstField();
  }

  /**
   * Limpeza ao destruir o componente
   */
  ngOnDestroy() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }

  /**
   * Verifica parâmetros da URL (para mensagens de sessão expirada)
   */
  private checkQueryParams() {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.sessionExpired = params['sessionExpired'] === 'true';

      if (this.sessionExpired) {
        this.errorMessage = 'Sessão expirada. Por favor, faça login novamente.';
      }
    });
  }

  /**
   * Submete o formulário de login
   */
  onLoginSubmit() {
    this.clearMessages();
    this.sessionExpired = false;
    this.router.navigate([], {
      queryParams: { sessionExpired: null },
      replaceUrl: true,
    });

    // Validação do formulário
    if (this.loginForm.invalid) {
      this.markAllFieldsAsTouched();

      if (
        this.loginForm.get('email')?.hasError('required') ||
        this.loginForm.get('password')?.hasError('required')
      ) {
        this.errorMessage = 'Preencha todos os campos obrigatórios';
        return;
      }

      if (this.loginForm.get('email')?.hasError('email')) {
        this.errorMessage = 'Email inválido';
        return;
      }

      return;
    }

    // Dados para enviar à API
    const loginData = {
      email: this.loginForm.get('email')?.value?.trim() || '',
      password: this.loginForm.get('password')?.value || '',
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    // Timeout para a requisição
    this.timeoutId = window.setTimeout(() => {
      if (this.isLoading) {
        this.isLoading = false;
        this.errorMessage = 'Tempo de conexão excedido. Verifique sua conexão.';
      }
    }, this.API_TIMEOUT);

    // Chamada à API de login
    const loginUrl = buildApiUrl(API_PATHS.LOGIN);
    this.http.post<any>(loginUrl, loginData, { headers }).subscribe({
      next: (response) => {
        this.clearTimeout();
        this.isLoading = false;

        if (response?.token) {
          this.handleLoginSuccess(response, loginData.email);
        } else {
          this.errorMessage = 'Credenciais inválidas ou token não recebido.';
        }
      },
      error: (error) => {
        this.clearTimeout();
        this.isLoading = false;
        this.handleLoginError(error);
      },
    });
  }

  // MODAL DE AJUDA
  openHelpModal(): void {
    this.showHelpModal = true;
  }

  closeHelpModal(): void {
    this.showHelpModal = false;
  }

  /**
   * Processa login bem-sucedido
   * @param response - Resposta da API
   * @param email - Email do usuário
   */
  private handleLoginSuccess(response: any, email: string) {
    if (this.isBrowser && response.email) {
      localStorage.setItem(this.LAST_EMAIL_KEY, response.email);
    }

    // Limpa dados antigos antes de salvar o novo token
    this.authService.clearAuth();
    this.authService.saveToken(response.token);

    // Pequeno atraso para garantir que os guards reavaliem
    setTimeout(() => {
      const redirectUrl = localStorage.getItem('redirectUrl');
      localStorage.removeItem('redirectUrl');

      if (redirectUrl) {
        this.router.navigateByUrl(redirectUrl).catch(() => {
          this.redirectService.redirectBasedOnRole();
        });
      } else {
        this.redirectService.redirectBasedOnRole();
      }
      // Não precisa reativar loading, o componente será destruído ao navegar
    }, 50);
  }

  /**
   * Determina rota padrão baseada no role
   * @param role - Role do usuário
   * @returns URL da rota inicial
   */
  private getDefaultRouteByRole(role: string): string {
    const roleLower = role.toLowerCase();

    // Mapeamento de roles para rotas
    const roleRoutes: Record<string, string> = {
      administrador: '/admin',
      admin: '/admin',
      administrator: '/admin',
      teammember: '/user',
      member: '/user',
      user: '/user',
    };

    // Retorna rota correspondente ou fallback
    return roleRoutes[roleLower] || '/user';
  }

  /**
   * Verifica se usuário tem permissão para acessar uma rota específica
   * @param requestedRoute - Rota que usuário tentou acessar
   * @param userRole - Role do usuário
   * @returns Rota permitida
   */
  private checkRoutePermission(requestedRoute: string, userRole: string): string {
    const role = userRole.toLowerCase();

    // Administrador pode acessar qualquer rota
    if (role === 'administrador' || role === 'admin') {
      return requestedRoute;
    }

    // TeamMember tentando acessar área admin → redireciona para dashboard
    if ((role === 'teammember' || role === 'member') && requestedRoute.includes('/admin')) {
      console.warn(`Acesso negado: TeamMember tentando acessar admin: ${requestedRoute}`);
      // Pode exibir um alerta ou mensagem toast aqui
      return '/user';
    }

    // Para outras situações, permite a rota solicitada
    return requestedRoute;
  }

  /**
   * Processa erros de login
   * @param error - Objeto de erro da requisição
   */
  private handleLoginError(error: any) {
    // Extrai mensagens de erro da API
    if (error.error?.errorMessages?.[0]) {
      const errorMsg = error.error.errorMessages[0];

      if (typeof errorMsg === 'string') {
        const lowerMsg = errorMsg.toLowerCase();

        // Mapeamento de mensagens de erro
        if (lowerMsg.includes('não aprovada') || lowerMsg.includes('aguardando')) {
          this.errorMessage = 'Sua conta está aguardando aprovação do administrador.';
        } else if (lowerMsg.includes('incorreto') || lowerMsg.includes('inválido')) {
          this.errorMessage = 'Email ou senha incorretos.';
        } else if (lowerMsg.includes('expirada')) {
          this.errorMessage = 'Sua conta expirou. Entre em contato com o administrador.';
        } else if (lowerMsg.includes('bloqueada') || lowerMsg.includes('suspensa')) {
          this.errorMessage = 'Sua conta está bloqueada. Entre em contato com o administrador.';
        } else {
          this.errorMessage = errorMsg;
        }
      } else {
        this.errorMessage = 'Erro desconhecido na API.';
      }
    } else if (error.status === 401) {
      this.errorMessage = 'Email ou senha incorretos.';
    } else if (error.status === 400) {
      this.errorMessage = 'Dados inválidos enviados.';
    } else if (error.status === 403) {
      this.errorMessage = 'Acesso negado. Verifique suas permissões.';
    } else if (error.status === 404) {
      this.errorMessage = 'Serviço de autenticação não encontrado.';
    } else if (error.status === 0 || error.status === 500) {
      this.errorMessage = 'Não foi possível conectar ao servidor. Verifique sua conexão.';
    } else {
      this.errorMessage = 'Erro ao fazer login. Tente novamente.';
    }
  }

  /**
   * Verifica se um campo do formulário tem erro específico
   * @param controlName - Nome do controle
   * @param errorType - Tipo de erro
   * @returns Verdadeiro se tem erro
   */
  hasError(controlName: string, errorType: string): boolean {
    const control = this.loginForm.get(controlName);
    return !!control && control.hasError(errorType) && (control.touched || control.dirty);
  }

  /**
   * Carrega email salvo do localStorage
   */
  private loadSavedEmail() {
    if (this.isBrowser) {
      const savedEmail = localStorage.getItem(this.LAST_EMAIL_KEY);
      if (savedEmail) {
        setTimeout(() => {
          this.loginForm.patchValue({ email: savedEmail });
          this.showClearEmailButton = true;
        }, 50);
      }
    }
  }

  /**
   * Foca automaticamente no campo de email
   */
  private autoFocusFirstField() {
    setTimeout(() => {
      const emailInput = document.querySelector(
        'input[formControlName="email"]',
      ) as HTMLInputElement;
      if (emailInput && !this.loginForm.get('email')?.value) {
        emailInput.focus();
      }
    }, 100);
  }

  /**
   * Marca todos os campos como tocados para exibir erros
   */
  private markAllFieldsAsTouched() {
    Object.keys(this.loginForm.controls).forEach((key) => {
      this.loginForm.get(key)?.markAsTouched();
    });
  }

  /**
   * Limpa mensagens de erro e sucesso
   */
  private clearMessages() {
    this.errorMessage = '';
    this.successMessage = '';
  }

  /**
   * Limpa timeout da requisição
   */
  private clearTimeout() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }
  }

  /**
   * Limpa email salvo do localStorage
   */
  clearSavedEmail() {
    if (this.isBrowser) {
      localStorage.removeItem(this.LAST_EMAIL_KEY);
    }
    this.loginForm.patchValue({ email: '' });
    this.showClearEmailButton = false;
    this.autoFocusFirstField();
  }
}
