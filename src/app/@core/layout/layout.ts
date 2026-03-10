import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { Auth, signOut } from '@angular/fire/auth';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { SessionTimeoutService } from '../services/session-timeout.service';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, 
    CommonModule, ButtonModule, TooltipModule],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout {
  private auth = inject(Auth);
  private router = inject(Router);
  private sessionTimeoutService = inject(SessionTimeoutService);

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
