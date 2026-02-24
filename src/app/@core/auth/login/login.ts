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
import { Auth, signInWithEmailAndPassword } from '@angular/fire/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private auth = inject(Auth);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private messageService = inject(MessageService);

  LoginForm: FormGroup<AuthLogin> = this.fb.group({
    email: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6), Validators.maxLength(16)],
    }),
  });

  get correoControl() {
    return this.LoginForm.controls.email;
  }
  get passwordControl() {
    return this.LoginForm.controls.password;
  }

  isValidField(control: FormControl<string>): boolean {
    return control.invalid && (control.dirty || control.touched);
  }
  getErrorMessage(control: FormControl<string>): string {
    if (control.hasError('required')) {
      return 'Este campo es obligatorio';
    }
    if (control.hasError('email')) {
      return 'Correo electrónico no válido';
    }
    if (control.hasError('minlength')) {
      const min = control.errors!['minlength'].requiredLength;
      return `Mínimo ${min} caracteres`;
    }
    if (control.hasError('maxlength')) {
      const max = control.errors!['maxlength'].requiredLength;
      return `Máximo ${max} caracteres`;
    }
    return '';
  }

  passwordFieldType: 'password' | 'text' = 'password';

  togglePasswordVisibility(): void {
    this.passwordFieldType = this.passwordFieldType == 'password' ? 'text' : 'password';
    console.log(this.passwordFieldType); // Verifica el valor
  }

  async onSubmit() {
    // if (!this.LoginForm.valid) {
    //   this.LoginForm.markAllAsTouched();
    //   // Log para depuración: Muestra el estado y los errores del formulario en la consola.
    //   console.error('El formulario es inválido. Revisa el siguiente objeto para ver los detalles:');
    //   console.log(this.LoginForm.value);
    //   return;
    // }

    const { email, password } = this.LoginForm.getRawValue();

    try {
      await signInWithEmailAndPassword(this.auth, email, password);
      console.log('Sesión iniciada exitosamente');
      this.router.navigateByUrl('/general');
    } catch (error: any) {
      console.error('Error al iniciar sesión', error);
      let errorMessage = 'Error al iniciar sesión.';

      if (
        error.code === 'auth/invalid-credential' ||
        error.code === 'auth/user-not-found' ||
        error.code === 'auth/wrong-password'
      ) {
        errorMessage = 'Correo o contraseña incorrectos.';
      }
      alert(errorMessage);
    }
  }
}
