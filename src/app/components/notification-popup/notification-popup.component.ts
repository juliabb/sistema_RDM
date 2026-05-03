import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService, Notification } from '../../services/notification.service';
import { AuthService } from '../../services/auth-service';

@Component({
  selector: 'app-notification-popup',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './notification-popup.html',
  styleUrls: ['./notification-popup.css'],
})
export class NotificationPopupComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();
  @Output() notificationRead = new EventEmitter<number>();

  notifications: Notification[] = [];
  loading = false;

  constructor(
    private notificationService: NotificationService,
    private router: Router,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    if (this.isOpen) {
      this.loadNotifications();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.loadNotifications();
    }
  }

  loadNotifications(): void {
    this.loading = true;
    this.notificationService.getNotifications().subscribe({
      next: (data) => {
        this.notifications = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.notifications = [];
      },
    });
  }

  /**
   * Chamado quando o usuário clica no conteúdo da notificação.
   * Marca como lida, remove da lista, emite evento e navega para /user.
   */
  onNotificationClick(notification: Notification): void {
    this.notificationService.markAsRead(notification.id).subscribe(() => {
      this.notifications = this.notifications.filter((n) => n.id !== notification.id);
      this.notificationRead.emit(notification.id);

      const ticket = notification.ticket;
      if (this.authService.isAdmin()) {
        this.router.navigate(['/admin/rdm', ticket]);
      } else {
        this.router.navigate(['/rdm-details', ticket]);
      }
      this.close();
    });
  }

  /**
   * Chamado quando o usuário clica no botão X para dispensar a notificação.
   * Apenas marca como lida e remove, sem navegar.
   */
  dismissNotification(notification: Notification, event: Event): void {
    event.stopPropagation(); // Evita que o clique no X acione o clique do conteúdo
    this.notificationService.markAsRead(notification.id).subscribe(() => {
      this.notifications = this.notifications.filter((n) => n.id !== notification.id);
      this.notificationRead.emit(notification.id);
    });
  }

  close(): void {
    this.closed.emit();
  }
}
