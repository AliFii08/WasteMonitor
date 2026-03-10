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
import { SessionTimeoutService } from '../../services/session-timeout.service';

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
  private sessionTimeoutService = inject(SessionTimeoutService);

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


  get correoControl() {
    return this.loginForm.controls.email;
  }


  get passwordControl() {
    return this.loginForm.controls.password;
  }


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

    return message;
  }

  passwordFieldType: 'password' | 'text' = 'password';

  // togglePasswordVisibility(): void {
  //   this.passwordFieldType = this.passwordFieldType == 'password' ? 'text' : 'password';
  //   console.log(this.passwordFieldType); // Verifica el valor
  // }

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
      await signInWithEmailAndPassword(this.auth, email, password);
      this.sessionTimeoutService.startTracking();
      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Inicio de Sesión exitoso.',
      });
      await this.router.navigateByUrl('/home');
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

      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: errorMessage,
      });
    }
  }
}
