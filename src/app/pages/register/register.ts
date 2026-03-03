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
import { Auth, createUserWithEmailAndPassword } from '@angular/fire/auth';
import { Database, ref, set } from '@angular/fire/database';
import { RouterLink } from "@angular/router";

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
    confirmPassword.setErrors({ passwordMismatch: true });
    return { passwordMismatch: true }; // Devuelve el error en el grupo de formularios
  } else {
    // Si coinciden, y el error existía, límpialo
    if (confirmPassword.hasError('passwordMismatch')) {
      confirmPassword.setErrors(null);
    }
    return null;
  }
};

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  // constructor(private dbService: DatabaseService) {}

  private auth = inject(Auth);
  private db = inject(Database);

  registerForm = new FormGroup(
    {
      name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      lastName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      email: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.email],
      }),
      phone: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
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

  async onSubmit() {
    if (this.registerForm.invalid) {
      console.error('Formulario inválido. Por favor, revisa los campos.');
      // Marca todos los campos como "tocados" para mostrar los errores de validación en la plantilla
      this.registerForm.markAllAsTouched();
      return;
    }

    const { email, password, name, lastName, phone, sector, street, houseNumber, postalCode } =
      this.registerForm.getRawValue();

    try {
      // 1. Crear el usuario en Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;

      console.log('Usuario registrado en Firebase Auth con UID:', user.uid);

      // 2. Guardar los datos adicionales del usuario en Realtime Database
      // Usaremos el UID del usuario como ID del nodo para vincularlos.
      const userNodeRef = ref(this.db, `usuarios/${user.uid}`);

      // Estructuramos los datos que se guardarán
      await set(userNodeRef, {
        name,
        lastName,
        email,
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
      alert('¡Registro exitoso!');
      this.registerForm.reset();
    } catch (error: any) {
      console.error('Error durante el registro:', error);

      let errorMessage = `Error en el registro: ${error.message}`;

      if (error.code === 'auth/configuration-not-found') {
        errorMessage =
          'Error de configuración: Habilita "Email/Password" en la consola de Firebase (Authentication > Sign-in method).';
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Este correo electrónico ya está registrado. Intenta iniciar sesión.';
      }

      alert(errorMessage);
    }
  }
}
