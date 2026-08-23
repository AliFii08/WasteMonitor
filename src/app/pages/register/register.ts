import { Component, inject } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../@core/services/auth.service'; // <-- Importamos AuthService

export const passwordMatchValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');

  if (!password || !confirmPassword) {
    return null;
  }

  if (confirmPassword.errors && !confirmPassword.errors['passwordMismatch']) {
    return null;
  }

  if (password.value !== confirmPassword.value) {
    confirmPassword.setErrors({ ...confirmPassword.errors, passwordMismatch: true });
    return { passwordMismatch: true };
  } else {
    if (confirmPassword.hasError('passwordMismatch')) {
      const { passwordMismatch, ...restErrors } = confirmPassword.errors ?? {};
      confirmPassword.setErrors(Object.keys(restErrors).length ? restErrors : null);
    }
    return null;
  }
};

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CommonModule],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private router = inject(Router);
  private messageService = inject(MessageService);
  private authService = inject(AuthService); // <-- Inyectamos el servicio

  passwordFieldType: 'password' | 'text' = 'password';
  confirmPasswordFieldType: 'password' | 'text' = 'password';

  registerForm = new FormGroup(
    {
      name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      lastName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      email: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.email],
      }),
      phone: new FormControl('', { nonNullable: true }),
      password: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(6), Validators.maxLength(16)],
      }),
      confirmPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      sector: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      street: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      houseNumber: new FormControl('', { nonNullable: true }),
      postalCode: new FormControl('', { nonNullable: true }),
    },
    { validators: passwordMatchValidator },
  );

  isValidField(control: FormControl<string>): boolean {
    return control.invalid && (control.dirty || control.touched);
  }

  togglePasswordVisibility() {
    this.passwordFieldType = this.passwordFieldType === 'password' ? 'text' : 'password';
  }

  toggleConfirmPasswordVisibility() {
    this.confirmPasswordFieldType =
      this.confirmPasswordFieldType === 'password' ? 'text' : 'password';
  }

  getErrorMessage(control: FormControl<string>) {
    let error = control;
    let message = '';

    if (error!.errors!['required']) {
      message = 'El campo es requerido';
    } else if (error!.hasError('minlength') || error!.hasError('maxlength')) {
      message = 'Debe colocar un mínimo de 6 caracteres y un máximo de 16';
    } else if (error!.hasError('email')) {
      message = 'El email es inválido';
    } else if (error!.hasError('passwordMismatch')) {
      message = 'Las contraseñas no coinciden';
    }

    return message;
  }

  async onSubmit() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Atención',
        detail: 'Completa los campos del formulario correctamente.',
      });
      return;
    }

    const formValues = this.registerForm.getRawValue();

    try {
      // Toda la lógica pesada se delega al AuthService
      await this.authService.register(formValues);

      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Registro exitoso.',
      });

      this.registerForm.reset();
      await new Promise((resolve) => setTimeout(resolve, 600));
      await this.router.navigateByUrl('/login');

    } catch (error: any) {
      console.error('Error durante el registro:', error);

      let errorMessage = `Error en el registro: ${error.message}`;

      if (error.code === 'auth/configuration-not-found') {
        errorMessage = 'Error de configuración: Habilita "Email/Password" en la consola de Firebase.';
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Este correo electrónico ya está registrado. Intenta iniciar sesión.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'El correo electrónico no es válido.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'La contraseña es muy débil. Debe tener al menos 6 caracteres.';
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'El proveedor Email/Password no está habilitado en Firebase Authentication.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Demasiados intentos de registro. Intenta nuevamente en unos minutos.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Error de red al registrar. Verifica tu conexión e intenta otra vez.';
      }

      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: errorMessage,
      });
    }
  }
}
