import { Component, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink} from '@angular/router';
import { MessageService } from 'primeng/api';
import { AuthLogin } from '../../interfaces/forms/form_auth_login';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {

  //private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private messageService: MessageService = new MessageService;

  LoginForm: FormGroup<AuthLogin> = this.fb.group({
    email: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl<string>('', { nonNullable: true,
        validators: [
          Validators.required,
          Validators.minLength(6),
          Validators.maxLength(16),
        ]
      })
  })

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

  onSumit() {
    if (this.LoginForm.invalid) {
      this.LoginForm.markAllAsTouched();
      return;
    }

    console.log('Iniciando sesión', this.LoginForm.value);

    // aca obtiene los valores del login
    const formValues = this.LoginForm.value;

    // aca inicia sesion con el servicio
    /*this.authService.Login(formValues).subscribe({
      next: () => {
        console.log('Sesión iniciada exitosamente');
        this.router.navigateByUrl('/general'); // redirigir a genral
      },
      /*error: (err) => {
        console.error('Error al iniciar sesión', err);
        alert('Credenciales incorrectas. Por favor, inténtelo de nuevo.');
      }
    });*/
  }

}
