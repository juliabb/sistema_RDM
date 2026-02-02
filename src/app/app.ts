// src/app/app.ts
import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('RDMSaude-Front');
  activeTab = signal('new-request');

  onMenuSelect(menuId: string): void {
    this.activeTab.set(menuId);
  }
}
