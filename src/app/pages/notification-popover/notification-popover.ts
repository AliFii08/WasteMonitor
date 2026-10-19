import { Component, Input, Output, EventEmitter, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../@core/services/notification.service';
import { NotificacionItem } from '../../@core/interfaces/notification.model';
import { BrowserNotificationService } from '../../@core/services/browser-notification.service';
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
  private browserNotificationService = inject(BrowserNotificationService);

  @Input() visible: boolean = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  notificaciones: NotificacionItem[] = [];
  unreadCount: number = 0;
  activatingNotifications = false;
  disablingNotifications = false;
  browserNotificationMessage = '';
  browserNotificationError = false;

  private subNotif: Subscription | null = null;
  private subCount: Subscription | null = null;

  get notificationsEnabled(): boolean {
    return this.browserNotificationService.isEnabled;
  }

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

  async activarPush(): Promise<void> {
    if (this.activatingNotifications) return;
    this.activatingNotifications = true;
    this.browserNotificationMessage = '';
    this.browserNotificationError = false;

    try {
      await this.browserNotificationService.enable();
      this.browserNotificationMessage = 'Avisos del navegador activados mientras la aplicación esté abierta.';
    } catch (error) {
      console.error('No se pudieron activar los avisos del navegador:', error);
      this.browserNotificationError = true;
      this.browserNotificationMessage =
        error instanceof Error ? error.message : 'No se pudieron activar los avisos del navegador.';
    } finally {
      this.activatingNotifications = false;
    }
  }

  async desactivarPush(): Promise<void> {
    if (this.disablingNotifications) return;
    this.disablingNotifications = true;
    this.browserNotificationMessage = '';
    this.browserNotificationError = false;

    try {
      this.browserNotificationService.disable();
      this.browserNotificationMessage = 'Avisos del navegador desactivados en este dispositivo.';
    } catch (error) {
      console.error('No se pudieron desactivar los avisos del navegador:', error);
      this.browserNotificationError = true;
      this.browserNotificationMessage =
        error instanceof Error ? error.message : 'No se pudieron desactivar los avisos del navegador.';
    } finally {
      this.disablingNotifications = false;
    }
  }

  ngOnDestroy(): void {
    this.subNotif?.unsubscribe();
    this.subCount?.unsubscribe();
  }
}
