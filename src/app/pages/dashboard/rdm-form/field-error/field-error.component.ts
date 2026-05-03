// src/app/pages/dashboard/rdm-form/field-error/field-error.component.ts

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-field-error',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    @if (error) {
    <div class="field-error" role="alert">
      <mat-icon>error</mat-icon>
      <span>{{ error }}</span>
    </div>
    }
  `,
  styles: [`
    .field-error {
      margin-top: 6px;
      font-size: 12px;
      color: #dc3545;
      display: flex;
      gap: 6px;
      align-items: center;
      animation: slideIn 0.2s ease;
    }
    .field-error mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-5px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class FieldErrorComponent {
  @Input() error: string | null = null;
}
