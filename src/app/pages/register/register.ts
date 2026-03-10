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
import { Auth, createUserWithEmailAndPassword, signOut } from '@angular/fire/auth';
import { Database, ref, set } from '@angular/fire/database';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';

// Validador personalizado para confirmar que las contraseñas coinciden
export const passwordMatchValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');

  if (!password || !confirmPassword) {
    return null;
  }

  // Si el campo de confirmación ya tiene otros errores, no hagas nada aquí
  if (confirmPassword.errors && !confirmPassword.errors['passwordMismatch']) {
    return null;
  }

  if (password.value !== confirmPassword.value) {
    // Establece un error en el campo 'confirmPassword' para mostrar un mensaje específico
    confirmPassword.setErrors({ ...confirmPassword.errors, passwordMismatch: true });
    return { passwordMismatch: true }; // Devuelve el error en el grupo de formularios
  } else {
    // Si coinciden, y el error existía, límpialo
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
  // constructor(private dbService: DatabaseService) {}

  private auth = inject(Auth);
  private db = inject(Database);
  private router = inject(Router);
  private messageService = inject(MessageService);

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


  getErrorMessage(control: FormControl<string>) {
    let error = control;
    let message;

    if (error!.errors!['required']) {
      message = 'El campo es requerido';
    }
    if (error!.hasError('minlength') || error!.hasError('maxlength')) {
      message = 'Debe colocar un minimo de 6 caracteres y un maximo de 16';
    }
    if (error!.hasError('email')) {
      message = 'El email es invalido';
    }
    if (error!.hasError('passwordMismatch')) {
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

    const { email, password, name, lastName, phone, sector, street, houseNumber, postalCode } =
      this.registerForm.getRawValue();

    const normalizedEmail = email.trim().toLowerCase();

    try {
      // 1. Crear el usuario en Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        normalizedEmail,
        password,
      );
      const user = userCredential.user;

      console.log('Usuario registrado en Firebase Auth con UID:', user.uid);

      // 2. Guardar los datos adicionales del usuario en Realtime Database
      // Usaremos el UID del usuario como ID del nodo para vincularlos.
      const userNodeRef = ref(this.db, `usuarios/${user.uid}`);

      // Estructuramos los datos que se guardarán
      await set(userNodeRef, {
        name,
        lastName,
        email: normalizedEmail,
        phone,
        address: {
          sector,
          street,
          houseNumber,
          postalCode,
        },
        // Nota: Por seguridad, NUNCA guardamos la contraseña en la base de datos.
      });

      console.log('Datos de usuario guardados en Realtime Database.');
      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Registro exitoso.',
      });
      this.registerForm.reset();
      await signOut(this.auth);
      await new Promise((resolve) => setTimeout(resolve, 600));
      await this.router.navigateByUrl('/login');
    } catch (error: any) {
      console.error('Error durante el registro:', error);

      let errorMessage = `Error en el registro: ${error.message}`;

      if (error.code === 'auth/configuration-not-found') {
        errorMessage =
          'Error de configuración: Habilita "Email/Password" en la consola de Firebase (Authentication > Sign-in method).';
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Este correo electrónico ya está registrado. Intenta iniciar sesión.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'El correo electrónico no es válido.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'La contraseña es muy débil. Debe tener al menos 6 caracteres.';
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage =
          'El proveedor Email/Password no está habilitado en Firebase Authentication.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage =
          'Demasiados intentos de registro en poco tiempo. Intenta nuevamente en unos minutos.';
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
