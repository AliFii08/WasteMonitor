import { Component, inject, OnInit } from '@angular/core'; // <-- Importamos OnInit
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Auth } from '@angular/fire/auth';
import { Database, ref, set } from '@angular/fire/database';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';
import { UserService } from '../../@core/services/user.service'; // <-- Importamos tu UserService
import { FirebaseUser } from '../../@core/interfaces/user.model'; // Ajusta los '../' según corresponda

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
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit { // <-- Implementamos la interfaz OnInit
  private auth = inject(Auth);
  private db = inject(Database);
  private router = inject(Router);
  private messageService = inject(MessageService);
  private userService = inject(UserService); // <-- Inyectamos el servicio de usuario

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
        validators: [Validators.minLength(6), Validators.maxLength(16)],
      }),
      confirmPassword: new FormControl('', { nonNullable: true }),
      sector: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      street: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      houseNumber: new FormControl('', { nonNullable: true }),
      postalCode: new FormControl('', { nonNullable: true }),
    },
    { validators: passwordMatchValidator },
  );

  ngOnInit(): void {
    // 1. Obtenemos el usuario del Signal reactivo
    const user = this.userService.currentUserSignal();

    if (user) {
      // 2. Rellenamos el formulario mapeando la estructura plana y anidada (address)
      this.profileForm.patchValue({
        name: user.name,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        sector: user.address?.sector || '',
        street: user.address?.street || '',
        houseNumber: user.address?.houseNumber || '',
        postalCode: user.address?.postalCode ? String(user.address.postalCode) : '',
      });
    }
  }

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
  const userNodeRef = ref(this.db, `usuarios/${currentUser.uid}`);

  // Mantener el rol actual para no sobrescribirlo accidentalmente
  const currentRol = this.userService.currentUserSignal()?.rol || 'user';

  const updatedUser = {
    name,
    lastName,
    email: email.trim().toLowerCase(),
    phone,
    address: {
      sector,
      street,
      houseNumber,
      // CORRECCIÓN: Si está vacío, guardamos 0 (o el número correspondiente) para mantener el tipo 'number'
      postalCode: postalCode ? Number(postalCode) : 0,
    },
    rol: currentRol
  };

  // 1. Guardar cambios en Realtime Database
  await set(userNodeRef, updatedUser);

  // 2. Actualizar el Signal global con el tipado exacto de FirebaseUser
  this.userService.currentUserSignal.set({
    uid: currentUser.uid,
    ...updatedUser
  });
  
  localStorage.setItem('currentUser', JSON.stringify({ uid: currentUser.uid, ...updatedUser }));

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