import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class BrowserNotificationService {
  private static readonly ENABLED_KEY = 'wm_browser_notifications_enabled';
  private readonly platformId = inject(PLATFORM_ID);

  async enable(): Promise<void> {
    if (!this.isBrowser() || !('Notification' in window)) {
      throw new Error('Este navegador no admite notificaciones del sistema.');
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('No se concedió permiso para las notificaciones del navegador.');
    }

    localStorage.setItem(BrowserNotificationService.ENABLED_KEY, 'true');
  }

  disable(): void {
    if (this.isBrowser()) {
      localStorage.removeItem(BrowserNotificationService.ENABLED_KEY);
    }
  }

  get isEnabled(): boolean {
    return this.isBrowser() &&
      'Notification' in window &&
      Notification.permission === 'granted' &&
      localStorage.getItem(BrowserNotificationService.ENABLED_KEY) === 'true';
  }

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }
}
