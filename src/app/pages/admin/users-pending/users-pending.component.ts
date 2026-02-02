// src/app/pages/admin/users-pending/users-pending.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ModalComponent } from '../../../components/modal/modal.component';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { API_PATHS, buildApiUrl } from '../../../config/api.config';
import { AuthService } from '../../../services/auth-services';

// Interfaces
interface PendingUser {
  name: string;
  email: string;
  situation: string;
}

interface UserDetail {
  name: string;
  email: string;
  department: string;
  situation: string;
  role: string;
}

interface ModalUserData {
  name: string;
  email: string;
  department: string;
  situation: string;
  role: string;
  registrationDate?: string;
}

// Interface para a resposta específica de pendentes
interface PendingUsersResponse {
  usersPending: PendingUser[];
}

@Component({
  selector: 'app-users-pending',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent, MatIconModule, MatButtonModule],
  templateUrl: './users-pending.html',
  styleUrls: ['./users-pending.css'],
})
export class PendingUsersComponent implements OnInit {
  pendingUsers: PendingUser[] = [];
  filteredUsers: PendingUser[] = [];
  isLoading = false;
  errorMessage = '';
  searchTerm = '';

  // Para modal
  showModal = false;
  modalTitle = 'Alterar Status do Usuário';
  selectedUser: ModalUserData | null = null;

  // Campos do modal
  selectedStatus = '';

  // Estados de processamento
  isChangingStatus = false;

  // Mensagens
  changeStatusError = '';
  changeStatusSuccess = false;

  // Opções para select
  modalStatusOptions = [
    { value: 'Aprovado', label: 'Aprovado' },
    { value: 'Reprovado', label: 'Reprovado' },
  ];

  constructor(private http: HttpClient, private authService: AuthService) {}

  ngOnInit(): void {
    this.loadPendingUsers();
  }

  // Método principal para carregar usuários pendentes usando o endpoint específico
  loadPendingUsers(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const token = this.authService.getToken();
    if (!token) {
      this.errorMessage = 'Usuário não autenticado. Faça login novamente.';
      this.isLoading = false;
      return;
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      accept: 'text/plain',
    });

    // Usando o endpoint específico para usuários pendentes
    this.loadPendingUsersFromApi(headers);
  }

  // Carrega usuários pendentes do endpoint específico
  private loadPendingUsersFromApi(headers: HttpHeaders): void {
    console.log('Carregando usuários pendentes específicos...');

    // Usando o endpoint
    const url = buildApiUrl(API_PATHS.ADMIN_BASE);

    console.log(`Carregando usuários pendentes de: ${url}`);

    this.http.get<PendingUsersResponse>(url, { headers }).subscribe({
      next: (response) => {
        console.log('Resposta de usuários pendentes:', response);

        if (response && response.usersPending && Array.isArray(response.usersPending)) {
          // Processa os usuários pendentes retornados
          this.processPendingUsers(response.usersPending);
        } else {
          console.warn('Nenhum usuário pendente encontrado na resposta:', response);
          this.pendingUsers = [];
          this.filteredUsers = [];
          this.errorMessage = 'Nenhum usuário pendente encontrado.';
        }

        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erro ao carregar usuários pendentes específicos:', error);
        this.handleLoadError(error);
        this.isLoading = false;
      },
    });
  }

  // Processa a lista de usuários pendentes do endpoint
  private processPendingUsers(pendingUsers: PendingUser[]): void {
    console.log(`Processando ${pendingUsers.length} usuário(s) pendente(s) do endpoint específico`);

    // Garante que a situação está formatada corretamente (case-insensitive)
    this.pendingUsers = pendingUsers.map((user) => ({
      name: user.name || 'Não informado',
      email: user.email || '',
      situation: this.formatSituationForDisplay(user.situation),
    }));

    this.filteredUsers = [...this.pendingUsers];

    if (this.pendingUsers.length === 0) {
      this.errorMessage = 'Nenhum usuário pendente encontrado.';
    } else {
      this.errorMessage = '';
    }
  }

  // Formata a situação para exibição
  private formatSituationForDisplay(situation: string): string {
    if (!situation || situation.trim() === '') {
      return 'Pendente';
    }

    const sit = situation.toLowerCase().trim();

    // Verifica em minúsculo para pegar as variações
    if (
      sit.includes('aprovado')
    ) {
      return 'Aprovado';
    }

    if (
      sit.includes('reprovado')
    ) {
      return 'Reprovado';
    }

    if (sit.includes('pendente')) {
      return 'Pendente';
    }

    // Se a situação já está em um dos formatos corretos, mantém
    if (situation === 'Aprovado' || situation === 'Pendente' || situation === 'Reprovado') {
      return situation;
    }

    // Se não reconhecer, retorna como está
    return situation;
  }

  private handleLoadError(error: any): void {
    console.error('Erro ao carregar usuários pendentes:', error);

    if (error.status === 401) {
      this.errorMessage = 'Sessão expirada. Faça login novamente.';
      this.authService.logout();
    } else if (error.status === 403) {
      this.errorMessage = 'Você não tem permissão para acessar esta funcionalidade.';
    } else if (error.status === 404) {
      this.errorMessage = 'Endpoint não encontrado. Verifique se o endpoint de usuários pendentes está disponível.';
    } else if (error.status === 400) {
      this.errorMessage = 'Requisição inválida: ' + (error.error?.title || 'Verifique os parâmetros.');
    } else if (error.status === 204) {
      this.pendingUsers = [];
      this.filteredUsers = [];
      this.errorMessage = 'Nenhum usuário pendente encontrado.';
    } else {
      this.errorMessage = `Erro ao carregar usuários pendentes: ${error.message || 'Erro desconhecido'}`;
    }
  }

  // Método para abrir modal
  openUserModal(pendingUser: PendingUser): void {
    this.modalTitle = 'Gerenciar Usuário Pendente';

    // Resetar estados
    this.changeStatusError = '';
    this.changeStatusSuccess = false;

    // Carregar detalhes do usuário
    this.loadUserDetails(pendingUser.email);
  }

  // Carregar detalhes do usuário da API (array)
  private loadUserDetails(email: string): void {
    if (!email || email.trim() === '') {
      this.showNotification('Email não fornecido', 'error');
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      this.showNotification('Usuário não autenticado. Faça login novamente.', 'error');
      return;
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      accept: 'text/plain',
    });

    const url = buildApiUrl(API_PATHS.ADMIN_GET_USER(email));

    console.log('Carregando detalhes do usuário:', email);

    // IMPORTANTE: O endpoint retorna um ARRAY
    this.http.get<UserDetail[]>(url, { headers }).subscribe({
      next: (userDetailsArray) => {
        console.log('Detalhes do usuário carregados (array):', userDetailsArray);

        if (Array.isArray(userDetailsArray) && userDetailsArray.length > 0) {
          // Pega o primeiro elemento do array (que contém os dados do usuário)
          const userDetails = userDetailsArray[0];

          console.log('Dados extraídos do array:', userDetails);

          // Converter dados da API para o modal
          this.selectedUser = {
            name: userDetails.name || 'Não informado',
            email: userDetails.email || email,
            department: userDetails.department || 'Não informado',
            situation: this.formatSituationForDisplay(userDetails.situation),
            role: userDetails.role || 'user',
            registrationDate: new Date().toLocaleDateString('pt-BR'),
          };

          console.log('Usuário processado para modal:', this.selectedUser);
        } else {
          // Se o array estiver vazio, usa dados básicos
          console.warn('Array de detalhes do usuário está vazio');
          this.useBasicUserData(email);
        }

        // Inicializar status - para usuários pendentes, sugerir aprovação como padrão
        this.selectedStatus = 'Aprovado';

        this.showModal = true;
      },
      error: (error) => {
        console.error('Erro ao carregar detalhes do usuário:', error);
        this.useBasicUserData(email, error);
      },
    });
  }

  // Usa dados básicos do usuário pendente
  private useBasicUserData(email: string, error?: any): void {
    // Encontra o usuário na lista de pendentes
    const pendingUser = this.pendingUsers.find((u) => u.email === email);

    this.selectedUser = {
      name: pendingUser?.name || 'Não informado',
      email: pendingUser?.email || email,
      department: 'Não informado',
      situation: pendingUser?.situation || 'Pendente',
      role: 'user',
      registrationDate: new Date().toLocaleDateString('pt-BR'),
    };

    console.log('Usando dados básicos para usuário:', this.selectedUser);

    if (error) {
      if (error.status === 404) {
        this.showNotification('Usuário não encontrado na base completa.', 'warning');
      } else {
        this.showNotification(
          'Erro ao carregar detalhes completos. Algumas informações podem estar indisponíveis.',
          'warning'
        );
      }
    }
  }

  // Processa a alteração de status
  changeUserStatus(): void {
    if (!this.selectedUser || !this.selectedStatus) return;

    this.isChangingStatus = true;
    this.changeStatusError = '';

    const token = this.authService.getToken();
    if (!token) {
      this.changeStatusError = 'Usuário não autenticado. Faça login novamente.';
      this.isChangingStatus = false;
      return;
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });

    const body = {
      situation: this.selectedStatus,
    };

    const url = buildApiUrl(API_PATHS.ADMIN_APPROVE_USER(this.selectedUser.email));

    console.log('Alterando status do usuário:', this.selectedUser.email);

    this.http.put(url, body, { headers, observe: 'response' }).subscribe({
      next: (response) => {
        console.log('Status alterado com sucesso:', response);

        this.isChangingStatus = false;
        this.changeStatusSuccess = true;

        // Remove da lista de pendentes
        this.pendingUsers = this.pendingUsers.filter((u) => u.email !== this.selectedUser!.email);
        this.filteredUsers = this.filteredUsers.filter((u) => u.email !== this.selectedUser!.email);

        this.showNotification(
          `✅ Usuário ${this.selectedStatus.toLowerCase()} com sucesso!`,
          'success'
        );

        // Fecha após 2 segundos
        setTimeout(() => {
          this.closeModal();
        }, 2000);
      },
      error: (error) => {
        this.isChangingStatus = false;
        console.error('Erro ao alterar status:', error);

        if (error.status === 401) {
          this.changeStatusError = 'Sessão expirada. Faça login novamente.';
          this.authService.logout();
        } else if (error.status === 403) {
          this.changeStatusError = 'Você não tem permissão para alterar status.';
        } else if (error.status === 404) {
          this.changeStatusError = 'Usuário não encontrado.';
        } else if (error.status === 400) {
          const errorMessages = error.error?.errorMessages || [];
          if (errorMessages.length > 0) {
            this.changeStatusError = `Erro: ${errorMessages.join(', ')}`;
          } else if (error.error?.errors?.Situation) {
            this.changeStatusError = `Erro: ${error.error.errors.Situation[0]}`;
          } else {
            this.changeStatusError = 'Status inválido. Use apenas "Aprovado" ou "Reprovado".';
          }
        } else {
          this.changeStatusError =
            error.error?.detail ||
            error.error?.message ||
            'Erro ao alterar status. Tente novamente.';
        }
      },
    });
  }

  // Fecha o modal
  closeModal(): void {
    this.showModal = false;
    this.selectedUser = null;
    this.selectedStatus = '';
    this.isChangingStatus = false;
    this.changeStatusError = '';
    this.changeStatusSuccess = false;
  }

  // Métodos auxiliares da tabela
  viewUserDetails(email: string): void {
    const user = this.pendingUsers.find((u) => u.email === email);
    if (user) {
      this.openUserModal(user);
    }
  }

  openApproveModal(user: PendingUser): void {
    this.openUserModal(user);
    // Pré-seleciona "Aprovado"
    setTimeout(() => {
      this.selectedStatus = 'Aprovado';
    }, 100);
  }

  openRejectModal(user: PendingUser): void {
    this.openUserModal(user);
    // Pré-seleciona "Reprovado"
    setTimeout(() => {
      this.selectedStatus = 'Reprovado';
    }, 100);
  }

  getSituationClass(situation: string): string {
    if (!situation) return 'status-default';
    const situationLower = situation.toLowerCase();
    if (situationLower === 'aprovado') return 'status-success';
    if (situationLower === 'pendente') return 'status-warning';
    if (situationLower === 'reprovado') return 'status-danger';
    return 'status-default';
  }

  searchUsers(): void {
    if (!this.searchTerm.trim()) {
      this.filteredUsers = [...this.pendingUsers];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredUsers = this.pendingUsers.filter(
      (user) =>
        (user.name && user.name.toLowerCase().includes(term)) ||
        (user.email && user.email.toLowerCase().includes(term)) ||
        (user.situation && user.situation.toLowerCase().includes(term))
    );
  }

  // Formata o role para exibição mais amigável
  formatRole(role: string): string {
    if (!role) return 'Usuário';

    const roles: { [key: string]: string } = {
      administrador: 'Administrador',
      teamMember: 'Padrão',
    };

    return roles[role.toLowerCase()] || role;
  }

  // Retorna classe CSS para estilização do role
  getRoleClass(role: string): string {
    if (!role) return 'role-default';
    const roleLower = role.toLowerCase();
    if (roleLower === 'administrador') return 'role-admin';
    if (roleLower === 'teammember') return 'role-member';
    return 'role-default';
  }

  // Método para mostrar notificações
  showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
    const existingNotification = document.querySelector('.custom-notification');
    if (existingNotification) {
      document.body.removeChild(existingNotification);
    }

    const notification = document.createElement('div');
    notification.className = 'custom-notification';

    let backgroundColor = '#17a2b8'; // info
    if (type === 'success') {
      backgroundColor = '#28a745';
    } else if (type === 'error') {
      backgroundColor = '#dc3545';
    } else if (type === 'warning') {
      backgroundColor = '#ffc107';
      notification.style.color = '#212529';
    }

    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${backgroundColor};
      color: ${type === 'warning' ? '#212529' : 'white'};
      padding: 12px 20px;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      font-size: 14px;
      opacity: 0;
      transform: translateY(-20px);
      transition: all 0.3s ease;
      max-width: 400px;
      word-break: break-word;
    `;

    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateY(0)';
    }, 10);

    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateY(-20px)';
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 4000);
  }

  // Método para recarregar os dados
  refreshData(): void {
    this.loadPendingUsers();
  }
}
