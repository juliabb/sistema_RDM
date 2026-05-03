// src/app/pages/admin/users-list/users-list.component.ts
import { Subject, forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { SharedMaterialModule } from '../../../shared/ui';
import { ModalComponent } from '../../../components/modal/modal.component';
import { API_PATHS, buildApiUrl } from '../../../config/api.config';
import { AuthService } from '../../../services/auth-service';
import { PaginationComponent } from '../../../components/pagination/pagination.component';

// Interfaces
interface ApiUser {
  name: string;
  email: string;
  department: string;
  situation: string;
  role: string;
}

interface RegisteredUser {
  name: string;
  email: string;
  department: string;
  situation: string;
  role: string;
  registrationDate?: string;
}

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [FormsModule, CommonModule, SharedMaterialModule, ModalComponent, PaginationComponent],
  templateUrl: './users-list.html',
  styleUrls: ['./users-list.css'],
})
export class UsersListComponent implements OnInit {
  // Propriedades principais
  users: RegisteredUser[] = [];
  searchTerm = '';
  statusFilter = 'todos';
  roleFilter = 'todos';
  currentPage = 1;
  pageSize = 10; // Mantido em 10 (valor que a API aceita)
  totalUsers = 0;
  totalPages = 1;
  isLoading = false;
  apiError = '';
  allUsers: RegisteredUser[] = []; // armazena todos os usuários carregados

  // Modal
  showUserModal = false;
  selectedUser: RegisteredUser | null = null;
  newPassword = '';
  manualPassword = '';
  selectedRole = '';
  selectedStatus = '';
  passwordOption: 'auto' | 'manual' = 'auto';
  isResetting = false;
  isChangingRole = false;
  isChangingStatus = false;
  resetError = '';
  resetSuccess = false;
  changeRoleError = '';
  changeRoleSuccess = false;
  changeStatusError = '';
  changeStatusSuccess = false;
  activeTab: 'info' | 'password' | 'role' | 'status' = 'info';

  // Propriedades para edição
  isEditing = false;
  editError = '';
  editSuccess = false;
  originalUserEmail: string = '';

  // Configurações
  statusOptions = [
    { value: 'todos', label: 'Todos os Status' },
    { value: 'Aprovado', label: 'Aprovado' },
    { value: 'Desativado', label: 'Desativado' },
    { value: 'Pendente', label: 'Pendente' },
  ];

  roleOptions = [
    { value: 'todos', label: 'Todos os Perfis' },
    { value: 'administrador', label: 'Administrador' },
    { value: 'teamMember', label: 'Padrão' },
  ];

  modalRoleOptions = [
    { value: 'teamMember', label: 'Padrão' },
    { value: 'administrador', label: 'Administrador' },
  ];

  modalStatusOptions = [
    { value: 'Aprovado', label: 'Aprovado' },
    { value: 'Desativado', label: 'Desativado' },
  ];

  private searchSubject = new Subject<string>();

  // Gerencia qual ação está ativa no modal (senha, role, status ou edição)
  activeAction: 'password' | 'role' | 'status' | 'edit' = 'password';

  // Define a ação ativa no modal para exibir o conteúdo correspondente
  setActiveAction(action: 'password' | 'role' | 'status' | 'edit'): void {
    this.activeAction = action;
  }

  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.loadAllUsers();
    this.setupSearchDebounce();
  }

  // ==================== CARREGAMENTO DE DADOS ====================

  /** Carrega todas as páginas de usuários da API */
  loadAllUsers(): void {
    this.isLoading = true;
    this.apiError = '';

    const token = this.authService.getToken();
    if (!token) {
      this.apiError = 'Usuário não autenticado. Faça login novamente.';
      this.isLoading = false;
      return;
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      accept: 'text/plain',
    });

    // Primeira chamada para obter totalPages e primeira página
    let params = new HttpParams().set('PageNumber', '1').set('PageSize', this.pageSize.toString()); // usa 10

    this.http
      .get<ApiUser[]>(buildApiUrl(API_PATHS.ADMIN_LIST_USERS), {
        headers,
        params,
        observe: 'response',
      })
      .subscribe({
        next: (firstResponse) => {
          // Extrai totalPages do header
          const paginationHeader = firstResponse.headers.get('pagination');
          let totalPages = 1;
          if (paginationHeader) {
            try {
              const paginationInfo = JSON.parse(paginationHeader);
              totalPages = paginationInfo.totalPages || 1;
            } catch {
              // fallback
            }
          }

          const firstPageUsers = firstResponse.body || [];
          const allApiUsers: ApiUser[] = [...firstPageUsers];

          if (totalPages <= 1) {
            // Só uma página
            this.allUsers = allApiUsers.map((u) => this.formatUserFromApi(u));
            this.applyLocalFilters();
            this.isLoading = false;
            return;
          }

          // Prepara chamadas para as demais páginas (2 até totalPages)
          const otherPageCalls = [];
          for (let page = 2; page <= totalPages; page++) {
            let pageParams = new HttpParams()
              .set('PageNumber', page.toString())
              .set('PageSize', this.pageSize.toString());
            otherPageCalls.push(
              this.http.get<ApiUser[]>(buildApiUrl(API_PATHS.ADMIN_LIST_USERS), {
                headers,
                params: pageParams,
              }),
            );
          }

          // Executa todas em paralelo
          forkJoin(otherPageCalls).subscribe({
            next: (responses) => {
              responses.forEach((res) => {
                if (res && Array.isArray(res)) {
                  allApiUsers.push(...res);
                }
              });
              this.allUsers = allApiUsers.map((u) => this.formatUserFromApi(u));
              this.applyLocalFilters();
              this.isLoading = false;
            },
            error: (err) => {
              console.error('Erro ao carregar páginas adicionais:', err);
              // Mesmo com erro, usa o que já temos
              this.allUsers = allApiUsers.map((u) => this.formatUserFromApi(u));
              this.applyLocalFilters();
              this.isLoading = false;
            },
          });
        },
        error: (error) => {
          console.error('Erro ao carregar primeira página:', error);
          this.handleApiError(error);
          this.isLoading = false;
        },
      });
  }

  /** Aplica filtros locais (search, status, role) e atualiza a página atual */
  applyLocalFilters() {
    let filtered = this.allUsers;

    // Filtro por texto (nome, email, departamento)
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(term) ||
          user.email.toLowerCase().includes(term) ||
          user.department.toLowerCase().includes(term),
      );
    }

    // Filtro por status
    if (this.statusFilter !== 'todos') {
      filtered = filtered.filter((user) => user.situation === this.statusFilter);
    }

    // Filtro por role
    if (this.roleFilter !== 'todos') {
      const roleMap: Record<string, string> = {
        administrador: 'Administrador',
        teamMember: 'Padrão',
      };
      const targetRole = roleMap[this.roleFilter];
      if (targetRole) {
        filtered = filtered.filter((user) => user.role === targetRole);
      }
    }

    this.totalUsers = filtered.length;
    this.totalPages = Math.ceil(this.totalUsers / this.pageSize) || 1;

    // Ajusta currentPage se estiver além do limite
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
    if (this.currentPage < 1) this.currentPage = 1;

    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.users = filtered.slice(start, end);
  }

  // ==================== FILTROS E BUSCA ====================

  searchUsers(): void {
    this.currentPage = 1;
    this.applyLocalFilters();
  }

  filterByStatus(): void {
    this.currentPage = 1;
    this.applyLocalFilters();
  }

  filterByRole(): void {
    this.currentPage = 1;
    this.applyLocalFilters();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = 'todos';
    this.roleFilter = 'todos';
    this.currentPage = 1;
    this.applyLocalFilters();
  }

  refreshUsers(): void {
    this.loadAllUsers(); // recarrega tudo da API
  }

  // ==================== DEBOUNCE PARA BUSCA ====================

  private setupSearchDebounce() {
    this.searchSubject.pipe(debounceTime(300), distinctUntilChanged()).subscribe((term) => {
      this.currentPage = 1;
      this.applyLocalFilters(); // usa os dados já carregados
    });
  }

  onSearchChange(term: string) {
    this.searchSubject.next(term);
  }

  // ==================== PAGINAÇÃO ====================

  onPageChange(newPage: number): void {
    if (newPage !== this.currentPage) {
      this.currentPage = newPage;
      this.applyLocalFilters();
    }
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize = newSize;
    this.currentPage = 1;
    this.applyLocalFilters();
  }

  // ==================== FORMATAÇÃO E ESTILIZAÇÃO ====================

  private formatUserFromApi(apiUser: ApiUser): RegisteredUser {
    return {
      name: apiUser.name || 'Não informado',
      email: apiUser.email || 'Não informado',
      department: apiUser.department || 'Não informado',
      situation: this.formatSituation(apiUser.situation),
      role: this.formatRole(apiUser.role || 'teamMember'),
      registrationDate: new Date().toLocaleDateString('pt-BR'),
    };
  }

  private formatSituation(situation: string): string {
    if (!situation) return 'Pendente';
    const sit = situation.toLowerCase().trim();
    if (sit.includes('aprovado') || sit.includes('active')) return 'Aprovado';
    if (sit.includes('pendente') || sit.includes('pending')) return 'Pendente';
    if (sit.includes('reprovado') || sit.includes('inactive')) return 'Reprovado';
    if (situation === 'Aprovado' || situation === 'Pendente' || situation === 'Reprovado') {
      return situation;
    }
    return situation;
  }

  formatRole(role: string): string {
    if (!role) return 'Padrão';
    const roleLower = role.toLowerCase();
    if (roleLower === 'administrador' || roleLower === 'admin') return 'Administrador';
    if (roleLower === 'teammember' || roleLower === 'team') return 'Padrão';
    return role;
  }

  getRoleClass(role: string): string {
    if (!role) return 'role-default';
    const roleLower = role.toLowerCase();
    if (roleLower === 'administrador' || roleLower === 'admin') return 'role-admin';
    if (roleLower === 'teammember' || roleLower === 'team' || roleLower === 'padrão')
      return 'role-member';
    return 'role-default';
  }

  getSituationClass(situation: string): string {
    if (!situation) return 'status-default';
    const situationLower = situation.toLowerCase();
    if (situationLower === 'aprovado') return 'status-approved';
    if (situationLower === 'pendente') return 'status-pending';
    if (situationLower === 'reprovado') return 'status-rejected';
    return 'status-default';
  }

  // ==================== GERENCIAMENTO DO MODAL ====================

  openUserModal(user: RegisteredUser): void {
    // Cria uma cópia para edição
    this.selectedUser = { ...user };
    this.originalUserEmail = user.email;
    this.newPassword = this.generateRandomPassword();
    this.manualPassword = '';
    this.selectedRole = 'teamMember';
    this.selectedStatus = user.situation;
    this.passwordOption = 'auto';
    this.resetModalStates();
    this.activeTab = 'info';
    this.showUserModal = true;
  }

  closeUserModal(): void {
    this.showUserModal = false;
    this.selectedUser = null;
    this.resetModalStates();
  }

  private resetModalStates(): void {
    this.resetError = '';
    this.resetSuccess = false;
    this.changeRoleError = '';
    this.changeRoleSuccess = false;
    this.changeStatusError = '';
    this.changeStatusSuccess = false;
    this.editError = '';
    this.editSuccess = false;
    this.isResetting = false;
    this.isChangingRole = false;
    this.isChangingStatus = false;
    this.isEditing = false;
  }

  setActiveTab(tab: 'info' | 'password' | 'role' | 'status'): void {
    this.activeTab = tab;
  }

  setPasswordOption(option: 'auto' | 'manual'): void {
    this.passwordOption = option;
    if (option === 'auto' && !this.newPassword) {
      this.newPassword = this.generateRandomPassword();
    }
    if (option === 'manual') {
      this.manualPassword = '';
    }
  }

  // ==================== FUNCIONALIDADES DE SENHA ====================

  generateRandomPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  copyPassword(): void {
    const passwordToCopy = this.passwordOption === 'auto' ? this.newPassword : this.manualPassword;
    if (!passwordToCopy) return;
    navigator.clipboard
      .writeText(passwordToCopy)
      .catch((err) => console.error('Erro ao copiar senha:', err));
  }

  generateNewPassword(): void {
    this.newPassword = this.generateRandomPassword();
  }

  // Validações de senha
  get hasMinLength(): boolean {
    return this.getCurrentPassword().length >= 8;
  }

  get hasUpperCase(): boolean {
    return /[A-Z]/.test(this.getCurrentPassword());
  }

  get hasLowerCase(): boolean {
    return /[a-z]/.test(this.getCurrentPassword());
  }

  get hasNumber(): boolean {
    return /\d/.test(this.getCurrentPassword());
  }

  get hasSpecialChar(): boolean {
    return /[!@#$%^&*]/.test(this.getCurrentPassword());
  }

  private getCurrentPassword(): string {
    return this.passwordOption === 'auto' ? this.newPassword : this.manualPassword;
  }

  getPasswordStrength(): number {
    let strength = 0;
    if (this.hasMinLength) strength++;
    if (this.hasUpperCase) strength++;
    if (this.hasLowerCase) strength++;
    if (this.hasNumber) strength++;
    if (this.hasSpecialChar) strength++;
    return strength;
  }

  getPasswordStrengthClass(): string {
    const strength = this.getPasswordStrength();
    if (strength < 3) return 'weak';
    if (strength < 5) return 'medium';
    return 'strong';
  }

  getPasswordStrengthText(): string {
    const strength = this.getPasswordStrength();
    if (strength < 3) return 'Senha fraca';
    if (strength < 5) return 'Senha média';
    return 'Senha forte';
  }

  isPasswordValid(): boolean {
    if (this.passwordOption === 'auto') return this.newPassword.length > 0;
    return (
      this.manualPassword.length >= 8 &&
      this.hasUpperCase &&
      this.hasLowerCase &&
      this.hasNumber &&
      this.hasSpecialChar
    );
  }

  // ==================== AÇÕES DE EDIÇÃO ====================

  editUser(): void {
    if (!this.selectedUser) return;

    const token = this.authService.getToken();
    if (!token) {
      this.editError = 'Usuário não autenticado. Faça login novamente.';
      return;
    }

    // Validação de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.selectedUser.email)) {
      this.editError = 'E-mail inválido.';
      return;
    }

    this.isEditing = true;
    this.editError = '';
    this.editSuccess = false;

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });

    const url = buildApiUrl(API_PATHS.ADMIN_UPDATE_USER(this.originalUserEmail));

    // Extrair primeiro nome e sobrenome
    const fullName = this.selectedUser.name.trim();
    const spaceIndex = fullName.indexOf(' ');
    const firstName = spaceIndex === -1 ? fullName : fullName.substring(0, spaceIndex);
    const lastName = spaceIndex === -1 ? '' : fullName.substring(spaceIndex + 1).trim();

    const body = {
      name: firstName,
      lastName: lastName,
      email: this.selectedUser.email.trim(),
      department: this.selectedUser.department.trim(),
    };

    this.http.put(url, body, { headers, observe: 'response' }).subscribe({
      next: () => {
        this.isEditing = false;
        this.editSuccess = true;
        setTimeout(() => {
          this.closeUserModal();
          this.refreshUsers();
        }, 1500);
      },
      error: (error) => {
        this.isEditing = false;
        this.handleEditError(error);
      },
    });
  }
  private handleEditError(error: any): void {
    console.error('Erro na edição:', error);
    if (error.status === 401) {
      this.editError = 'Sessão expirada. Faça login novamente.';
      this.authService.logout();
    } else if (error.status === 403) {
      this.editError = 'Você não tem permissão para esta ação.';
    } else if (error.status === 404) {
      this.editError = 'Usuário não encontrado.';
    } else if (error.status === 400) {
      if (error.error?.errors) {
        const errors = error.error.errors;
        const firstKey = Object.keys(errors)[0];
        this.editError = errors[firstKey][0];
      } else if (error.error?.detail) {
        this.editError = error.error.detail;
      } else {
        this.editError = 'Dados inválidos fornecidos.';
      }
    } else {
      this.editError = error.error?.detail || error.error?.message || 'Erro ao atualizar usuário.';
    }
  }

  // ==================== AÇÕES DO MODAL ====================

  resetPassword(): void {
    if (!this.selectedUser) return;
    const finalPassword = this.passwordOption === 'auto' ? this.newPassword : this.manualPassword;
    if (!finalPassword) {
      this.resetError = 'Por favor, informe uma senha.';
      return;
    }
    if (this.passwordOption === 'manual' && !this.isPasswordValid()) {
      this.resetError = 'A senha não atende aos requisitos mínimos de segurança.';
      return;
    }
    this.isResetting = true;
    this.resetError = '';
    this.makeApiRequest(
      API_PATHS.ADMIN_RESET_PASSWORD(this.selectedUser.email),
      { newPassword: finalPassword },
      'reset',
      'Senha redefinida com sucesso',
    );
  }

  changeUserRole(): void {
    if (!this.selectedUser || !this.selectedRole) return;
    this.isChangingRole = true;
    this.changeRoleError = '';
    this.makeApiRequest(
      API_PATHS.ADMIN_CHANGE_ROLE(this.selectedUser.email),
      { role: this.selectedRole },
      'role',
      'Perfil alterado com sucesso',
    );
  }

  changeUserStatus(): void {
    if (!this.selectedUser || !this.selectedStatus) return;
    this.isChangingStatus = true;
    this.changeStatusError = '';
    this.makeApiRequest(
      API_PATHS.ADMIN_APPROVE_USER(this.selectedUser.email),
      { situation: this.selectedStatus },
      'status',
      'Status alterado com sucesso',
    );
  }

  private makeApiRequest(
    endpoint: string,
    body: any,
    action: 'reset' | 'role' | 'status',
    successMessage: string,
  ): void {
    const token = this.authService.getToken();
    if (!token) {
      this.setActionError(action, 'Usuário não autenticado. Faça login novamente.');
      this.setActionLoading(action, false);
      return;
    }
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
    this.http.put(buildApiUrl(endpoint), body, { headers, observe: 'response' }).subscribe({
      next: () => {
        this.setActionLoading(action, false);
        this.setActionSuccess(action, true);
        setTimeout(() => {
          this.closeUserModal();
          this.refreshUsers(); // Recarrega a lista atual
        }, 1500);
      },
      error: (error) => {
        this.setActionLoading(action, false);
        this.handleApiActionError(error, action);
      },
    });
  }

  private setActionLoading(action: 'reset' | 'role' | 'status', loading: boolean): void {
    if (action === 'reset') this.isResetting = loading;
    if (action === 'role') this.isChangingRole = loading;
    if (action === 'status') this.isChangingStatus = loading;
  }

  private setActionError(action: 'reset' | 'role' | 'status', error: string): void {
    if (action === 'reset') this.resetError = error;
    if (action === 'role') this.changeRoleError = error;
    if (action === 'status') this.changeStatusError = error;
  }

  private setActionSuccess(action: 'reset' | 'role' | 'status', success: boolean): void {
    if (action === 'reset') this.resetSuccess = success;
    if (action === 'role') this.changeRoleSuccess = success;
    if (action === 'status') this.changeStatusSuccess = success;
  }

  // ==================== UTILITÁRIOS ====================

  hasActiveFilters(): boolean {
    return this.searchTerm !== '' || this.statusFilter !== 'todos' || this.roleFilter !== 'todos';
  }

  getFilterSummary(): string {
    const filters = [];
    if (this.searchTerm) filters.push(`Busca: "${this.searchTerm}"`);
    if (this.statusFilter !== 'todos') {
      const label = this.statusOptions.find((opt) => opt.value === this.statusFilter)?.label;
      if (label) filters.push(`Status: ${label}`);
    }
    if (this.roleFilter !== 'todos') {
      const label = this.roleOptions.find((opt) => opt.value === this.roleFilter)?.label;
      if (label) filters.push(`Perfil: ${label}`);
    }
    return filters.join(', ');
  }

  // ==================== MANIPULAÇÃO DE ERROS ====================

  private handleApiError(error: any): void {
    if (error.status === 401) {
      this.apiError = 'Sessão expirada. Faça login novamente.';
      this.authService.logout();
    } else if (error.status === 403) {
      this.apiError = 'Você não tem permissão para acessar esta funcionalidade.';
    } else if (error.status === 404) {
      this.apiError = 'Endpoint não encontrado.';
    } else if (error.status === 400) {
      // Tenta extrair mensagem de erro do corpo da resposta
      if (error.error?.errors) {
        const errors = error.error.errors;
        const firstKey = Object.keys(errors)[0];
        if (firstKey) {
          this.apiError = errors[firstKey][0];
        } else {
          this.apiError = 'Erro nos parâmetros da requisição.';
        }
      } else if (error.error?.title) {
        this.apiError = error.error.title;
      } else {
        this.apiError = 'Erro nos parâmetros da requisição.';
      }
    } else if (error.status === 204) {
      this.users = [];
      this.totalUsers = 0;
      this.totalPages = 1;
      this.apiError = '';
    } else {
      this.apiError = `Erro ao carregar usuários: ${error.message || 'Erro desconhecido'}`;
    }
  }

  private handleApiActionError(error: any, action: 'reset' | 'role' | 'status'): void {
    let errorMessage = 'Erro ao processar a solicitação.';
    if (error.status === 401) {
      errorMessage = 'Sessão expirada. Faça login novamente.';
      this.authService.logout();
    } else if (error.status === 403) {
      errorMessage = 'Você não tem permissão para esta ação.';
    } else if (error.status === 404) {
      errorMessage = 'Usuário não encontrado.';
    } else if (error.status === 400) {
      if (error.error?.errors?.Situation) {
        errorMessage = error.error.errors.Situation[0];
      } else if (error.error?.detail) {
        errorMessage = error.error.detail;
      } else {
        errorMessage = 'Dados inválidos fornecidos.';
      }
    } else {
      errorMessage =
        error.error?.detail || error.error?.message || 'Erro ao processar a solicitação.';
    }
    this.setActionError(action, errorMessage);
  }
}
