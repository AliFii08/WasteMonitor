import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, NgZone, inject, signal } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { Auth, signOut } from '@angular/fire/auth';
import { MessageService } from 'primeng/api';

@Injectable({
  providedIn: 'root',
})
export class SessionTimeoutService {
  private static readonly LAST_ACTIVITY_KEY = 'wm_last_activity_at';
  private static readonly ACTIVE_JOURNEY_KEY = 'wm_active_journey';
  private static readonly TIMEOUT_MS = 10 * 60 * 1000;
  private static readonly WARNING_MS = 10 * 1000;

  private auth = inject(Auth);
  private router = inject(Router);
  private zone = inject(NgZone);
  private messageService = inject(MessageService);
  private document = inject(DOCUMENT);
  private platformId = inject(PLATFORM_ID);

  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private warningTimer: ReturnType<typeof setTimeout> | null = null;
  private warningInterval: ReturnType<typeof setInterval> | null = null;
  private isTracking = false;

  readonly showSessionWarning = signal(false);
  readonly remainingSeconds = signal(10);

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

    this.clearWarningTimers();
    this.showSessionWarning.set(false);

    this.activityEvents.forEach((eventName) => {
      this.document.removeEventListener(eventName, this.onUserActivity);
    });

    this.isTracking = false;

    if (clearStorage) {
      localStorage.removeItem(SessionTimeoutService.LAST_ACTIVITY_KEY);
      localStorage.removeItem(SessionTimeoutService.ACTIVE_JOURNEY_KEY);
    }
  }

  refreshActivity(): void {
    if (!this.isBrowser) {
      return;
    }

    localStorage.setItem(SessionTimeoutService.LAST_ACTIVITY_KEY, Date.now().toString());
    this.clearWarningTimers();
    this.showSessionWarning.set(false);
    this.restartTimer();
  }

  extendSession(): void {
    this.refreshActivity();
  }

  setJourneyActive(active: boolean): void {
    if (!this.isBrowser) return;

    const uid = this.auth.currentUser?.uid;
    if (!uid) return;

    if (active) {
      localStorage.setItem(
        SessionTimeoutService.ACTIVE_JOURNEY_KEY,
        JSON.stringify({ uid, startedAt: Date.now() }),
      );
      this.clearWarningTimers();
      this.showSessionWarning.set(false);
      return;
    }

    localStorage.removeItem(SessionTimeoutService.ACTIVE_JOURNEY_KEY);
    this.refreshActivity();
  }

  isJourneyActive(): boolean {
    if (!this.isBrowser) return false;

    const uid = this.auth.currentUser?.uid;
    const rawValue = localStorage.getItem(SessionTimeoutService.ACTIVE_JOURNEY_KEY);
    if (!uid || !rawValue) return false;

    try {
      const journey = JSON.parse(rawValue) as { uid?: string };
      return journey.uid === uid;
    } catch {
      localStorage.removeItem(SessionTimeoutService.ACTIVE_JOURNEY_KEY);
      return false;
    }
  }

  isSessionExpired(): boolean {
    if (!this.isBrowser) {
      return false;
    }

    if (this.isJourneyActive()) return false;

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

    if (this.isJourneyActive()) return;

    this.zone.runOutsideAngular(() => {
      this.warningTimer = setTimeout(() => {
        this.zone.run(() => this.showWarning());
      }, SessionTimeoutService.TIMEOUT_MS - SessionTimeoutService.WARNING_MS);

      this.inactivityTimer = setTimeout(() => {
        this.zone.run(() => {
          this.handleInactivityLogout();
        });
      }, SessionTimeoutService.TIMEOUT_MS);
    });
  }

  private onUserActivity = (): void => {
    if (this.showSessionWarning()) return;

    this.refreshActivity();
  };

  private async handleInactivityLogout(): Promise<void> {
    if (this.isJourneyActive()) {
      this.refreshActivity();
      return;
    }

    try {
      this.stopTracking(false);
      await signOut(this.auth);
      localStorage.removeItem(SessionTimeoutService.LAST_ACTIVITY_KEY);
      this.messageService.add({
        severity: 'warn',
        summary: 'Sesion expirada',
        detail: 'Se cerro la sesión por 10 minutos de inactividad.',
      });
      await this.router.navigateByUrl('/login');
    } catch (error) {
      console.error('Error al cerrar sesion por inactividad:', error);
    }
  }

  private showWarning(): void {
    if (this.isJourneyActive()) return;

    this.remainingSeconds.set(Math.ceil(SessionTimeoutService.WARNING_MS / 1000));
    this.showSessionWarning.set(true);
    this.warningInterval = setInterval(() => {
      const nextValue = this.remainingSeconds() - 1;
      this.remainingSeconds.set(Math.max(nextValue, 0));
    }, 1000);
  }

  private clearWarningTimers(): void {
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }

    if (this.warningInterval) {
      clearInterval(this.warningInterval);
      this.warningInterval = null;
    }
  }
}
