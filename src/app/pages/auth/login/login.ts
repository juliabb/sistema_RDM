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
import { AuthService} from '../../../services/auth-services';
import { Router, ActivatedRoute } from '@angular/router';
import { RedirectService } from '../../../services/redirect-services';

// Importar configurações da API
import { buildApiUrl, API_PATHS } from '../../../config/api.config';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
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

  // Constantes
  private readonly LAST_EMAIL_KEY = 'last_login_email';
  private readonly API_TIMEOUT = 10000;

  // Formulário de login
  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

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
    this.activatedRoute.queryParams.subscribe(params => {
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

    // Validação do formulário
    if (this.loginForm.invalid) {
      this.markAllFieldsAsTouched();

      if (this.loginForm.get('email')?.hasError('required') ||
          this.loginForm.get('password')?.hasError('required')) {
        this.errorMessage = 'Preencha todos os campos obrigatórios';
        return;
      }

      if (this.loginForm.get('email')?.hasError('email')) {
        this.errorMessage = 'Email inválido';
        return;
      }

      return;
    }

    this.isLoading = true;

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

  /**
   * Processa login bem-sucedido
   * @param response - Resposta da API
   * @param email - Email do usuário
   */
  private handleLoginSuccess(response: any, email: string) {
    // Salva email no localStorage para autopreenchimento futuro
    if (this.isBrowser && response.email) {
      localStorage.setItem(this.LAST_EMAIL_KEY, response.email);
    }

    // 1. Salva o token JWT (o AuthService já decodifica automaticamente)
    this.authService.saveToken(response.token);

    // 2. Atualiza estado de loading
    this.isLoading = true;

    // 3. Redirecionamento com pequeno delay para garantir processamento
    setTimeout(() => {
      // Verifica se há uma URL para redirecionar (salva pelo AuthGuard/interceptor)
      const redirectUrl = localStorage.getItem('redirectUrl');

      if (redirectUrl) {
        // Remove a URL salva para não reutilizar
        localStorage.removeItem('redirectUrl');

        // Tenta navegar para a URL salva
        this.router.navigateByUrl(redirectUrl)
          .catch(() => {
            // Se falhar, redireciona baseado no role
            this.redirectService.redirectBasedOnRole();
          });
      } else {
        // Se não há URL salva, redireciona baseado no role do usuário
        this.redirectService.redirectBasedOnRole();
      }

      this.isLoading = false;
    }, 100);
  }

  /**
   * Versão alternativa usando verificação explícita do token
   * (Mantida para referência - use a versão simplificada acima)
   */
  private handleLoginSuccessAlternative(response: any, email: string) {
    // Salva email no localStorage
    if (this.isBrowser && response.email) {
      localStorage.setItem(this.LAST_EMAIL_KEY, response.email);
    }

    // 1. Salva token no AuthService
    this.authService.saveToken(response.token);
    this.isLoading = true;

    // 2. Redireciona após processamento
    setTimeout(() => {
      // Obter token decodificado
      const token = this.authService.getToken();

      if (token) {
        try {
          // Decodifica token para extrair role
          const decoded: any = jwtDecode(token);
          const roleClaim = decoded['role'] ||
                           decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
                           'teamMember';

          // Obtém URL de redirecionamento salva (se houver)
          const redirectUrl = localStorage.getItem('redirectUrl');
          localStorage.removeItem('redirectUrl');

          let targetRoute: string;

          if (redirectUrl) {
            // Verifica permissão para a URL solicitada
            targetRoute = this.checkRoutePermission(redirectUrl, roleClaim);
          } else {
            // Usa rota padrão baseada no role
            targetRoute = this.getDefaultRouteByRole(roleClaim);
          }

          // Navega para a rota determinada
          this.router.navigateByUrl(targetRoute);
        } catch (error) {
          console.error(' Erro ao decodificar token:', error);
          this.router.navigate(['/dashboard']);
        }
      } else {
        this.router.navigate(['/dashboard']);
      }

      this.isLoading = false;
    }, 100);
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
      'administrador': '/admin',
      'admin': '/admin',
      'administrator': '/admin',
      'teammember': '/dashboard',
      'member': '/dashboard',
      'user': '/dashboard',
    };

    // Retorna rota correspondente ou fallback
    return roleRoutes[roleLower] || '/dashboard';
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
      console.warn(`🚫 Acesso negado: TeamMember tentando acessar admin: ${requestedRoute}`);
      // Pode exibir um alerta ou mensagem toast aqui
      return '/dashboard';
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
      const emailInput = document.querySelector('input[formControlName="email"]') as HTMLInputElement;
      if (emailInput && !this.loginForm.get('email')?.value) {
        emailInput.focus();
      }
    }, 100);
  }

  /**
   * Marca todos os campos como tocados para exibir erros
   */
  private markAllFieldsAsTouched() {
    Object.keys(this.loginForm.controls).forEach(key => {
      this.loginForm.get(key)?.markAsTouched();
    });
  }

  /**
   * Limpa mensagens de erro e sucesso
   */
  private clearMessages() {
    if (!this.sessionExpired) {
      this.errorMessage = '';
    }
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
