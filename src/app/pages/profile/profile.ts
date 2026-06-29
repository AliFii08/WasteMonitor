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
import { Auth, signOut } from '@angular/fire/auth';
import { Database, ref, set } from '@angular/fire/database';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';

// Validador personalizado corregido con las importaciones correctas de arriba
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
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule], // Asegúrate de importar ReactiveFormsModule aquí
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile {
  private auth = inject(Auth);
  private db = inject(Database);
  private router = inject(Router);
  private messageService = inject(MessageService);

  // Cambiado a profileForm para que coincida con un módulo de edición de perfil
  profileForm = new FormGroup(
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
        validators: [Validators.minLength(6), Validators.maxLength(16)], // Removido required por si no quieren cambiarla
      }),
      confirmPassword: new FormControl('', { nonNullable: true }),
      sector: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      street: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      houseNumber: new FormControl('', { nonNullable: true }),
      postalCode: new FormControl('', { nonNullable: true }),
    },
    { validators: passwordMatchValidator },
  );

  // Se especifica un tipo más genérico AbstractControl para evitar problemas de compatibilidad en la plantilla
  isValidField(control: AbstractControl | null): boolean {
    if (!control) return false;
    return control.invalid && (control.dirty || control.touched);
  }

  getErrorMessage(control: AbstractControl | null): string {
    if (!control || !control.errors) return '';

    if (control.hasError('required')) {
      return 'El campo es requerido';
    }
    if (control.hasError('minlength') || control.hasError('maxlength')) {
      return 'Debe colocar un mínimo de 6 caracteres y un máximo de 16';
    }
    if (control.hasError('email')) {
      return 'El email es inválido';
    }
    if (control.hasError('passwordMismatch')) {
      return 'Las contraseñas no coinciden';
    }

    return '';
  }

  async onSubmit() {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Atención',
        detail: 'Completa los campos del formulario correctamente.',
      });
      return;
    }

    const { email, name, lastName, phone, sector, street, houseNumber, postalCode } =
      this.profileForm.getRawValue();

    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No hay sesión activa.' });
      return;
    }

    try {
      // Al ser edición de perfil, actualizamos directamente en la base de datos usando el UID actual
      const userNodeRef = ref(this.db, `usuarios/${currentUser.uid}`);

      await set(userNodeRef, {
        name,
        lastName,
        email: email.trim().toLowerCase(),
        phone,
        address: {
          sector,
          street,
          houseNumber,
          postalCode,
        },
        rol: 'user'
      });

      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Perfil actualizado correctamente.',
      });
    } catch (error: any) {
      console.error('Error al actualizar:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudieron guardar los cambios.',
      });
    }
  }
}