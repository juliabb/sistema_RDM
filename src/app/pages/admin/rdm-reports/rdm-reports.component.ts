import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Chart from 'chart.js/auto';
import {
  ReportService,
  RdmAmountReport,
  SystemServiceQuantity,
} from '../../../services/report-service';
import { MatIconModule } from '@angular/material/icon';
import { SystemService, SystemServiceApi } from '../../../services/system.service';

// Importações para exportação PDF
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-rdm-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './rdm-reports.html',
  styleUrls: ['./rdm-reports.css'],
})
export class RdmReportsComponent implements OnInit, AfterViewInit, OnDestroy {
  // Filtros de data
  dataInicial: string = '';
  dataFinal: string = '';

  // Dados do relatório
  totalSolicitacoes: number = 0;
  quantidadePadroes: number = 0;
  quantidadeNormais: number = 0;
  quantidadeEmergenciais: number = 0;
  aprovadas: number = 0;
  reprovadas: number = 0;
  executadaSucesso: number = 0;
  executadaRessalva: number = 0;
  executadaSemSucesso: number = 0;
  cancelada: number = 0;
  servicosData: SystemServiceQuantity[] = [];
  alturaGraficoServicos: number = 400;

  allSystems: SystemService[] = [];
  filteredSystemsOptions: SystemService[] = [];
  selectedSystem: string = '';

  isGeneratingPDF = false;

  isLoading = false;

  // Referências aos canvas
  @ViewChild('tipoChart') tipoChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('aprovacaoChart') aprovacaoChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('execucaoChart') execucaoChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('aplicacoesChart') aplicacoesChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('servicosChart') servicosChartRef!: ElementRef<HTMLCanvasElement>;
  private servicosChart: any;

  private tipoChart: any;
  private aprovacaoChart: any;
  private execucaoChart: any;
  private aplicacoesChart: any;

  // Cores personalizadas para os gráficos
  private chartColors = this.getChartColors();

  private getChartColors() {
    const isDark = document.body.classList.contains('dark-theme');

    return {
      primary: isDark ? '#22d3ee' : '#00b8d9',
      primaryLight: isDark ? '#67e8f9' : '#67e8f9',
      primaryDark: isDark ? '#0891b2' : '#006b86',

      secondary: isDark ? '#8b5cf6' : '#6d28d9',
      secondaryLight: isDark ? '#a78bfa' : '#8b5cf6',
      secondaryDark: isDark ? '#7c3aed' : '#4c1d95',

      success: isDark ? '#66bb6a' : '#15803d',
      warning: isDark ? '#fbbf24' : '#f59e0b',
      error: isDark ? '#ff4d4f' : '#dc2626',

      neutral: isDark ? '#94a3b8' : '#64748b',

      info: isDark ? '#67e8f9' : '#0077b6',

      grid: isDark ? 'rgba(203, 213, 225, 0.18)' : 'rgba(100, 116, 139, 0.16)',
      text: isDark ? '#e2e8f0' : '#334155',
    };
  }

  constructor(
    private reportService: ReportService,
    private systemService: SystemServiceApi,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.definirDatasParaMesAtual();
    this.loadSystemsForFilters();
    this.carregarDados();

    this.currentThemeIsDark = document.body.classList.contains('dark-theme');

    this.themeObserver = new MutationObserver(() => {
      const isDarkNow = document.body.classList.contains('dark-theme');

      if (isDarkNow !== this.currentThemeIsDark) {
        this.currentThemeIsDark = isDarkNow;
        this.chartColors = this.getChartColors();

        setTimeout(() => {
          this.criarGraficos();

          if (this.selectedSystem) {
            this.criarGraficoServicosDoDetalhe(this.selectedSystem, this.totalSolicitacoes);
          } else {
            this.criarGraficoServicos();
          }
        }, 100);
      }
    });

    this.themeObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  ngAfterViewInit(): void {
    // Os gráficos serão criados após o carregamento dos dados
  }

  ngOnDestroy(): void {
    this.destruirGraficos();

    if (this.themeObserver) {
      this.themeObserver.disconnect();
    }
  }

  atualizar(): void {
    if (this.selectedSystem) {
      this.carregarDadosFiltrados();
    } else {
      this.carregarDados();
    }
  }

  // Carrega os sistemas e departamentos para os filtros
  loadSystemsForFilters(): void {
    this.systemService.getAllSystems().subscribe({
      next: (systems: SystemService[]) => {
        this.allSystems = systems;
        this.filteredSystemsOptions = [...systems];
      },
      error: (err: any) => console.error('Erro ao buscar sistemas para filtros', err),
    });
  }

  onSystemChange(sys: string): void {
    this.selectedSystem = sys;
    if (sys) {
      this.carregarDadosFiltrados(); // carrega detalhes do sistema selecionado
    } else {
      this.carregarDados(); // volta para visão geral
    }
  }

  carregarDadosFiltrados(): void {
    if (!this.selectedSystem) {
      this.criarGraficoServicosDoDetalhe(this.selectedSystem, this.totalSolicitacoes);
      this.carregarDados();
      return;
    }

    this.isLoading = true;
    const start = this.dataInicial;
    const end = this.dataFinal;

    this.reportService.getSystemDetail(start, end, this.selectedSystem).subscribe({
      next: (data) => {
        // data é um array com um objeto (ex.: [{ systemService: 'CTX', ... }])
        this.preencherCardsDoDetalhe(data);
        this.criarGraficos();
        this.criarGraficoServicosDoDetalhe(this.selectedSystem, this.totalSolicitacoes);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar detalhes do sistema:', err);
        this.isLoading = false;
      },
    });
  }

  // Método para preencher os cards do detalhe com os dados do sistema selecionado
  preencherCardsDoDetalhe(data: any[]): void {
    let total = 0;
    let padrao = 0,
      normal = 0,
      emergencial = 0;
    let aprovadas = 0,
      reprovadas = 0,
      canceladas = 0;
    let sucesso = 0,
      ressalva = 0,
      semSucesso = 0;

    for (const sistema of data) {
      // Tipos
      if (sistema.rdmType) {
        for (const t of sistema.rdmType) {
          total += t.quantity;
          if (t.type === 'Padrão') padrao += t.quantity;
          else if (t.type === 'Normal') normal += t.quantity;
          else if (t.type === 'Emergencial') emergencial += t.quantity;
        }
      }

      // Status
      if (sistema.rdmStatus) {
        for (const s of sistema.rdmStatus) {
          // total já foi calculado pelos tipos
          if (s.status === 'Aprovado') aprovadas += s.quantity;
          else if (s.status === 'Reprovado') reprovadas += s.quantity;
          else if (s.status === 'Cancelada') canceladas += s.quantity;
        }
      }

      // Resultados
      if (sistema.rdmResult) {
        for (const r of sistema.rdmResult) {
          if (r.result === 'sucesso') sucesso += r.quantity;
          else if (r.result === 'com-ressalva') ressalva += r.quantity;
          else if (r.result === 'sem-sucesso') semSucesso += r.quantity;
          else if (r.result === 'cancelada') canceladas += r.quantity;
        }
      }
    }

    this.totalSolicitacoes = total;
    this.quantidadePadroes = padrao;
    this.quantidadeNormais = normal;
    this.quantidadeEmergenciais = emergencial;
    this.aprovadas = aprovadas;
    this.reprovadas = reprovadas;
    this.executadaSucesso = sucesso;
    this.executadaRessalva = ressalva;
    this.executadaSemSucesso = semSucesso;
    this.cancelada = canceladas;
  }

  /**
   * Define dataInicial como primeiro dia do mês atual e dataFinal como último dia do mês atual.
   */
  definirDatasParaMesAtual(): void {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth(); // 0-11

    // Primeiro dia do mês
    const primeiroDia = new Date(ano, mes, 1);
    // Último dia do mês
    const ultimoDia = new Date(ano, mes + 1, 0); // dia 0 do próximo mês = último dia do mês atual

    // Formatar para YYYY-MM-DD
    this.dataInicial = this.formatarData(primeiroDia);
    this.dataFinal = this.formatarData(ultimoDia);
  }

  /**
   * Formata uma data no padrão YYYY-MM-DD.
   */
  formatarData(data: Date): string {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private themeObserver?: MutationObserver;
  private currentThemeIsDark = false;

  carregarDadosServicos(): void {
    this.reportService.getSystemServicesReport(this.dataInicial, this.dataFinal).subscribe({
      next: (data: SystemServiceQuantity[]) => {
        // Fazer join com sistemas para ter o departamento
        const enriched = data.map((item) => {
          const sys = this.allSystems.find((s) => s.systemService === item.systemService);
          return {
            ...item,
            department: sys ? sys.department : 'Outros',
          };
        });
        // Aplicar filtros
        let filtered = enriched;
        if (this.selectedSystem) {
          filtered = filtered.filter((item) => item.systemService === this.selectedSystem);
        }
        this.servicosData = filtered;
        this.criarGraficoServicos();
      },
      error: (err) => {
        console.error('Erro ao carregar dados de serviços:', err);
      },
    });
  }

  // Método para criar gráfico de serviços do detalhe (quando um sistema específico é selecionado)
  criarGraficoServicosDoDetalhe(nomeSistema: string, total: number): void {
    this.servicosData = [{ systemService: nomeSistema, quantity: total }];
    this.criarGraficoServicos();
  }

  // Método para criar gráfico de serviços (visão geral ou detalhe)
  criarGraficoServicos(): void {
    this.chartColors = this.getChartColors();

    if (this.servicosChart) {
      this.servicosChart.destroy();
    }

    const ctx = this.servicosChartRef?.nativeElement.getContext('2d');
    if (!ctx) return;

    // Ordena todos os dados
    const sorted: SystemServiceQuantity[] = [...this.servicosData].sort(
      (a, b) => b.quantity - a.quantity,
    );

    // Top 10
    const topItems: SystemServiceQuantity[] = sorted.slice(0, 9);

    //Restante
    const others = sorted.slice(9);

    // Soma dos "Outros"
    if (others.length > 0) {
      const othersTotal = others.reduce(
        (sum: number, item: SystemServiceQuantity) => sum + item.quantity,
        0,
      );

      topItems.push({
        systemService: 'Outros',
        quantity: othersTotal,
      });
    }

    const labels = topItems.map((item) => item.systemService);
    const quantities = topItems.map((item) => item.quantity);

    // Altura dinâmica (mais compacta)
    const alturaPorItem = 40;
    const alturaMinima = 600;
    const alturaCalculada = Math.max(alturaMinima, topItems.length * alturaPorItem + 100);
    this.alturaGraficoServicos = alturaCalculada;

    // Criação do gráfico
    this.servicosChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Quantidade de Solicitações',
            data: quantities,
            backgroundColor: 'rgba(0, 184, 217, 0.68)',
            hoverBackgroundColor: this.chartColors.primaryLight,
            hoverBorderColor: this.chartColors.secondaryDark,
            borderColor: this.chartColors.primaryDark,

            borderWidth: 1,

            // Ajuste visual das barras
            barThickness: 18,
            maxBarThickness: 22,
            categoryPercentage: 0.7,
            barPercentage: 0.6,
            borderRadius: 6,
          },
        ],
      },
      options: {
        indexAxis: 'y', // gráfico horizontal
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: this.chartColors.text,
              font: {
                size: 13,
              },
            },
          },
          tooltip: {
            titleColor: this.chartColors.text,
            bodyColor: this.chartColors.text,
            backgroundColor: document.body.classList.contains('dark-theme') ? '#1e293b' : '#ffffff',
            borderColor: this.chartColors.grid,
            borderWidth: 1,
          },
        },
        scales: {
          x: {
            ticks: {
              color: this.chartColors.text,
            },
            grid: {
              color: this.chartColors.grid,
            },
          },
          y: {
            ticks: {
              color: this.chartColors.text,
            },
            grid: {
              color: this.chartColors.grid,
            },
          },
        },
      },
    });
  }

  destruirGraficos(): void {
    if (this.tipoChart) {
      this.tipoChart.destroy();
      this.tipoChart = null;
    }
    if (this.aprovacaoChart) {
      this.aprovacaoChart.destroy();
      this.aprovacaoChart = null;
    }
    if (this.execucaoChart) {
      this.execucaoChart.destroy();
      this.execucaoChart = null;
    }
    if (this.aplicacoesChart) {
      this.aplicacoesChart.destroy();
      this.aplicacoesChart = null;
    }
    if (this.servicosChart) {
      this.servicosChart.destroy();
      this.servicosChart = null;
    }
  }

  carregarDados(): void {
    this.isLoading = true;
    this.reportService.getRdmAmountReport(this.dataInicial, this.dataFinal).subscribe({
      next: (data: RdmAmountReport) => {
        this.totalSolicitacoes = data.quantity;
        this.quantidadePadroes = data.defaultQuantity;
        this.quantidadeNormais = data.normalQuantity;
        this.quantidadeEmergenciais = data.emergencyRdmQuantity;
        this.aprovadas = data.approvedCount;
        this.reprovadas = data.rejectedCount;
        this.executadaSucesso = data.successfulExecutedCount;
        this.executadaSemSucesso = data.withoutSuccessExecutedCount;
        this.executadaRessalva = data.executedWithRemarksCount;
        this.cancelada = data.canceledCount;

        this.criarGraficos();
        this.carregarDadosServicos();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar dados:', err);
        this.isLoading = false;
      },
    });
  }

  criarGraficos(): void {
    this.chartColors = this.getChartColors();

    this.destruirGraficos();

    const tipoCtx = this.tipoChartRef?.nativeElement.getContext('2d');

    if (tipoCtx) {
      this.tipoChart = new Chart(tipoCtx, {
        type: 'pie',
        data: {
          labels: ['Padrão', 'Normal', 'Emergencial'],
          datasets: [
            {
              data: [this.quantidadePadroes, this.quantidadeNormais, this.quantidadeEmergenciais],
              backgroundColor: [
                this.chartColors.primary,
                this.chartColors.secondary,
                this.chartColors.warning,
              ],
              borderWidth: 3,
              borderColor: '#ffffff',
            },
          ],
        },
        options: {
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: this.chartColors.text,
                font: {
                  size: 13,
                },
                padding: 16,
              },
            },
            tooltip: {
              titleColor: this.chartColors.text,
              bodyColor: this.chartColors.text,
              backgroundColor: document.body.classList.contains('dark-theme')
                ? '#1e293b'
                : '#ffffff',
              borderColor: this.chartColors.grid,
              borderWidth: 1,
            },
          },
        },
      });
    }

    const aprovCtx = this.aprovacaoChartRef?.nativeElement.getContext('2d');
    if (aprovCtx) {
      this.aprovacaoChart = new Chart(aprovCtx, {
        type: 'doughnut',
        data: {
          labels: ['Aprovadas', 'Reprovadas'],
          datasets: [
            {
              data: [this.aprovadas, this.reprovadas],
              backgroundColor: [this.chartColors.success, this.chartColors.error],
              borderWidth: 2,
              borderColor: '#ffffff',
            },
          ],
        },
        options: {
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: this.chartColors.text,
                font: {
                  size: 13,
                },
                padding: 16,
              },
            },
            tooltip: {
              titleColor: this.chartColors.text,
              bodyColor: this.chartColors.text,
              backgroundColor: document.body.classList.contains('dark-theme')
                ? '#1e293b'
                : '#ffffff',
              borderColor: this.chartColors.grid,
              borderWidth: 1,
            },
          },
        },
      });
    }

    const execCtx = this.execucaoChartRef?.nativeElement.getContext('2d');
    if (execCtx) {
      this.execucaoChart = new Chart(execCtx, {
        type: 'bar',
        options: {
          responsive: true,
          maintainAspectRatio: false,

          plugins: {
            legend: {
              display: false,
            },
            tooltip: {
              titleColor: this.chartColors.text,
              bodyColor: this.chartColors.text,
              backgroundColor: document.body.classList.contains('dark-theme')
                ? '#1e293b'
                : '#ffffff',
              borderColor: this.chartColors.grid,
              borderWidth: 1,
            },
          },
          scales: {
            x: {
              ticks: {
                color: this.chartColors.text,
              },
              grid: {
                color: this.chartColors.grid,
              },
            },
            y: {
              beginAtZero: true, // garante que o zero seja mostrado
              ticks: {
                color: this.chartColors.text,
                stepSize: 1, // força intervalos de 1 em 1
                callback: (value: any) => {
                  if (Number.isInteger(value)) {
                    return value; // mostra só números inteiros
                  }
                  return null; // esconde os decimais
                },
              },
              grid: { color: this.chartColors.grid },
            },
          },
        },
        data: {
          labels: [
            'Executada com Sucesso',
            'Executada com Ressalva',
            'Executadas sem sucesso',
            'Cancelada',
          ],
          datasets: [
            {
              data: [
                this.executadaSucesso,
                this.executadaRessalva,
                this.executadaSemSucesso,
                this.cancelada,
              ],
              backgroundColor: [
                this.chartColors.success,
                this.chartColors.warning,
                this.chartColors.error,
                this.chartColors.neutral,
              ],
              borderWidth: 2,
              borderColor: '#ffffff',
            },
          ],
        },
      });
    }
  }

  exportarExcel(): void {
    if (!this.dataInicial || !this.dataFinal) return;
    this.isLoading = true; // ou uma flag específica para exportação
    this.reportService.downloadExcel(this.dataInicial, this.dataFinal).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dataIniExcel = this.formatarDataParaNome(this.dataInicial);
        const dataFimExcel = this.formatarDataParaNome(this.dataFinal);
        let nomeExcel = `relatorio_${dataIniExcel}_${dataFimExcel}`;
        if (this.selectedSystem) {
          nomeExcel += `_${this.selectedSystem}`;
        }
        a.download = `${nomeExcel}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erro ao baixar Excel:', err);
        this.isLoading = false;
      },
    });
  }

  // Método para exportar o relatório como PDF usando html2canvas e jsPDF
  async exportarPDF(): Promise<void> {
    this.isGeneratingPDF = true;
    this.cdr.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 200));

    const secaoCards = document.getElementById('secao-cards') as HTMLElement;
    const secaoGraficos = document.getElementById('secao-graficos-superiores') as HTMLElement;
    const secaoServicos = document.getElementById('secao-grafico-servicos') as HTMLElement;

    if (!secaoCards || !secaoGraficos || !secaoServicos) {
      console.error('Seções não encontradas');
      this.isGeneratingPDF = false;
      return;
    }

    const htmlEl = document.documentElement;
    const bodyEl = document.body;
    const origHtmlStyle = htmlEl.getAttribute('style') || '';
    const origBodyStyle = bodyEl.getAttribute('style') || '';

    const elementoPrincipal = document.querySelector('.reports-container') as HTMLElement;
    const originalWidth = elementoPrincipal.style.width;
    const originalMaxWidth = elementoPrincipal.style.maxWidth;

    try {
      // Prepara o ambiente
      htmlEl.style.cssText = 'height: auto !important; overflow: visible !important;';
      bodyEl.style.cssText = 'height: auto !important; overflow: visible !important;';
      document.body.classList.add('pdf-export-mode');

      const larguraDesejada = '1120px';
      elementoPrincipal.style.width = larguraDesejada;
      elementoPrincipal.style.maxWidth = larguraDesejada;

      // ========== PÁGINA 1: Cards ==========
      secaoCards.style.maxHeight = 'none';
      secaoCards.style.overflow = 'visible';
      secaoGraficos.style.display = 'none';
      secaoServicos.style.display = 'none';

      // Forçar cores nos textos que usam variáveis CSS (título e labels dos filtros)
      const tituloH2 = secaoCards.querySelector('h2') as HTMLElement;
      if (tituloH2) tituloH2.style.color = '#1f2937';

      const labelsFiltro = secaoCards.querySelectorAll('.filtro-item label');
      labelsFiltro.forEach((el) => ((el as HTMLElement).style.color = '#1f2937'));
      // Fim do ajuste de cor

      await new Promise((resolve) => setTimeout(resolve, 200));

      const canvasCards = await html2canvas(secaoCards, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const imgDataCards = canvasCards.toDataURL('image/png');

      // ========== PÁGINA 2: Gráficos superiores ==========
      secaoCards.style.display = 'none';
      secaoGraficos.style.display = '';
      secaoServicos.style.display = 'none';

      secaoGraficos.style.height = '450px';
      secaoGraficos.style.overflow = 'visible';
      secaoGraficos.style.maxHeight = 'none';

      const containersGraficos = secaoGraficos.querySelectorAll('.chart-container');
      containersGraficos.forEach((c) => {
        (c as HTMLElement).style.maxHeight = 'none';
      });

      if (this.tipoChart) this.tipoChart.resize();
      if (this.aprovacaoChart) this.aprovacaoChart.resize();
      if (this.execucaoChart) this.execucaoChart.resize();

      await new Promise((resolve) => setTimeout(resolve, 300));

      const canvasGraficos = await html2canvas(secaoGraficos, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const imgDataGraficos = canvasGraficos.toDataURL('image/png');

      // ========== PÁGINA 3: Gráfico de serviços ==========
      secaoCards.style.display = 'none';
      secaoGraficos.style.display = 'none';
      secaoServicos.style.display = '';

      const containerFull = secaoServicos.querySelector('.chart-container-full') as HTMLElement;
      if (containerFull) {
        containerFull.style.height = '650px';
        containerFull.style.maxHeight = 'none';
        containerFull.style.overflow = 'visible';
      }
      const wrapper = secaoServicos.querySelector('.chart-wrapper-horizontal') as HTMLElement;
      const canvasServicosElement = wrapper?.querySelector('canvas') as HTMLElement;
      if (canvasServicosElement) {
        canvasServicosElement.style.maxHeight = 'none';
        canvasServicosElement.style.height = '100%';
        canvasServicosElement.style.width = '100%';
      }
      if (wrapper) wrapper.style.overflow = 'visible';

      if (this.servicosChart) {
        this.servicosChart.resize();
      }

      await new Promise((resolve) => setTimeout(resolve, 300));

      const capturedCanvasServicos = await html2canvas(secaoServicos, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const imgDataServicos = capturedCanvasServicos.toDataURL('image/png');

      // ========== Montagem do PDF ==========
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Margem desejada (em mm)
      const margem = 10;

      // Área útil para a imagem
      const larguraUtil = pageWidth - 2 * margem;
      const alturaUtil = pageHeight - 2 * margem;

      // Página 1: Cards
      const imgHeightCards = (canvasCards.height * larguraUtil) / canvasCards.width;
      pdf.addImage(imgDataCards, 'PNG', margem, margem, larguraUtil, imgHeightCards);

      // Página 2: Gráficos superiores
      pdf.addPage();
      const imgHeightGraficos = (canvasGraficos.height * larguraUtil) / canvasGraficos.width;
      pdf.addImage(imgDataGraficos, 'PNG', margem, margem, larguraUtil, imgHeightGraficos);

      // Página 3: Serviços
      pdf.addPage();
      const imgHeightServicos =
        (capturedCanvasServicos.height * larguraUtil) / capturedCanvasServicos.width;
      pdf.addImage(imgDataServicos, 'PNG', margem, margem, larguraUtil, imgHeightServicos);

      const dataIni = this.formatarDataParaNome(this.dataInicial);
      const dataFim = this.formatarDataParaNome(this.dataFinal);
      let nomeArquivo = `relatorio_${dataIni}_${dataFim}`;

      if (this.selectedSystem) {
        nomeArquivo += `_${this.selectedSystem}`;
      }

      pdf.save(`${nomeArquivo}.pdf`);
    } catch (erro) {
      console.error('Erro ao gerar PDF:', erro);
    } finally {
      // Restaura as cores forçadas
      const tituloH2 = document.querySelector('#secao-cards h2') as HTMLElement;
      if (tituloH2) tituloH2.style.color = '';

      const labelsFiltro = document.querySelectorAll('#secao-cards .filtro-item label');
      labelsFiltro.forEach((el) => ((el as HTMLElement).style.color = ''));

      // Restaura tudo
      document.body.classList.remove('pdf-export-mode');
      htmlEl.setAttribute('style', origHtmlStyle);
      bodyEl.setAttribute('style', origBodyStyle);

      ['secao-cards', 'secao-graficos-superiores', 'secao-grafico-servicos'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
          el.style.display = '';
          el.style.height = '';
          el.style.maxHeight = '';
          el.style.overflow = '';
        }
      });

      if (elementoPrincipal) {
        elementoPrincipal.style.width = originalWidth;
        elementoPrincipal.style.maxWidth = originalMaxWidth;
      }

      document.querySelectorAll('#secao-graficos-superiores .chart-container').forEach((c) => {
        (c as HTMLElement).style.maxHeight = '';
      });

      this.isGeneratingPDF = false;
      this.isLoading = false;
      this.cdr.detectChanges();

      setTimeout(() => {
        if (this.tipoChart) this.tipoChart.resize();
        if (this.aprovacaoChart) this.aprovacaoChart.resize();
        if (this.execucaoChart) this.execucaoChart.resize();
        if (this.servicosChart) this.servicosChart.resize();
      }, 100);
    }
  }

  private formatarDataParaNome(dataISO: string): string {
    // dataISO no formato "YYYY-MM-DD"
    const partes = dataISO.split('-');
    if (partes.length === 3) {
      const [ano, mes, dia] = partes;
      return `${dia}-${mes}-${ano}`;
    }
    return dataISO; // fallback
  }

  filtrar(): void {
    if (this.selectedSystem) {
      this.carregarDadosFiltrados();
    } else {
      this.carregarDados();
      this.carregarDadosServicos();
    }
  }

  clearSystemFilter(): void {
    this.selectedSystem = '';
    this.carregarDados();
  }

  // Método opcional para voltar ao mês atual
  voltarParaMesAtual(): void {
    this.definirDatasParaMesAtual();
    this.filtrar();
  }
}
