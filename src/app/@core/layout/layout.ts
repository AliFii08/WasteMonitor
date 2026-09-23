import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { Auth, signOut } from '@angular/fire/auth';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { SessionTimeoutService } from '../services/session-timeout.service';
import { AuthService } from '../services/auth.service'; // Adjust the relative path if needed

import { NotificationPopover } from '../../pages/notification-popover/notification-popover';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, CommonModule, ButtonModule, TooltipModule, NotificationPopover],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout {
  private auth = inject(Auth);
  private router = inject(Router);
  private sessionTimeoutService = inject(SessionTimeoutService);
  public authService = inject(AuthService); // Public so it can be accessed in layout.html
  public notificationService = inject(NotificationService);

  showNotificationsPopover: boolean = false;

  toggleNotifications(): void {
      this.showNotificationsPopover = !this.showNotificationsPopover;
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