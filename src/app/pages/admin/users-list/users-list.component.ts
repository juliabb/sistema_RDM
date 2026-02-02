// src/app/pages/admin/users-list/users-list.component.ts
// USUÁRIOS CADASTRADOS (APROVADO, REPROVADO E PENDENTE)
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { SharedMaterialModule } from '../../../shared/ui';
import { ModalComponent } from '../../../components/modal/modal.component';
import { API_PATHS, buildApiUrl } from '../../../config/api.config';
import { AuthService } from '../../../services/auth-services';

// Interfaces principais
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
  originalSituation: string;
  role: string;
  registrationDate?: string;
}

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [FormsModule, CommonModule, SharedMaterialModule, ModalComponent],
  templateUrl: './users-list.html',
  styleUrls: ['./users-list.css'],
})
export class UsersListComponent implements OnInit {
  // Propriedades principais
  allUsers: RegisteredUser[] = [];
  displayedUsers: RegisteredUser[] = [];
  searchTerm = '';
  statusFilter = 'todos';
  roleFilter = 'todos';
  currentPage = 1;
  pageSize = 10;
  totalUsers = 0;
  totalPages = 1;
  isLoading = false;
  isLoadingAll = false;
  apiError = '';
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

  // Configurações
  statusOptions = [
    { value: 'todos', label: 'Todos os Status' },
    { value: 'Aprovado', label: 'Aprovado' },
    { value: 'Pendente', label: 'Pendente' },
    { value: 'Reprovado', label: 'Reprovado' },
  ];

  roleOptions = [
    { value: 'todos', label: 'Todos os Perfis' },
    { value: 'administrador', label: 'Administrador' },
    { value: 'teamMember', label: 'Padrão' },
  ];

  modalRoleOptions = [
    { value: 'administrador', label: 'Administrador' },
    { value: 'teamMember', label: 'Padrão' },
  ];

  modalStatusOptions = [
    { value: 'Aprovado', label: 'Aprovado' },
    { value: 'Reprovado', label: 'Reprovado' },
    { value: 'Pendente', label: 'Pendente' },
  ];

  private situationMapping: { [key: string]: string } = {
    // Aprovado
    Aprovado: 'Aprovado',
    aprovado: 'Aprovado',

    // Pendente
    Pendente: 'Pendente',
    pendente: 'Pendente',

    // Reprovado
    Reprovado: 'Reprovado',
    reprovado: 'Reprovado',
  };

  constructor(private http: HttpClient, private authService: AuthService) {}

  ngOnInit(): void {
    // Primeiro carrega todos os usuários
    this.loadAllUsersForFiltering();
  }

  // ==================== CARREGAMENTO DE DADOS ====================

  /** Carrega TODOS os usuários para filtragem local */
  private loadAllUsersForFiltering(): void {
    this.isLoadingAll = true;

    const token = this.authService.getToken();
    if (!token) {
      this.isLoadingAll = false;
      return;
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      accept: 'text/plain',
    });

    // Primeiro carrega a página 1 com tamanho 50 para começar
    const initialParams = new HttpParams().set('PageNumber', '1').set('PageSize', '50');

    this.http
      .get<ApiUser[]>(buildApiUrl(API_PATHS.ADMIN_LIST_USERS), {
        headers,
        params: initialParams,
      })
      .subscribe({
        next: (response) => {
          if (Array.isArray(response)) {
            // Converte para RegisteredUser
            this.allUsers = response.map((user) => this.formatUserFromApi(user));

            // Se houver mais páginas, carrega o restante
            // Como não sabemos o total, assumimos que se veio 50, tem mais
            if (response.length === 50) {
              this.loadRemainingUsers(token, headers, 2);
            } else {
              this.isLoadingAll = false;
              // Após carregar todos, aplica os filtros e mostra a página 1
              this.applyFiltersAndLoadPage(1);
            }
          } else {
            console.warn('Resposta não é um array:', response);
            this.allUsers = [];
            this.isLoadingAll = false;
            this.applyFiltersAndLoadPage(1);
          }
        },
        error: (error) => {
          console.error('Erro ao carregar usuários iniciais:', error);

          // Tenta carregar sem parâmetros de paginação
          this.tryLoadUsersWithoutPagination(token, headers);
        },
      });
  }

  /** Tenta carregar usuários sem paginação */
  private tryLoadUsersWithoutPagination(token: string, headers: HttpHeaders): void {
    this.http
      .get<ApiUser[]>(buildApiUrl(API_PATHS.ADMIN_LIST_USERS), {
        headers,
      })
      .subscribe({
        next: (response) => {
          if (Array.isArray(response)) {
            this.allUsers = response.map((user) => this.formatUserFromApi(user));
          } else {
            this.allUsers = [];
          }

          this.isLoadingAll = false;
          this.applyFiltersAndLoadPage(1);
        },
        error: (error) => {
          console.error('Erro ao carregar usuários sem paginação:', error);
          this.handleApiError(error);
          this.isLoadingAll = false;
          // Mesmo com erro, tenta carregar a primeira página normalmente
          this.loadUsers(1);
        },
      });
  }

  /** Carrega usuários restantes página por página */
  private loadRemainingUsers(token: string, headers: HttpHeaders, pageNumber: number): void {
    const params = new HttpParams().set('PageNumber', pageNumber.toString()).set('PageSize', '50');

    this.http
      .get<ApiUser[]>(buildApiUrl(API_PATHS.ADMIN_LIST_USERS), {
        headers,
        params,
      })
      .subscribe({
        next: (response) => {
          if (Array.isArray(response) && response.length > 0) {
            // Adiciona os novos usuários
            const newUsers = response.map((user) => this.formatUserFromApi(user));
            this.allUsers = [...this.allUsers, ...newUsers];

            // Se ainda houver mais páginas, continua carregando
            if (response.length === 50) {
              this.loadRemainingUsers(token, headers, pageNumber + 1);
            } else {
              this.isLoadingAll = false;
              // Após carregar todos, aplica os filtros
              this.applyFiltersAndLoadPage(1);
            }
          } else {
            // Não há mais usuários
            this.isLoadingAll = false;
            this.applyFiltersAndLoadPage(1);
          }
        },
        error: (error) => {
          console.error(`Erro ao carregar página ${pageNumber}:`, error);
          this.isLoadingAll = false;
          // Continua com os usuários já carregados
          this.applyFiltersAndLoadPage(1);
        },
      });
  }

  /** Carrega uma página específica da API (para exibição inicial) */
  private loadUsers(pageNumber: number = this.currentPage): void {
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

    const params = new HttpParams()
      .set('PageNumber', pageNumber.toString())
      .set('PageSize', this.pageSize.toString());

    this.http
      .get<ApiUser[]>(buildApiUrl(API_PATHS.ADMIN_LIST_USERS), {
        headers,
        params,
      })
      .subscribe({
        next: (response) => {
          if (Array.isArray(response)) {
            this.displayedUsers = response.map((user) => this.formatUserFromApi(user));
            // Se ainda não carregou todos os usuários para filtragem, atualiza o cache
            if (this.allUsers.length === 0) {
              this.allUsers = [...this.displayedUsers];
            }
            // Para uma estimativa inicial do total
            if (this.totalUsers === 0) {
              // Se recebemos menos que o pageSize, esse é o total
              if (response.length < this.pageSize) {
                this.totalUsers = response.length;
              } else {
                // Se recebemos pageSize, assumimos que tem mais
                this.totalUsers = response.length * 2;
              }
              this.totalPages = Math.ceil(this.totalUsers / this.pageSize);
            }
          } else {
            this.displayedUsers = [];
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erro ao carregar página:', error);

          // Tenta carregar sem paginação
          if (error.status === 400) {
            this.tryLoadSinglePageWithoutPagination(headers);
          } else {
            this.handleApiError(error);
            this.isLoading = false;
          }
        },
      });
  }

  /** Tenta carregar uma única página sem paginação */
  private tryLoadSinglePageWithoutPagination(headers: HttpHeaders): void {
    this.http
      .get<ApiUser[]>(buildApiUrl(API_PATHS.ADMIN_LIST_USERS), {
        headers,
      })
      .subscribe({
        next: (response) => {
          if (Array.isArray(response)) {
            this.displayedUsers = response.map((user) => this.formatUserFromApi(user));
            this.allUsers = [...this.displayedUsers];
            this.totalUsers = response.length;
            this.totalPages = 1;
          }
          this.isLoading = false;
        },
        error: (error) => {
          this.handleApiError(error);
          this.isLoading = false;
        },
      });
  }

  /** Formata usuário da API para exibição */
  private formatUserFromApi(apiUser: ApiUser): RegisteredUser {
    const originalSituation = apiUser.situation;
    const displaySituation = this.getDisplaySituation(originalSituation);

    return {
      name: apiUser.name || 'Não informado',
      email: apiUser.email || 'Não informado',
      department: apiUser.department || 'Não informado',
      situation: displaySituation,
      originalSituation: originalSituation,
      role: apiUser.role || 'user',
      registrationDate: new Date().toLocaleDateString('pt-BR'),
    };
  }

  /** Converte situação da API para formato padronizado */
  private getDisplaySituation(situation: string): string {
    if (!situation) return 'Pendente';

    // Primeiro verifica se já está no formato correto
    if (situation === 'Aprovado' || situation === 'Pendente' || situation === 'Reprovado') {
      return situation;
    }

    // Converte para minúsculas para comparação
    const situationLower = situation.toLowerCase().trim();

    // Verifica todas as variações possíveis
    if (
      situationLower.includes('ativo') ||
      situationLower.includes('active') ||
      situationLower.includes('aprovado')
    ) {
      return 'Aprovado';
    }

    if (situationLower.includes('pendente') || situationLower.includes('pending')) {
      return 'Pendente';
    }

    if (
      situationLower.includes('inativo') ||
      situationLower.includes('inactive') ||
      situationLower.includes('reprovado')
    ) {
      return 'Reprovado';
    }

    // Se não for nenhum dos conhecidos, usa o mapping ou retorna como está
    if (this.situationMapping[situation]) {
      return this.situationMapping[situation];
    }

    return situation;
  }

  // ==================== FILTROS E BUSCA ====================

  /** Aplica filtros localmente nos usuários carregados */
  private applyFilters(): RegisteredUser[] {
    if (this.allUsers.length === 0) {
      return this.displayedUsers; // Retorna os usuários da página atual se não carregou todos
    }

    let filtered = [...this.allUsers];

    // Filtro de busca por texto
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(term) ||
          user.email.toLowerCase().includes(term) ||
          user.department.toLowerCase().includes(term)
      );
    }

    // Filtro por status
    if (this.statusFilter !== 'todos') {
      filtered = filtered.filter(
        (user) => user.situation.toLowerCase() === this.statusFilter.toLowerCase()
      );
    }

    // Filtro por role (perfil)
    if (this.roleFilter !== 'todos') {
      filtered = filtered.filter((user) => {
        const userRole = user.role.toLowerCase();
        const filterRole = this.roleFilter.toLowerCase();

        // Mapeamento para comparação flexível
        if (filterRole === 'administrador') {
          return userRole === 'administrador' || userRole === 'admin';
        } else if (filterRole === 'teammember') {
          return userRole === 'teammember' || userRole.includes('team');
        } else {
          return userRole === filterRole;
        }
      });
    }

    return filtered;
  }

  /** Aplica filtros e carrega a página especificada */
  private applyFiltersAndLoadPage(pageNumber: number): void {
    const filteredUsers = this.applyFilters();
    this.totalUsers = filteredUsers.length;
    this.totalPages = Math.ceil(this.totalUsers / this.pageSize);
    this.currentPage = Math.min(pageNumber, this.totalPages || 1);

    // Calcula os usuários para a página atual
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.displayedUsers = filteredUsers.slice(startIndex, endIndex);
  }

  /** Busca usuários - aplica filtros localmente */
  searchUsers(): void {
    this.applyFiltersAndLoadPage(1);
  }

  /** Filtra por status - aplica filtros localmente */
  filterByStatus(): void {
    this.applyFiltersAndLoadPage(1);
  }

  /** Filtra por perfil - aplica filtros localmente */
  filterByRole(): void {
    this.applyFiltersAndLoadPage(1);
  }

  /** Atualiza lista completa de usuários */
  refreshUsers(): void {
    this.allUsers = []; // Limpa cache
    this.loadAllUsersForFiltering();
  }

  /** Limpa todos os filtros aplicados */
  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = 'todos';
    this.roleFilter = 'todos';
    this.applyFiltersAndLoadPage(1);
  }

  // ==================== FORMATAÇÃO E ESTILIZAÇÃO ====================

  /** Formata o role para exibição amigável */
  formatRole(role: string): string {
    if (!role) return 'Usuário';
    const roles: { [key: string]: string } = {
      administrador: 'Administrador',
      admin: 'Administrador',
      teamMember: 'Padrão',
      teammember: 'Padrão',
      user: 'Usuário',
      member: 'Membro',
    };
    return roles[role.toLowerCase()] || role;
  }

  /** Retorna classe CSS para estilização do role */
  getRoleClass(role: string): string {
    if (!role) return 'role-default';
    const roleLower = role.toLowerCase();
    if (roleLower === 'administrador' || roleLower === 'admin') return 'role-admin';
    if (roleLower === 'teammember' || roleLower === 'member') return 'role-member';
    return 'role-default';
  }

  /** Retorna classe CSS para estilização da situação */
  getSituationClass(situation: string): string {
    if (!situation) return 'status-default';
    const situationLower = situation.toLowerCase();
    if (situationLower === 'aprovado') return 'status-approved';
    if (situationLower === 'pendente') return 'status-pending';
    if (situationLower === 'reprovado') return 'status-rejected';
    return 'status-default';
  }

  // ==================== GERENCIAMENTO DO MODAL ====================

  /** Abre modal para gerenciar usuário selecionado */
  openUserModal(user: RegisteredUser): void {
    this.selectedUser = user;
    this.newPassword = this.generateRandomPassword();
    this.manualPassword = '';
    this.selectedRole = user.role;
    this.selectedStatus = user.situation;
    this.passwordOption = 'auto';
    this.resetModalStates();
    this.activeTab = 'info';
    this.showUserModal = true;
  }

  /** Fecha modal e limpa todos os estados */
  closeUserModal(): void {
    this.showUserModal = false;
    this.selectedUser = null;
    this.newPassword = '';
    this.manualPassword = '';
    this.selectedRole = '';
    this.selectedStatus = '';
    this.passwordOption = 'auto';
    this.isResetting = false;
    this.isChangingRole = false;
    this.isChangingStatus = false;
    this.resetModalStates();
    this.activeTab = 'info';
  }

  private resetModalStates(): void {
    this.resetError = '';
    this.resetSuccess = false;
    this.changeRoleError = '';
    this.changeRoleSuccess = false;
    this.changeStatusError = '';
    this.changeStatusSuccess = false;
  }

  setActiveTab(tab: 'info' | 'password' | 'role' | 'status'): void {
    this.activeTab = tab;
  }
  setPasswordOption(option: 'auto' | 'manual'): void {
    this.passwordOption = option;
    if (option === 'auto' && !this.newPassword) this.newPassword = this.generateRandomPassword();
    if (option === 'manual') this.manualPassword = '';
  }

  // ==================== FUNCIONALIDADES DE SENHA ====================

  /** Gera senha aleatória segura */
  generateRandomPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) password += chars.charAt(Math.floor(Math.random() * chars.length));
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

  /** Calcula força da senha (0-5) */
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

  /** Valida se senha atende aos requisitos mínimos */
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

  // ==================== AÇÕES DO MODAL (API) ====================

  /** Redefine senha do usuário */
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
      'Senha redefinida com sucesso'
    );
  }

  /** Altera perfil (role) do usuário */
  changeUserRole(): void {
    if (!this.selectedUser || !this.selectedRole) return;
    this.isChangingRole = true;
    this.changeRoleError = '';
    this.makeApiRequest(
      API_PATHS.ADMIN_CHANGE_ROLE(this.selectedUser.email),
      { role: this.selectedRole },
      'role',
      'Perfil alterado com sucesso'
    );
  }

  /** Altera status do usuário */
  changeUserStatus(): void {
    if (!this.selectedUser || !this.selectedStatus) return;
    this.isChangingStatus = true;
    this.changeStatusError = '';
    this.makeApiRequest(
      API_PATHS.ADMIN_APPROVE_USER(this.selectedUser.email),
      { situation: this.selectedStatus },
      'status',
      'Status alterado com sucesso'
    );
  }

  /** Método genérico para requisições à API */
  private makeApiRequest(
    endpoint: string,
    body: any,
    action: 'reset' | 'role' | 'status',
    successMessage: string
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
        this.updateLocalUser(action);
        setTimeout(() => {
          this.closeUserModal();
          this.refreshUsers(); // Recarrega todos os usuários para pegar as mudanças
        }, 2000);
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

  private updateLocalUser(action: 'reset' | 'role' | 'status'): void {
    if (!this.selectedUser) return;
    const userIndex = this.allUsers.findIndex((u) => u.email === this.selectedUser!.email);
    if (userIndex !== -1) {
      if (action === 'role') this.allUsers[userIndex].role = this.selectedRole;
      if (action === 'status') {
        this.allUsers[userIndex].situation = this.selectedStatus;
        this.allUsers[userIndex].originalSituation = this.selectedStatus;
      }
    }
  }

  // ==================== PAGINAÇÃO ====================

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.applyFiltersAndLoadPage(page);
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.applyFiltersAndLoadPage(this.currentPage + 1);
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.applyFiltersAndLoadPage(this.currentPage - 1);
    }
  }

  onPageSizeChange(): void {
    this.applyFiltersAndLoadPage(1);
  }

  goToFirstPage(): void {
    if (this.currentPage !== 1) {
      this.applyFiltersAndLoadPage(1);
    }
  }

  goToLastPage(): void {
    if (this.currentPage !== this.totalPages) {
      this.applyFiltersAndLoadPage(this.totalPages);
    }
  }

  getStartIndex(): number {
    const start = (this.currentPage - 1) * this.pageSize + 1;
    return Math.min(start, this.totalUsers);
  }

  getEndIndex(): number {
    const end = this.currentPage * this.pageSize;
    return Math.min(end, this.totalUsers);
  }

  hasNextPage(): boolean {
    return this.currentPage < this.totalPages;
  }

  hasPrevPage(): boolean {
    return this.currentPage > 1;
  }

  /** Retorna array de páginas para exibição na paginação */
  get pages(): number[] {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  // ==================== UTILITÁRIOS ====================

  /** Verifica se há filtros ativos */
  hasActiveFilters(): boolean {
    return this.searchTerm !== '' || this.statusFilter !== 'todos' || this.roleFilter !== 'todos';
  }

  /** Retorna texto resumido dos filtros ativos */
  getFilterSummary(): string {
    const filters = [];
    if (this.searchTerm) filters.push(`Busca: "${this.searchTerm}"`);
    if (this.statusFilter !== 'todos')
      filters.push(
        `Status: ${this.statusOptions.find((opt) => opt.value === this.statusFilter)?.label}`
      );
    if (this.roleFilter !== 'todos')
      filters.push(
        `Perfil: ${this.roleOptions.find((opt) => opt.value === this.roleFilter)?.label}`
      );
    return filters.join(', ');
  }

  // ==================== MANIPULAÇÃO DE ERROS ====================

  private handleApiError(error: any): void {
    console.error('Erro ao carregar usuários:', error);

    if (error.status === 400) {
      this.apiError = 'Erro nos parâmetros da requisição. Ajustando paginação...';
    } else if (error.status === 401) {
      this.apiError = 'Sessão expirada. Faça login novamente.';
    } else if (error.status === 403) {
      this.apiError = 'Você não tem permissão para acessar esta funcionalidade.';
    } else if (error.status === 404) {
      this.apiError = 'Endpoint não encontrado. Verifique a configuração da API.';
    } else if (error.status === 204) {
      this.allUsers = [];
      this.displayedUsers = [];
      this.totalUsers = 0;
      this.totalPages = 1;
      this.apiError = '';
    } else {
      this.apiError = `Erro ao carregar usuários: ${error.message || 'Erro desconhecido'}`;
    }
  }

  private handleApiActionError(error: any, action: 'reset' | 'role' | 'status'): void {
    console.error(`Erro na ação ${action}:`, error);
    let errorMessage = 'Erro ao processar a solicitação. Tente novamente.';

    if (error.status === 401) errorMessage = 'Sessão expirada. Faça login novamente.';
    else if (error.status === 403) errorMessage = 'Você não tem permissão para esta ação.';
    else if (error.status === 404) errorMessage = 'Usuário não encontrado.';
    else if (error.status === 400) {
      const errorMessages = error.error?.errorMessages || [];
      if (errorMessages.length > 0) errorMessage = `Erro: ${errorMessages.join(', ')}`;
      else if (error.error?.errors?.Situation)
        errorMessage = `Erro: ${error.error.errors.Situation[0]}`;
      else if (error.error?.detail) errorMessage = error.error.detail;
      else if (action === 'status')
        errorMessage = 'Status inválido. Use apenas "Aprovado", "Pendente" ou "Reprovado".';
      else errorMessage = error.error?.detail || 'Dados inválidos fornecidos.';
    } else {
      errorMessage =
        error.error?.detail ||
        error.error?.message ||
        'Erro ao processar a solicitação. Tente novamente.';
    }

    this.setActionError(action, errorMessage);
  }
}
