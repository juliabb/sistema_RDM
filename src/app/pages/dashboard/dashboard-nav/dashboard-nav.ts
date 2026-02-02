import { Component, Output, EventEmitter } from '@angular/core';

interface TabItem {
  id: string;
  label: string;
  panelId: string;
}

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [],
  templateUrl: './dashboard-nav.html',
  styleUrls: ['./dashboard-nav.css'],
})
export class TabsComponent {
  @Output() tabSelected = new EventEmitter<string>();

  tabs: TabItem[] = [
    { id: 'new-request', label: 'Nova Solicitação', panelId: 'new-request-panel' },
    { id: 'my-requests', label: 'Minhas Solicitações', panelId: 'my-requests-panel' },
  ];

  activeTab = 'new-request';

  selectTab(tabId: string): void {
    this.activeTab = tabId;
    this.tabSelected.emit(tabId);

    // Foco no painel correspondente
    const panel = document.getElementById(`${tabId}-panel`);
    if (panel) {
      panel.focus();
    }
  }

  // Navegação por teclado
  onKeyDown(event: KeyboardEvent, tabId: string): void {
    switch(event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.selectTab(tabId);
        break;
      case 'ArrowRight':
        this.focusNextTab();
        break;
      case 'ArrowLeft':
        this.focusPreviousTab();
        break;
      case 'Home':
        event.preventDefault();
        this.focusFirstTab();
        break;
      case 'End':
        event.preventDefault();
        this.focusLastTab();
        break;
    }
  }

  private focusNextTab(): void {
    const currentIndex = this.tabs.findIndex(tab => tab.id === this.activeTab);
    const nextIndex = (currentIndex + 1) % this.tabs.length;
    this.focusTab(this.tabs[nextIndex].id);
  }

  private focusPreviousTab(): void {
    const currentIndex = this.tabs.findIndex(tab => tab.id === this.activeTab);
    const prevIndex = (currentIndex - 1 + this.tabs.length) % this.tabs.length;
    this.focusTab(this.tabs[prevIndex].id);
  }

  private focusFirstTab(): void {
    this.focusTab(this.tabs[0].id);
  }

  private focusLastTab(): void {
    this.focusTab(this.tabs[this.tabs.length - 1].id);
  }

  private focusTab(tabId: string): void {
    const tabElement = document.getElementById(`${tabId}-tab`);
    if (tabElement) {
      tabElement.focus();
    }
  }
}
