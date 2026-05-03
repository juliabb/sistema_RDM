// src/app/pages/admin/rdm-validation/rdm-validation.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { interval, Subscription } from 'rxjs';
import { ModalComponent } from '../../../components/modal/modal.component';
import { AuthService, UserProfile } from '../../../services/auth-service';
import { DateFixerService } from '../../../services/date-fixer.service';
import { RdmValidationService, ValidationItem } from '../../../services/rdm-validation.service';
import { switchMap } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../../../components/confirmation-dialog/confirmation-dialog.component';
import { PaginationComponent } from '../../../components/pagination/pagination.component';

// Interface para os dados da lista
interface ItemValidacao {
  id?: string;
  rdm: string;
  solicitante: string;
  titulo: string;
  dataValidade: string;
  status: 'no-prazo' | 'vencido';
  resultado?: string;
  observacao?: string;
  validador?: string;
}

@Component({
  selector: 'app-rdm-validation',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    ModalComponent,
    MatButtonModule,
    MatTooltipModule,
    MatDialogModule,
    PaginationComponent,
  ],
  templateUrl: './rdm-validation.html',
  styleUrls: ['./rdm-validation.css'],
})
export class RdmValidationComponent implements OnInit, OnDestroy {
  // Listas de dados
  allItems: ItemValidacao[] = [];
  filteredItems: ItemValidacao[] = [];

  // Estados
  isLoading = false;
  errorMessage = '';

  // Controle de edição do campo de observação
  editandoObservacao = false;

  // Busca
  searchTerm = '';

  // Paginação
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 0;
  pageSizeOptions: number[] = [5, 10, 20, 50];

  // Controle do modal de resultado
  showResultModal = false;
  selectedItem: ItemValidacao | null = null;
  selectedResultado: 'cancelada' | 'sucesso' | 'sem-sucesso' | 'com-ressalva' | null = null;
  observacao = '';
  isProcessing = false;
  validadorNome = ''; // Será preenchido com o nome do admin logado

  // Propriedades dos filtros
  statusFilter: string = 'todos'; // 'todos' | 'no-prazo' | 'vencido'
  resultadoFilter: string = 'todos'; // 'todos' | 'cancelada' | 'sucesso' | 'sem-sucesso' | 'com-ressalva' | 'pendente'

  // Valores originais para detectar alterações
  observacaoOriginal: string = '';
  selectedResultadoOriginal: 'cancelada' | 'sucesso' | 'sem-sucesso' | 'com-ressalva' | null = null;

  // Opções do dropdown
  resultadoOptions: {
    value: 'cancelada' | 'sucesso' | 'sem-sucesso' | 'com-ressalva';
    label: string;
  }[] = [
    { value: 'cancelada', label: 'Cancelada' },
    { value: 'sucesso', label: 'Sucesso' },
    { value: 'sem-sucesso', label: 'Sem Sucesso' },
    { value: 'com-ressalva', label: 'Com Ressalva' },
  ];

  private userSubscription?: Subscription;
  private refreshSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    private dateFormatter: DateFixerService,
    private validationService: RdmValidationService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    // Obtém o nome do usuário atual para preencher o validador
    this.userSubscription = this.authService.currentUser$.subscribe((user: UserProfile | null) => {
      if (user) {
        this.validadorNome = user.name || user.email || 'Administrador';
      } else {
        this.validadorNome = 'Administrador';
      }
    });

    this.loadDataFromApi();

    this.refreshSubscription = interval(3600000) // 1 hora
      .pipe(
        switchMap(() => {
          // Recarrega a lista mantendo a página atual
          return this.validationService.getValidations(this.currentPage, this.pageSize);
        }),
      )
      .subscribe({
        next: (paginated) => {
          this.allItems = paginated.items.map((item) => this.mapApiToItem(item));
          this.totalItems = paginated.totalItems;
          this.totalPages = paginated.totalPages;
          this.applyFilters();
        },
        error: (err) => console.error('Erro na atualização periódica', err),
      });
  }

  ngOnDestroy(): void {
    if (this.userSubscription) this.userSubscription.unsubscribe();
    if (this.refreshSubscription) this.refreshSubscription.unsubscribe();
  }

  toggleEditarObservacao(): void {
    this.editandoObservacao = !this.editandoObservacao;
  }

  /**
   * Carrega os dados da API e mapeia para o formato interno, além de configurar a paginação
   */
  private loadDataFromApi(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.validationService.getValidations(this.currentPage, this.pageSize).subscribe({
      next: (paginated) => {
        // Mapeia os dados da API para o formato interno ItemValidacao
        this.allItems = paginated.items.map((item) => this.mapApiToItem(item));
        this.totalItems = paginated.totalItems;
        this.totalPages = paginated.totalPages;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar validações', err);
        this.errorMessage = 'Erro ao carregar lista de validações. Tente novamente.';
        this.isLoading = false;
      },
    });
  }

  /**
   * Formata um nome completo:
   * - Capitaliza a primeira letra de cada palavra.
   * - Se abreviar = true, retorna apenas o primeiro e o último nome.
   */
  formatarNome(nome: string, abreviar: boolean = true): string {
    if (!nome) return '';

    // Divide em palavras ignorando espaços extras
    const palavras = nome
      .trim()
      .split(/\s+/)
      .filter((p) => p.length > 0);
    if (palavras.length === 0) return '';

    // Capitaliza cada palavra (primeira letra maiúscula, resto minúsculo)
    const capitalizadas = palavras.map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase());

    if (abreviar && capitalizadas.length > 2) {
      // Pega o primeiro e o segundo nome (nome + sobrenome imediato)
      return `${capitalizadas[0]} ${capitalizadas[1]}`;
    } else {
      // Retorna o nome completo capitalizado
      return capitalizadas.join(' ');
    }
  }

  private mapApiToItem(apiItem: ValidationItem): ItemValidacao {
    const statusLower = apiItem.status?.toLowerCase() || '';
    const status: 'no-prazo' | 'vencido' = statusLower.includes('vencido') ? 'vencido' : 'no-prazo';

    const reviewerLower = apiItem.reviewer?.toLowerCase() || '';
    const validador = reviewerLower !== 'aguardando' ? apiItem.reviewer : undefined;

    return {
      rdm: apiItem.ticket,
      solicitante: apiItem.name,
      titulo: apiItem.title,
      dataValidade: apiItem.date,
      status: status,
      resultado: apiItem.result,
      observacao: apiItem.resultsDescription,
      validador: validador,
    };
  }

  /**
   * Formata data para exibição no padrão brasileiro com hora
   */
  formatDateDisplay(dateString: string): string {
    if (!dateString) return 'Não informado';
    // Supõe formato "DD-MM-YYYY HH:mm"
    const match = dateString.match(/^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2})$/);
    if (match) {
      const [_, day, month, year, hour, minute] = match;
      return `${day}/${month}/${year} ${hour}:${minute}`;
    }
    return dateString; // fallback
  }

  /**
   * Retorna a classe CSS para o status (verde/vermelho)
   */
  getStatusClass(status: 'no-prazo' | 'vencido'): string {
    return status === 'no-prazo' ? 'status-no-prazo' : 'status-vencido';
  }

  /**
   * Retorna o texto do status
   */
  getStatusText(status: 'no-prazo' | 'vencido'): string {
    return status === 'no-prazo' ? 'No prazo' : 'Vencido';
  }

  /**
   * Retorna a label do resultado
   */
  getResultadoLabel(resultado?: string): string {
    if (!resultado) return '';
    const opt = this.resultadoOptions.find((o) => o.value === resultado.toLowerCase());
    return opt ? opt.label : resultado;
  }

  getResultadoClass(resultado?: string): string {
    if (!resultado) return '';
    return 'resultado-' + resultado.toLowerCase();
  }

  /**
   * Verifica o espaço disponível abaixo do botão e ajusta o dropdown para abrir para cima se necessário
   */
  checkDropdownPosition(event: MouseEvent): void {
    const container = event.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropdownMenu = container.querySelector('.dropdown-menu') as HTMLElement;

    if (dropdownMenu) {
      // Altura aproximada do menu
      const menuHeight = 200;

      if (spaceBelow < menuHeight) {
        dropdownMenu.classList.add('dropdown-menu-up');
      } else {
        dropdownMenu.classList.remove('dropdown-menu-up');
      }
    }
  }

  /**
   * Abre o modal para definir o resultado
   * @param item Item selecionado
   */
  openModal(item: ItemValidacao): void {
    this.selectedItem = item;

    const resultado = item.resultado ? item.resultado.toLowerCase() : '';
    if (resultado === 'aberto' || !this.resultadoOptions.some((opt) => opt.value === resultado)) {
      this.selectedResultado = null;
    } else {
      this.selectedResultado = resultado as any;
    }

    this.observacao = item.observacao || '';

    this.selectedResultadoOriginal = this.selectedResultado;
    this.observacaoOriginal = this.observacao;

    // Define o estado inicial da edição da observação
    const pendente = !resultado || resultado === 'aberto';
    this.editandoObservacao = pendente; // true para novo, false para já validado

    this.showResultModal = true;
  }

  private temAlteracoes(): boolean {
    return (
      this.observacao !== this.observacaoOriginal ||
      this.selectedResultado !== this.selectedResultadoOriginal
    );
  }

  /**
   * Fecha o modal e limpa os dados
   */
  closeModal(forcarFechamento: boolean = false): void {
    if (forcarFechamento) {
      this.fecharModal();
      return;
    }

    if (!this.temAlteracoes() || this.isProcessing) {
      this.fecharModal();
      return;
    }

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      panelClass: 'dialog-acima-do-modal',
      data: {
        title: 'Alterações não salvas',
        message: 'Existem alterações não salvas. Deseja realmente sair?',
        confirmText: 'Sair',
        cancelText: 'Continuar editando',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.fecharModal();
      }
    });
  }

  /**
   * Método auxiliar
   */
  private fecharModal(): void {
    this.showResultModal = false;
    this.selectedItem = null;
    this.selectedResultado = null;
    this.observacao = '';
    this.isProcessing = false;

    // Limpa os valores originais
    this.observacaoOriginal = '';
    this.selectedResultadoOriginal = null;
  }

  /**
   * Confirma a validação
   */
  confirmarValidacao(): void {
    if (!this.selectedItem) return;
    if (!this.selectedResultado) {
      this.snackBar.open('Selecione um resultado antes de confirmar.', 'Fechar', {
        duration: 3000,
        panelClass: ['warning-snackbar'],
      });
      return;
    }

    this.isProcessing = true;

    this.validationService
      .updateResult(this.selectedItem.rdm, this.selectedResultado, this.observacao)
      .subscribe({
        next: () => {
          this.snackBar.open(
            `RDM ${this.selectedItem!.rdm} marcada como ${this.getResultadoLabel(this.selectedResultado!)}`,
            'Fechar',
            { duration: 3000, panelClass: ['success-snackbar'] },
          );

          // Atualiza o item na lista local
          const index = this.allItems.findIndex((i) => i.rdm === this.selectedItem!.rdm);
          if (index !== -1) {
            this.allItems[index] = {
              ...this.allItems[index],
              resultado: this.selectedResultado!,
              observacao: this.observacao,
              validador: this.validadorNome,
            };
            const filteredIndex = this.filteredItems.findIndex(
              (i) => i.rdm === this.selectedItem!.rdm,
            );
            if (filteredIndex !== -1) {
              this.filteredItems[filteredIndex] = { ...this.allItems[index] };
            }
          }

          this.closeModal(true); // força fechamento sem confirmação
        },
        error: (err) => {
          console.error('Erro ao atualizar resultado', err);
          this.snackBar.open('Erro ao salvar validação. Tente novamente.', 'Fechar', {
            duration: 5000,
            panelClass: ['error-snackbar'],
          });
          this.isProcessing = false;
        },
        complete: () => {
          this.isProcessing = false;
        },
      });
  }

  /**
   * Verifica se o usuário atual pode editar o item (select, observação e botão confirmar)
   * Regras:
   * - Se o item não possui resultado, qualquer um pode editar.
   * - Se possui resultado, apenas o validador original pode editar.
   */
  podeEditarItem(item: ItemValidacao | null): boolean {
    if (!item) return false;

    // Se não tem resultado ou é "aberto", qualquer um pode editar
    const resultado = item.resultado ? item.resultado.trim().toLowerCase() : '';
    if (!resultado || resultado === 'aberto') {
      return true;
    }

    // Se tem resultado, verifica se é o validador original
    const nomeValidadorItem = item.validador ? item.validador.trim() : '';
    const nomeUsuarioLogado = this.validadorNome.trim();

    if (!nomeValidadorItem || !nomeUsuarioLogado) return false;

    // Normaliza para lower case
    const nomeValidadorLower = nomeValidadorItem.toLowerCase();
    const nomeUsuarioLower = nomeUsuarioLogado.toLowerCase();

    // Separa o nome do validador em partes
    const partesValidador = nomeValidadorLower.split(/\s+/).filter((p) => p.length > 0);
    const primeiroNomeValidador = partesValidador[0] || '';
    const ultimoNomeValidador =
      partesValidador.length > 1 ? partesValidador[partesValidador.length - 1] : '';

    // Caso 1: o nome do usuário é exatamente o primeiro nome do validador
    if (primeiroNomeValidador === nomeUsuarioLower) {
      return true;
    }

    // Caso 2: o nome do usuário é a combinação "primeiro + último" do validador
    if (
      partesValidador.length > 1 &&
      nomeUsuarioLower === `${primeiroNomeValidador} ${ultimoNomeValidador}`
    ) {
      return true;
    }

    // Caso 3: fallback para a formatação abreviada (já existente)
    const validadorItemFormatado = this.formatarNome(nomeValidadorItem, true).toLowerCase();
    const usuarioLogadoFormatado = this.formatarNome(nomeUsuarioLogado, true).toLowerCase();

    if (
      validadorItemFormatado &&
      usuarioLogadoFormatado &&
      validadorItemFormatado === usuarioLogadoFormatado
    ) {
      return true;
    }

    return false;
  }

  /**
   * Aplica a paginação nos itens filtrados
   */
  searchItems(): void {
    if (!this.searchTerm.trim()) {
      this.filteredItems = [...this.allItems];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredItems = this.allItems.filter(
        (item) =>
          item.rdm.toLowerCase().includes(term) ||
          item.solicitante.toLowerCase().includes(term) ||
          item.titulo.toLowerCase().includes(term) ||
          (item.resultado
            ? this.getResultadoLabel(item.resultado).toLowerCase().includes(term)
            : false),
      );
    }
  }

  /**
   * Navega entre páginas
   */
  changePage(page: number): void {
    this.currentPage = page;
    this.searchItems();
    this.loadDataFromApi();
    window.scrollTo(0, 0);
  }

  // Altera o número de itens por página e recarrega os dados

  changePageSize(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.loadDataFromApi();
    // Se quiser manter os filtros aplicados, chame applyFilters() depois (o loadDataFromApi já chama applyFilters)
  }

  onPageChange(page: number): void {
    this.changePage(page);
  }

  onPageSizeChange(size: number): void {
    this.changePageSize(size);
  }

  /**
   * Aplica os filtros de busca, status e resultado na lista completa.
   * Atualiza filteredItems e mantém a paginação.
   */
  applyFilters(): void {
    let filtered = [...this.allItems];

    // Filtro por termo de busca
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.rdm.toLowerCase().includes(term) ||
          item.solicitante.toLowerCase().includes(term) ||
          item.titulo.toLowerCase().includes(term) ||
          (item.resultado
            ? this.getResultadoLabel(item.resultado).toLowerCase().includes(term)
            : false),
      );
    }

    // Filtro por Status
    if (this.statusFilter !== 'todos') {
      filtered = filtered.filter((item) => item.status === this.statusFilter);
    }

    // Filtro por Resultado
    if (this.resultadoFilter !== 'todos') {
      if (this.resultadoFilter === 'pendente') {
        // Itens sem resultado ou com resultado 'aberto'
        filtered = filtered.filter(
          (item) => !item.resultado || item.resultado.toLowerCase() === 'aberto',
        );
      } else {
        filtered = filtered.filter(
          (item) => item.resultado?.toLowerCase() === this.resultadoFilter,
        );
      }
    }

    this.filteredItems = filtered;
    // Ajusta a página atual se necessário (ex: filtro removeu itens da página atual)
    // Não resetamos a página para manter a experiência, mas você pode chamar changePage(1) se quiser.
  }

  // ==================== MÉTODOS DOS FILTROS ====================

  /**
   * Verifica se há algum filtro ativo (além do estado padrão)
   */
  hasActiveFilters(): boolean {
    return (
      this.searchTerm.trim() !== '' ||
      this.statusFilter !== 'todos' ||
      this.resultadoFilter !== 'todos'
    );
  }

  /**
   * Retorna um resumo textual dos filtros ativos
   */
  getFilterSummary(): string {
    const filters = [];
    if (this.searchTerm) filters.push(`Busca: "${this.searchTerm}"`);

    if (this.statusFilter !== 'todos') {
      const statusLabel = this.statusFilter === 'no-prazo' ? 'No prazo' : 'Vencido';
      filters.push(`Status: ${statusLabel}`);
    }

    if (this.resultadoFilter !== 'todos') {
      let resultLabel = '';
      if (this.resultadoFilter === 'pendente') {
        resultLabel = 'Pendente';
      } else {
        const opt = this.resultadoOptions.find((o) => o.value === this.resultadoFilter);
        resultLabel = opt ? opt.label : this.resultadoFilter;
      }
      filters.push(`Resultado: ${resultLabel}`);
    }

    return filters.join(', ');
  }

  /**
   * Limpa todos os filtros e reaplica
   */
  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = 'todos';
    this.resultadoFilter = 'todos';
    this.applyFilters();
  }

  refreshData(): void {
    this.loadDataFromApi();
  }

  /**
   * Visualizar detalhes completos
   */
  viewDetails(rdm: string): void {
    const isAdmin = this.authService.isAdmin();
    if (isAdmin) {
      this.router.navigate(['/admin/rdm', rdm]);
    } else {
      this.router.navigate(['/rdm-details', rdm]);
    }
  }
}
