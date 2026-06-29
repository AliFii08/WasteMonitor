// import { Component, inject } from '@angular/core';
// import {
//   FormBuilder,
//   FormControl,
//   FormGroup,
//   ReactiveFormsModule,
//   Validators,
// } from '@angular/forms';
// import { Router, RouterLink } from '@angular/router';
// import { MessageService } from 'primeng/api';
// import { AuthLogin } from '../../interfaces/forms/form_auth_login';
// import { CommonModule } from '@angular/common';
// import { Auth, signInWithEmailAndPassword } from '@angular/fire/auth';
// import { SessionTimeoutService } from '../../services/session-timeout.service';
// import { UserService } from '../../services/user.service';


// @Component({
//   selector: 'app-login',
//   standalone: true,
//   imports: [ReactiveFormsModule, CommonModule, RouterLink],
//   templateUrl: './login.html',
//   styleUrl: './login.scss',
// })
// export class Login {
//   private auth = inject(Auth);
//   private fb = inject(FormBuilder);
//   private router = inject(Router);
//   private messageService = inject(MessageService);
//   private sessionTimeoutService = inject(SessionTimeoutService);
//   private UserService userService = inject(UserService);

//   loginForm: FormGroup<AuthLogin> = this.fb.group({
//     email: new FormControl<string>('', {
//       nonNullable: true,
//       validators: [Validators.required, Validators.email],
//     }),
//     password: new FormControl<string>('', {
//       nonNullable: true,
//       validators: [Validators.required, Validators.minLength(6), Validators.maxLength(16)],
//     }),
//   });


//   get correoControl() {
//     return this.loginForm.controls.email;
//   }


//   get passwordControl() {
//     return this.loginForm.controls.password;
//   }


//   isValidField(control: FormControl<string>): boolean {
//     return control.invalid && (control.dirty || control.touched);
//   }


//   getErrorMessage(control: FormControl<string>) {
//     let error = control;
//     let message;

//     if (error!.errors!['required']) {
//       message = 'El campo es requerido';
//     }
//     if (error!.hasError('minlength') || error!.hasError('maxlength')) {
//       message = 'Debe colocar un minimo de 6 caracteres y un maximo de 16';
//     }
//     if (error!.hasError('email')) {
//       message = 'El email es invalido';
//     }

//     return message;
//   }

//   passwordFieldType: 'password' | 'text' = 'password';

//   // togglePasswordVisibility(): void {
//   //   this.passwordFieldType = this.passwordFieldType == 'password' ? 'text' : 'password';
//   //   console.log(this.passwordFieldType); // Verifica el valor
//   // }



//   async onSubmit() {
//     if (!this.loginForm.valid) {
//       this.loginForm.markAllAsTouched();
//       this.messageService.add({
//         severity: 'warn',
//         summary: 'Atención',
//         detail: 'Completa los campos del formulario correctamente.',
//       });
//       return;
//     }

//     const { email, password } = this.loginForm.getRawValue();

//     try {
//       // 1. Autenticar en Firebase Auth
//       const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
//       const uid = userCredential.user.uid;

//       // 2. Buscar los datos personalizados del nodo "usuarios" en Realtime Database
//       const userRef = ref(this.database, `usuarios/${uid}`);
//       const snapshot = await get(userRef);

//       if (snapshot.exists()) {
//         const userData = snapshot.val();

//         // 3. Mapeamos al objeto que cumpla con tu interfaz 'User'
//         const userToSave: User = {
//           uid: uid,
//           email: userData.email,
//           name: userData.name,
//           lastName: userData.lastName,
//           phone: userData.phone,
//           rol: userData.rol,
//           address: userData.address
//         };

//         // 4. Asignamos el valor directamente al signal de tu UserService
//         this.userService.currentUserSignal.set(userToSave);
        
//         // Opcional: Respaldar en localStorage por si refrescan la pantalla (F5)
//         localStorage.setItem('currentUser', JSON.stringify(userToSave));
        
//         console.log('Usuario guardado en el signal:', this.userService.currentUserSignal());
//       } else {
//         console.warn('El usuario existe en Auth pero no tiene datos en la base de datos.');
//       }

//       // 5. Continuar flujo normal
//       this.sessionTimeoutService.startTracking();
//       this.messageService.add({
//         severity: 'success',
//         summary: 'Éxito',
//         detail: 'Inicio de Sesión exitoso.',
//       });
//       await this.router.navigateByUrl('/home');

//     } catch (error: any) {
//       console.error('Error al iniciar sesión', error);
//       let errorMessage = 'Error al iniciar sesión.';

//       if (
//         error.code === 'auth/invalid-credential' ||
//         error.code === 'auth/user-not-found' ||
//         error.code === 'auth/wrong-password'
//       ) {
//         errorMessage = 'Correo o contraseña incorrectos.';
//       }

//       this.messageService.add({
//         severity: 'error',
//         summary: 'Error',
//         detail: errorMessage,
//       });
//     }
//   }
// }

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
import { Database, ref, get } from '@angular/fire/database'; // <-- FALTABA IMPORTAR ref, get y Database
import { SessionTimeoutService } from '../../services/session-timeout.service';
import { UserService } from '../../services/user.service';
import { User } from '../../interfaces/user.model'; // <-- FALTABA IMPORTAR LA INTERFAZ User
import { FirebaseUser } from '../../interfaces/user.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private auth = inject(Auth);
  private database = inject(Database); // <-- FALTABA INYECTAR LA BASE DE DATOS
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private messageService = inject(MessageService);
  private sessionTimeoutService = inject(SessionTimeoutService);
  private userService = inject(UserService); // <-- SE CORRIGIÓ LA SINTAXIS (Tenías "private UserService userService")

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
      // 1. Autenticar en Firebase Auth
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      const uid = userCredential.user.uid;

      // 2. Buscar los datos personalizados del nodo "usuarios" en Realtime Database
      const userRef = ref(this.database, `usuarios/${uid}`);
      const snapshot = await get(userRef);

      if (snapshot.exists()) {
        const userData = snapshot.val();

        // 3. Mapeamos exactamente a los campos que tu nodo de Firebase posee
        const userToSave: FirebaseUser = {
          uid: uid,
          email: userData.email,
          name: userData.name,
          lastName: userData.lastName,
          phone: userData.phone,
          rol: userData.rol,
          address: userData.address
        };

        // 4. Asignamos el valor al signal sin errores de tipado
        this.userService.currentUserSignal.set(userToSave);
        
        localStorage.setItem('currentUser', JSON.stringify(userToSave));
        
        console.log('Usuario de Firebase guardado en el signal:', this.userService.currentUserSignal());
      } else {
        console.warn('El usuario existe en Auth pero no tiene datos en el nodo "usuarios" de la BD.');
      }

      // 5. Continuar flujo normal
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