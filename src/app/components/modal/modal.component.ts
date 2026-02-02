// app\components\modal\modal.component.ts
import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { SharedMaterialModule } from '../../shared/ui//index';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, SharedMaterialModule],
  templateUrl: './modal.html',
  styleUrls: ['./modal.css'],
})
export class ModalComponent {
  @Input() title = '';
  @Input() buttonText = 'Fechar';
  @Input() visible = false;
  @Input() closeOnClickOutside = true;
  @Input() size: 'small' | 'medium' | 'large' | 'xlarge' = 'medium';
  @Input() allowScroll = true;
  @Input() showFooter = true;
  @Input() showCloseButton = true;
  @Input() closeOnEscape = true;

  @Output() closed = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    if (this.visible && this.closeOnEscape) {
      this.onClose();
    }
  }

  onClose() {
    this.closed.emit();
  }

  onOverlayClick(event: MouseEvent) {
    if (
      this.closeOnClickOutside &&
      (event.target as HTMLElement).classList.contains('modal-overlay')
    ) {
      this.onClose();
    }
  }
}
