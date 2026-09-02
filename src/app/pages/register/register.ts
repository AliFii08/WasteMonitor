// import { Component, inject } from '@angular/core';
// import {
//   AbstractControl,
//   FormControl,
//   FormGroup,
//   ReactiveFormsModule,
//   ValidationErrors,
//   ValidatorFn,
//   Validators,
// } from '@angular/forms';
// import { Router, RouterLink } from '@angular/router';
// import { CommonModule } from '@angular/common';
// import { MessageService } from 'primeng/api';
// import { AuthService } from '../../@core/services/auth.service'; // <-- Importamos AuthService

// export const passwordMatchValidator: ValidatorFn = (
//   control: AbstractControl,
// ): ValidationErrors | null => {
//   const password = control.get('password');
//   const confirmPassword = control.get('confirmPassword');

//   if (!password || !confirmPassword) {
//     return null;
//   }

//   if (confirmPassword.errors && !confirmPassword.errors['passwordMismatch']) {
//     return null;
//   }

//   if (password.value !== confirmPassword.value) {
//     confirmPassword.setErrors({ ...confirmPassword.errors, passwordMismatch: true });
//     return { passwordMismatch: true };
//   } else {
//     if (confirmPassword.hasError('passwordMismatch')) {
//       const { passwordMismatch, ...restErrors } = confirmPassword.errors ?? {};
//       confirmPassword.setErrors(Object.keys(restErrors).length ? restErrors : null);
//     }
//     return null;
//   }
// };

// @Component({
//   selector: 'app-register',
//   standalone: true,
//   imports: [ReactiveFormsModule, RouterLink, CommonModule],
//   templateUrl: './register.html',
//   styleUrl: './register.scss',
// })
// export class Register {
//   private router = inject(Router);
//   private messageService = inject(MessageService);
//   private authService = inject(AuthService); // <-- Inyectamos el servicio

//   passwordFieldType: 'password' | 'text' = 'password';
//   confirmPasswordFieldType: 'password' | 'text' = 'password';

//   registerForm = new FormGroup(
//     {
//       name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
//       lastName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
//       email: new FormControl('', {
//         nonNullable: true,
//         validators: [Validators.required, Validators.email],
//       }),
//       phone: new FormControl('', { nonNullable: true }),
//       password: new FormControl('', {
//         nonNullable: true,
//         validators: [Validators.required, Validators.minLength(6), Validators.maxLength(16)],
//       }),
//       confirmPassword: new FormControl('', {
//         nonNullable: true,
//         validators: [Validators.required],
//       }),
//       sector: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
//       street: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
//       houseNumber: new FormControl('', { nonNullable: true }),
//       postalCode: new FormControl('', { nonNullable: true }),
//     },
//     { validators: passwordMatchValidator },
//   );

//   isValidField(control: FormControl<string>): boolean {
//     return control.invalid && (control.dirty || control.touched);
//   }

//   togglePasswordVisibility() {
//     this.passwordFieldType = this.passwordFieldType === 'password' ? 'text' : 'password';
//   }

//   toggleConfirmPasswordVisibility() {
//     this.confirmPasswordFieldType =
//       this.confirmPasswordFieldType === 'password' ? 'text' : 'password';
//   }

//   getErrorMessage(control: FormControl<string>) {
//     let error = control;
//     let message = '';

//     if (error!.errors!['required']) {
//       message = 'El campo es requerido';
//     } else if (error!.hasError('minlength') || error!.hasError('maxlength')) {
//       message = 'Debe colocar un mínimo de 6 caracteres y un máximo de 16';
//     } else if (error!.hasError('email')) {
//       message = 'El email es inválido';
//     } else if (error!.hasError('passwordMismatch')) {
//       message = 'Las contraseñas no coinciden';
//     }

//     return message;
//   }

//   async onSubmit() {
//     if (this.registerForm.invalid) {
//       this.registerForm.markAllAsTouched();
//       this.messageService.add({
//         severity: 'warn',
//         summary: 'Atención',
//         detail: 'Completa los campos del formulario correctamente.',
//       });
//       return;
//     }

//     const formValues = this.registerForm.getRawValue();

//     try {
//       // Toda la lógica pesada se delega al AuthService
//       await this.authService.register(formValues);

//       this.messageService.add({
//         severity: 'success',
//         summary: 'Éxito',
//         detail: 'Registro exitoso.',
//       });

//       this.registerForm.reset();
//       await new Promise((resolve) => setTimeout(resolve, 600));
//       await this.router.navigateByUrl('/login');

//     } catch (error: any) {
//       console.error('Error durante el registro:', error);

//       let errorMessage = `Error en el registro: ${error.message}`;

//       if (error.code === 'auth/configuration-not-found') {
//         errorMessage = 'Error de configuración: Habilita "Email/Password" en la consola de Firebase.';
//       } else if (error.code === 'auth/email-already-in-use') {
//         errorMessage = 'Este correo electrónico ya está registrado. Intenta iniciar sesión.';
//       } else if (error.code === 'auth/invalid-email') {
//         errorMessage = 'El correo electrónico no es válido.';
//       } else if (error.code === 'auth/weak-password') {
//         errorMessage = 'La contraseña es muy débil. Debe tener al menos 6 caracteres.';
//       } else if (error.code === 'auth/operation-not-allowed') {
//         errorMessage = 'El proveedor Email/Password no está habilitado en Firebase Authentication.';
//       } else if (error.code === 'auth/too-many-requests') {
//         errorMessage = 'Demasiados intentos de registro. Intenta nuevamente en unos minutos.';
//       } else if (error.code === 'auth/network-request-failed') {
//         errorMessage = 'Error de red al registrar. Verifica tu conexión e intenta otra vez.';
//       }

//       this.messageService.add({
//         severity: 'error',
//         summary: 'Error',
//         detail: errorMessage,
//       });
//     }
//   }
// }

import { Component, inject, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
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
import * as L from 'leaflet';

import { AuthService } from '../../@core/services/auth.service';

export const passwordMatchValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');

  if (!password || !confirmPassword) return null;
  if (confirmPassword.errors && !confirmPassword.errors['passwordMismatch']) return null;

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

const SECTOR_COORDS: { [key: string]: { center: [number, number]; zoom: number } } = {
  'Urb-Jacinto': { center: [10.7039, -71.6278], zoom: 16 },
  'Urb-Trinidad': { center: [10.6908, -71.6334], zoom: 16 },
  'Sect-Ziruma': { center: [10.6750, -71.6280], zoom: 16 },
  'Sect-Naranjal': { center: [10.6970, -71.6310], zoom: 16 },
  'Sect-LaPiedra': { center: [10.6820, -71.6220], zoom: 16 },
};

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CommonModule],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register implements OnInit, AfterViewInit, OnDestroy {
  private router = inject(Router);
  private messageService = inject(MessageService);
  private authService = inject(AuthService);

  passwordFieldType: 'password' | 'text' = 'password';
  confirmPasswordFieldType: 'password' | 'text' = 'password';

  // Manejo de Leaflet
  private map!: L.Map;
  private marker!: L.Marker;
  public selectedCoords: { lat: number; lng: number } | null = null;

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

  ngOnInit(): void {
    // Escuchar el cambio de sector/urbanización para mover la vista del mapa
    this.registerForm.controls.sector.valueChanges.subscribe((sectorValue) => {
      this.focusSectorOnMap(sectorValue);
    });
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  private initMap(): void {
    // Coordenada inicial por defecto (Maracaibo)
    this.map = L.map('register-map').setView([10.6908, -71.6334], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(this.map);

    // Seleccionar punto en el mapa al hacer clic
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      this.selectedCoords = { lat, lng };
      this.placeMarker([lat, lng]);
    });
  }

  private placeMarker(coords: [number, number]): void {
    const homeIcon = L.divIcon({
      className: 'custom-home-icon',
      html: `<div style="background-color: #06523f; color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4);">
              <i class="pi pi-home" style="font-size: 1rem;"></i>
             </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    if (this.marker) {
      this.map.removeLayer(this.marker);
    }

    this.marker = L.marker(coords, { icon: homeIcon }).addTo(this.map);
  }

  private focusSectorOnMap(sectorKey: string): void {
    if (!this.map) return;

    const sectorData = SECTOR_COORDS[sectorKey];
    if (sectorData) {
      this.map.flyTo(sectorData.center, sectorData.zoom);
    }
  }

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

    if (!this.selectedCoords) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Ubicación requerida',
        detail: 'Por favor, haz clic en el mapa para seleccionar la ubicación de tu vivienda.',
      });
      return;
    }

    const formValues = this.registerForm.getRawValue();

    // Estructura completa incluyendo latitud y longitud seleccionadas
    const payload = {
      ...formValues,
      lat: this.selectedCoords.lat,
      lng: this.selectedCoords.lng,
    };

    try {
      await this.authService.register(payload);

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
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Este correo electrónico ya está registrado. Intenta iniciar sesión.';
      }

      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: errorMessage,
      });
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }
}