import { CommonModule } from '@angular/common';
import { Component, HostListener, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Auth, signOut } from '@angular/fire/auth';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { SessionTimeoutService } from '../services/session-timeout.service';
import { AuthService } from '../services/auth.service'; // Adjust the relative path if needed

import { NotificationPopover } from '../../pages/notification-popover/notification-popover';
import { NotificationService } from '../services/notification.service';
import { EmergencyAlertComponent } from '../../pages/emergency-alert/emergency-alert';
import { GeneralNotificationComponent } from '../../pages/general-notification/general-notification';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, ButtonModule, TooltipModule, NotificationPopover, EmergencyAlertComponent, GeneralNotificationComponent],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout {
  private auth = inject(Auth);
  private router = inject(Router);
  public sessionTimeoutService = inject(SessionTimeoutService);
  public authService = inject(AuthService); // Public so it can be accessed in layout.html
  public notificationService = inject(NotificationService);

  showNotificationsPopover: boolean = false;
  showEmergencyModal = false;
  showGeneralNotificationModal = false;
  showLogoutConfirmation = false;
  logoutConfirmationClosing = false;
  mobileMenuOpen = false;

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    if (this.mobileMenuOpen) {
      this.showNotificationsPopover = false;
      this.showEmergencyModal = false;
      this.showGeneralNotificationModal = false;
    }
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
    this.showNotificationsPopover = false;
    this.showGeneralNotificationModal = false;
  }

  toggleNotifications(): void {
    if (this.mobileMenuOpen) {
      return;
    }

      this.showNotificationsPopover = !this.showNotificationsPopover;
      if (this.showNotificationsPopover) {
        this.showEmergencyModal = false;
        this.showGeneralNotificationModal = false;
      }
    }

  openEmergencyModal(): void {
    if (this.mobileMenuOpen || !this.authService.hasRole(['admin', 'supervisor', 'mecanico'])) return;
    this.showNotificationsPopover = false;
    this.showEmergencyModal = true;
    this.showGeneralNotificationModal = false;
  }

  openGeneralNotificationModal(): void {
    if (this.mobileMenuOpen || !this.authService.hasRole(['admin'])) return;
    this.showNotificationsPopover = false;
    this.showEmergencyModal = false;
    this.showGeneralNotificationModal = true;
  }

  requestLogout(): void {
    this.closeMobileMenu();
    this.logoutConfirmationClosing = false;
    this.showLogoutConfirmation = true;
  }

  cancelLogout(): void {
    this.closeLogoutConfirmation(false);
  }

  confirmLogout(): void {
    this.closeLogoutConfirmation(true);
  }

  extendSession(): void {
    this.sessionTimeoutService.extendSession();
  }

  logoutFromSessionWarning(): void {
    void this.logout();
  }

  private closeLogoutConfirmation(logoutAfterClose: boolean): void {
    if (!this.showLogoutConfirmation || this.logoutConfirmationClosing) return;

    this.logoutConfirmationClosing = true;
    setTimeout(() => {
      this.showLogoutConfirmation = false;
      this.logoutConfirmationClosing = false;
      if (logoutAfterClose) void this.logout();
    }, 180);
  }

  @HostListener('document:click', ['$event'])
  closeNotificationsOnOutsideClick(event: MouseEvent): void {
    const target = event.target;
    if (target instanceof Element && !target.closest('.notification-btn-wrapper')) {
      this.showNotificationsPopover = false;
      this.showEmergencyModal = false;
      this.showGeneralNotificationModal = false;
    }
  }

  async logout() {
    try {
      this.sessionTimeoutService.stopTracking();
      await signOut(this.auth);
      await this.router.navigateByUrl('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      alert('No se pudo cerrar sesión. Intenta nuevamente.');
    }
  }
}
