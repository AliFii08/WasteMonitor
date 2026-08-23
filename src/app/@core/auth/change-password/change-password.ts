import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './change-password.html',
  styleUrl: './change-password.scss',
})
export class ChangePassword {
  private authService = inject(AuthService);
  private messageService = inject(MessageService);

  email: string = '';
  loading: boolean = false;

  async onSendResetLink() {
    if (!this.email) return;

    this.loading = true;

    try {
      await this.authService.sendResetPasswordEmail(this.email);
      this.messageService.add({
        severity: 'success',
        summary: 'Enlace enviado',
        detail: 'Revisa tu correo electrónico para restablecer tu contraseña.',
      });
    } catch (err: any) {
      let detail = 'Ocurrió un error al enviar el correo de recuperación.';
      if (err.code === 'auth/user-not-found') {
        detail = 'El correo no está registrado.';
      } else if (err.code === 'auth/invalid-email') {
        detail = 'Formato de correo inválido.';
      }
      this.messageService.add({ severity: 'error', summary: 'No se pudo enviar', detail });
    } finally {
      this.loading = false;
    }
  }
}
