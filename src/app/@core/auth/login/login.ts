import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { AuthLogin } from '../../interfaces/forms/form_auth_login';
import { CommonModule } from '@angular/common';
import { SessionTimeoutService } from '../../services/session-timeout.service';
import { AuthService } from '../../services/auth.service'; // <-- Importas el nuevo servicio

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private messageService = inject(MessageService);
  private sessionTimeoutService = inject(SessionTimeoutService);
  private authService = inject(AuthService); // <-- Inyección limpia

  loginForm: FormGroup<AuthLogin> = this.fb.group({
    email: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6), Validators.maxLength(16)],
    }),
  });

  passwordFieldType: 'password' | 'text' = 'password';

  get correoControl() {
    return this.loginForm.controls.email;
  }

  get passwordControl() {
    return this.loginForm.controls.password;
  }

  togglePasswordVisibility() {
    this.passwordFieldType = this.passwordFieldType === 'password' ? 'text' : 'password';
  }

  isValidField(control: FormControl<string>): boolean {
    return control.invalid && (control.dirty || control.touched);
  }

  getErrorMessage(control: FormControl<string>) {
    if (control.errors?.['required']) return 'El campo es requerido';
    if (control.hasError('minlength') || control.hasError('maxlength')) {
      return 'Debe colocar un mínimo de 6 caracteres y un máximo de 16';
    }
    if (control.hasError('email')) return 'El email es inválido';
    return '';
  }

  async onSubmit() {
    if (!this.loginForm.valid) {
      this.loginForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Atención',
        detail: 'Completa los campos del formulario correctamente.',
      });
      return;
    }

    const { email, password } = this.loginForm.getRawValue();

    try {
      // Toda la complejidad de Firebase Auth y DB ahora se reduce a esta llamada
      await this.authService.login(email, password);

      this.sessionTimeoutService.startTracking();
      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Inicio de Sesión exitoso.',
      });

      await this.router.navigateByUrl('/home');
    } catch (error: any) {
      console.error('Error al iniciar sesión', error);
      let errorMessage = 'Error en las credenciales.';

      if (
        error.code === 'auth/invalid-credential' ||
        error.code === 'auth/user-not-found' ||
        error.code === 'auth/wrong-password'
      ) {
        errorMessage = 'Correo o contraseña incorrectos.';
      } else if (error.message === 'user-data-not-found') {
        errorMessage = 'El usuario no posee información asociada en el sistema.';
      }

      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: errorMessage,
      });
    }
  }
}
