import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class BrowserNotificationService {
  private static readonly ENABLED_KEY = 'wm_browser_notifications_enabled';
  private static readonly NOTIFICATION_TAG_PREFIX = 'wastemonitor-';
  private readonly platformId = inject(PLATFORM_ID);
  readonly enabled = signal(false);

  constructor() {
    if (this.isBrowser()) {
      this.refreshPermissionState();
      window.addEventListener('focus', this.refreshPermissionState);
      document.addEventListener('visibilitychange', this.refreshPermissionState);
      void this.observePermissionChanges();
    }
  }

  async enable(): Promise<void> {
    if (!this.isBrowser() || !('Notification' in window)) {
      throw new Error('Este navegador no admite notificaciones del sistema.');
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('No se concedió permiso para las notificaciones del navegador.');
    }

    localStorage.setItem(BrowserNotificationService.ENABLED_KEY, 'true');
    this.refreshPermissionState();
  }

  disable(): void {
    if (this.isBrowser()) {
      localStorage.removeItem(BrowserNotificationService.ENABLED_KEY);
      this.enabled.set(false);
      void this.closeActiveNotifications();
    }
  }

  get isEnabled(): boolean {
    const enabled = this.readEnabledState();
    this.enabled.set(enabled);
    return enabled;
  }

  private readonly refreshPermissionState = (): void => {
    if (!this.isBrowser()) return;

    const enabled = this.readEnabledState();
    this.enabled.set(enabled);
    if (!enabled) {
      void this.closeActiveNotifications();
    }
  };

  private async observePermissionChanges(): Promise<void> {
    if (!navigator.permissions?.query) return;

    try {
      const permissionStatus = await navigator.permissions.query({ name: 'notifications' });
      permissionStatus.addEventListener('change', this.refreshPermissionState);
      this.refreshPermissionState();
    } catch (error) {
      console.warn('No se pudo observar el permiso de notificaciones en tiempo real:', error);
    }
  }

  private readEnabledState(): boolean {
    if (
      !this.isBrowser() ||
      !('Notification' in window) ||
      Notification.permission !== 'granted'
    ) {
      if (this.isBrowser()) {
        localStorage.removeItem(BrowserNotificationService.ENABLED_KEY);
      }
      return false;
    }

    return localStorage.getItem(BrowserNotificationService.ENABLED_KEY) === 'true';
  }

  private async closeActiveNotifications(): Promise<void> {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const notifications = (
        await Promise.all(registrations.map((registration) => registration.getNotifications()))
      ).flat();

      notifications
        .filter((notification) =>
          notification.tag.startsWith(BrowserNotificationService.NOTIFICATION_TAG_PREFIX),
        )
        .forEach((notification) => notification.close());
    } catch (error) {
      console.error('No se pudieron cerrar las notificaciones activas:', error);
    }
  }

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }
}
