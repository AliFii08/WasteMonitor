import { Component, Input, Output, EventEmitter, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../@core/services/notification.service';
import { NotificacionItem } from '../../@core/interfaces/notification.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notification-popover',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-popover.html',
  styleUrl: './notification-popover.scss',
})
export class NotificationPopover implements OnInit, OnDestroy {
  private notificationService = inject(NotificationService);

  @Input() visible: boolean = false;
  @Output() visibleChange = new EventEmitter<boolean>();

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

  closePopover(): void {
    this.visible = false;
    this.visibleChange.emit(false);
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
