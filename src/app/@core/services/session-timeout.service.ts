import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, NgZone, inject } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { Auth, signOut } from '@angular/fire/auth';
import { MessageService } from 'primeng/api';

@Injectable({
  providedIn: 'root',
})
export class SessionTimeoutService {
  private static readonly LAST_ACTIVITY_KEY = 'wm_last_activity_at';
  private static readonly TIMEOUT_MS = 5 * 60 * 1000;

  private auth = inject(Auth);
  private router = inject(Router);
  private zone = inject(NgZone);
  private messageService = inject(MessageService);
  private document = inject(DOCUMENT);
  private platformId = inject(PLATFORM_ID);

  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private isTracking = false;

  private readonly activityEvents: Array<keyof DocumentEventMap> = [
    'click',
    'mousemove',
    'keydown',
    'scroll',
    'touchstart',
  ];

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  startTracking(): void {
    if (!this.isBrowser) {
      return;
    }

    if (this.isTracking) {
      this.refreshActivity();
      return;
    }

    this.isTracking = true;
    this.activityEvents.forEach((eventName) => {
      this.document.addEventListener(eventName, this.onUserActivity, { passive: true });
    });

    this.refreshActivity();
  }

  stopTracking(clearStorage = true): void {
    if (!this.isBrowser) {
      this.isTracking = false;
      return;
    }

    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }

    this.activityEvents.forEach((eventName) => {
      this.document.removeEventListener(eventName, this.onUserActivity);
    });

    this.isTracking = false;

    if (clearStorage) {
      localStorage.removeItem(SessionTimeoutService.LAST_ACTIVITY_KEY);
    }
  }

  refreshActivity(): void {
    if (!this.isBrowser) {
      return;
    }

    localStorage.setItem(SessionTimeoutService.LAST_ACTIVITY_KEY, Date.now().toString());
    this.restartTimer();
  }

  isSessionExpired(): boolean {
    if (!this.isBrowser) {
      return false;
    }

    const lastActivity = this.getLastActivityTimestamp();
    if (!lastActivity) {
      return true;
    }
    return Date.now() - lastActivity > SessionTimeoutService.TIMEOUT_MS;
  }

  private getLastActivityTimestamp(): number | null {
    if (!this.isBrowser) {
      return null;
    }

    const rawValue = localStorage.getItem(SessionTimeoutService.LAST_ACTIVITY_KEY);
    if (!rawValue) {
      return null;
    }

    const parsedValue = Number(rawValue);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  private restartTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }

    this.zone.runOutsideAngular(() => {
      this.inactivityTimer = setTimeout(() => {
        this.zone.run(() => {
          this.handleInactivityLogout();
        });
      }, SessionTimeoutService.TIMEOUT_MS);
    });
  }

  private onUserActivity = (): void => {
    this.refreshActivity();
  };

  private async handleInactivityLogout(): Promise<void> {
    try {
      this.stopTracking(false);
      await signOut(this.auth);
      localStorage.removeItem(SessionTimeoutService.LAST_ACTIVITY_KEY);
      this.messageService.add({
        severity: 'warn',
        summary: 'Sesion expirada',
        detail: 'Se cerro la sesión por 5 minutos de inactividad.',
      });
      await this.router.navigateByUrl('/login');
    } catch (error) {
      console.error('Error al cerrar sesion por inactividad:', error);
    }
  }
}
