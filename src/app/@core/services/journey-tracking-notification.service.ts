import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type JourneyNotificationPermission = 'granted' | 'denied' | 'unsupported' | 'error';

@Injectable({
  providedIn: 'root',
})
export class JourneyTrackingNotificationService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly notificationTag = 'wastemonitor-journey-tracking';

  async requestPermission(): Promise<JourneyNotificationPermission> {
    if (!isPlatformBrowser(this.platformId) || !('Notification' in window)) {
      return 'unsupported';
    }

    if (Notification.permission === 'default') {
      return (await Notification.requestPermission()) === 'granted' ? 'granted' : 'denied';
    }

    return Notification.permission;
  }

  async showActive(informeId: string): Promise<void> {
    await this.showNotification(
      'Seguimiento Activo',
      'La jornada está en curso.',
      informeId,
      true,
    );
  }

  async showFinished(informeId: string): Promise<void> {
    await this.showNotification(
      'Seguimiento Terminado',
      'La jornada ha finalizado.',
      informeId,
      false,
    );
  }

  private async showNotification(
    title: string,
    body: string,
    informeId: string,
    requireInteraction: boolean,
  ): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || !('Notification' in window)) {
      throw new Error('Este navegador no admite notificaciones.');
    }

    if (Notification.permission !== 'granted') {
      throw new Error('No se concedió permiso para mostrar notificaciones.');
    }

    const options: NotificationOptions = {
      body,
      tag: this.notificationTag,
      requireInteraction,
      data: { informeId },
    };
    const serviceWorker = navigator.serviceWorker;
    const registration = serviceWorker ? await serviceWorker.getRegistration() : undefined;

    if (registration) {
      await registration.showNotification(title, options);
      return;
    }

    new Notification(title, options);
  }
}
