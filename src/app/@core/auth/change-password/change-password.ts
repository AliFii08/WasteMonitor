import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './change-password.html',
  styleUrl: './change-password.scss',
})
export class ChangePassword {
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  email: string = '';
  message: string = '';
  isError: boolean = false;
  loading: boolean = false;

  async onSendResetLink() {
    if (!this.email) return;

    this.loading = true;
    this.message = '';

    try {
      await this.authService.sendResetPasswordEmail(this.email);
      this.message = 'Se ha enviado un enlace de recuperación a tu correo electrónico.';
      this.isError = false;
    } catch (err: any) {
      this.isError = true;
      if (err.code === 'auth/user-not-found') {
        this.message = 'El correo no está registrado.';
      } else if (err.code === 'auth/invalid-email') {
        this.message = 'Formato de correo inválido.';
      } else {
        this.message = 'Ocurrió un error al enviar el correo de recuperación.';
      }
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }
}