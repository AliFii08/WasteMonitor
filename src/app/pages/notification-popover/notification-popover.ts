import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Subscription } from 'rxjs';
import { NotificacionItem } from '../../@core/interfaces/notification.model';
import { NotificationService } from '../../@core/services/notification.service';

@Component({
  selector: 'app-notification-popover',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-popover.html',
  styleUrl: './notification-popover.scss',
})
export class NotificationPopover implements OnInit, OnDestroy {
  private notificationService = inject(NotificationService);

  isOpen: boolean = false;
  notificaciones: NotificacionItem[] = [];
  unreadCount: number = 0;

  private subNotif: Subscription | null = null;
  private subCount: Subscription | null = null;

  ngOnInit(): void {
    this.subNotif = this.notificationService.notifications$.subscribe((data) => {
      this.notificaciones = data;
    });

    this.subCount = this.notificationService.unreadCount$.subscribe((count) => {
      this.unreadCount = count;
    });
  }

  togglePopover(): void {
    this.isOpen = !this.isOpen;
  }

  async marcarLeida(notif: NotificacionItem): Promise<void> {
    if (!notif.leida) {
      await this.notificationService.marcarComoLeida(notif.id);
    }
  }

  async marcarTodas(): Promise<void> {
    await this.notificationService.marcarTodasComoLeidas();
  }

  ngOnDestroy(): void {
    this.subNotif?.unsubscribe();
    this.subCount?.unsubscribe();
  }
}