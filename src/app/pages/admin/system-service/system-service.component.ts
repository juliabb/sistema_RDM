// src/app/pages/admin/system-service/system-service.component.ts
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, OnInit } from '@angular/core';
import { SystemServiceApi, SystemService, PaginationInfo } from '../../../services/system.service';
import { ModalComponent } from '../../../components/modal/modal.component';
import { PaginationComponent } from '../../../components/pagination/pagination.component';

@Component({
  selector: 'app-system-service',
  imports: [CommonModule, FormsModule, ModalComponent, PaginationComponent],
  templateUrl: './system-service.html',
  styleUrls: ['./system-service.css'],
})
export class SystemServiceComponent implements OnInit {
  systemsPage: SystemService[] = [];
  paginationInfo: PaginationInfo = {
    currentPage: 1,
    itemsPerPage: 10,
    totalItems: 0,
    totalPages: 1,
  };

  isLoading = false;
  apiError: string | null = null;
  originalSystemName: string = '';

  // Filtros – devem bater com o novo HTML
  searchSystem = '';
  searchDepartment = '';
  statusFilter = ''; // vazio = "todos"

  statusOptions = [
    { value: '', label: 'Todos' },
    { value: 'Ativo', label: 'Ativo' },
    { value: 'Inativo', label: 'Inativo' },
  ];

  pageSizeOptions = [5, 10, 20, 50];

  // Modal
  showSystemModal = false;
  isEditing = false;
  selectedSystem: SystemService = {
    systemService: '',
    department: '',
    status: 'Ativo',
  };
  modalTitle = 'Novo Sistema';
  modalError: string | null = null;
  modalSuccess: string | null = null;

  constructor(private systemService: SystemServiceApi) {}

  ngOnInit(): void {
    this.loadSystems();
  }

  loadSystems(): void {
    this.isLoading = true;
    this.apiError = null;

    this.systemService
      .getSystemsPaginated(
        this.paginationInfo.currentPage,
        this.paginationInfo.itemsPerPage,
        this.searchSystem,
        this.searchDepartment,
        this.statusFilter,
      )
      .subscribe({
        next: (response) => {
          this.systemsPage = response.data;
          this.paginationInfo = response.pagination;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Erro ao carregar sistemas:', err);
          this.apiError = 'Não foi possível carregar os sistemas. Tente novamente mais tarde.';
          this.isLoading = false;
        },
      });
  }

  // Chamado pelos inputs via (ngModelChange)
  onSearchChange(): void {
    this.paginationInfo.currentPage = 1;
    this.loadSystems();
  }

  // Chamado pelos chips de status
  setStatusFilter(value: string): void {
    this.statusFilter = value;
    this.paginationInfo.currentPage = 1;
    this.loadSystems();
  }

  clearFilters(): void {
    this.searchSystem = '';
    this.searchDepartment = '';
    this.statusFilter = '';
    this.paginationInfo.currentPage = 1;
    this.loadSystems();
  }

  hasActiveFilters(): boolean {
    return (
      this.searchSystem.trim().length > 0 ||
      this.searchDepartment.trim().length > 0 ||
      this.statusFilter !== ''
    );
  }

  getActiveFilterCount(): number {
    let count = 0;
    if (this.searchSystem.trim()) count++;
    if (this.searchDepartment.trim()) count++;
    if (this.statusFilter) count++;
    return count;
  }

  onPageChange(page: number): void {
    this.paginationInfo.currentPage = page;
    this.loadSystems();
  }

  onPageSizeChange(size: number): void {
    this.paginationInfo.currentPage = 1;
    this.paginationInfo.itemsPerPage = size;
    this.loadSystems();
  }

  // --- Modal ---
  openNewSystemModal(): void {
    this.isEditing = false;
    this.modalTitle = 'Novo Sistema';
    this.selectedSystem = { systemService: '', department: '', status: 'Ativo' };
    this.modalError = null;
    this.modalSuccess = null;
    this.showSystemModal = true;
  }

  openEditSystemModal(system: SystemService): void {
    this.isEditing = true;
    this.modalTitle = 'Editar Sistema';
    this.selectedSystem = { ...system };
    this.originalSystemName = system.systemService;
    this.modalError = null;
    this.modalSuccess = null;
    this.showSystemModal = true;
  }

  closeModal(): void {
    this.showSystemModal = false;
    this.selectedSystem = { systemService: '', department: '', status: 'Ativo' };
    this.modalError = null;
    this.modalSuccess = null;
  }

  saveSystem(): void {
    if (!this.selectedSystem.systemService.trim()) {
      this.modalError = 'O nome do sistema é obrigatório.';
      return;
    }
    if (!this.selectedSystem.department.trim()) {
      this.modalError = 'O departamento é obrigatório.';
      return;
    }

    this.selectedSystem.department = this.selectedSystem.department.trim().toUpperCase();

    this.modalError = null;
    this.isLoading = true;

    if (this.isEditing) {
      this.systemService.updateSystem(this.originalSystemName, this.selectedSystem).subscribe({
        next: () => {
          this.modalSuccess = 'Sistema atualizado com sucesso!';
          setTimeout(() => {
            this.closeModal();
            this.loadSystems();
          }, 1500);
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Erro ao atualizar sistema:', err);
          this.modalError = 'Erro ao atualizar sistema. Verifique os dados e tente novamente.';
          this.isLoading = false;
        },
      });
    } else {
      this.systemService.createSystem(this.selectedSystem).subscribe({
        next: () => {
          this.modalSuccess = 'Sistema criado com sucesso!';
          setTimeout(() => {
            this.closeModal();
            this.loadSystems();
          }, 1500);
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Erro ao criar sistema:', err);
          if (err.status === 400) {
            this.modalError = 'Dados inválidos. Verifique os campos.';
          } else if (err.status === 409) {
            this.modalError = 'Já existe um sistema com este nome.';
          } else {
            this.modalError = 'Erro ao criar sistema. Tente novamente.';
          }
          this.isLoading = false;
        },
      });
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Ativo':
        return 'status-active';
      case 'Inativo':
        return 'status-inactive';
      default:
        return 'status-default';
    }
  }
}
