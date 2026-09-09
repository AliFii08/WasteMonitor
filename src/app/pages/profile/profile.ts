
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
import { Auth } from '@angular/fire/auth';
import { Database, ref, set } from '@angular/fire/database';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';
import * as L from 'leaflet';

import { UserService } from '../../@core/services/user.service';

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

// Delimitación básica por sectores/urbanizaciones de Maracaibo
const SECTOR_COORDS: { [key: string]: { center: [number, number]; zoom: number } } = {
  'Urb-Jacinto': { center: [10.7039, -71.6278], zoom: 16 },
  'Urb-Trinidad': { center: [10.6908, -71.6334], zoom: 16 },
  'Sect-Ziruma': { center: [10.6750, -71.6280], zoom: 16 },
  'Sect-Naranjal': { center: [10.6970, -71.6310], zoom: 16 },
  'Sect-LaPiedra': { center: [10.6820, -71.6220], zoom: 16 },
};

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit, AfterViewInit, OnDestroy {
  private auth = inject(Auth);
  private db = inject(Database);
  private router = inject(Router);
  private messageService = inject(MessageService);
  private userService = inject(UserService);

  passwordFieldType: 'password' | 'text' = 'password';
  confirmPasswordFieldType: 'password' | 'text' = 'password';

  // Variables para Leaflet
  private map!: L.Map;
  private marker!: L.Marker;
  public selectedCoords: { lat: number; lng: number } | null = null;

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
    const user = this.userService.currentUserSignal();

    if (user) {
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

      // Recuperar lat/lng existentes si ya fueron registrados previamente
      if (user.address?.lat && user.address?.lng) {
        this.selectedCoords = {
          lat: Number(user.address.lat),
          lng: Number(user.address.lng),
        };
      }
    }

    // Escuchar cambios en la urbanización/sector para enfocar el mapa
    this.profileForm.controls.sector.valueChanges.subscribe((sectorValue) => {
      this.focusSectorOnMap(sectorValue);
    });
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  private initMap(): void {
    const initialCenter: [number, number] = this.selectedCoords
      ? [this.selectedCoords.lat, this.selectedCoords.lng]
      : [10.6908, -71.6334]; // Maracaibo Norte por defecto

    this.map = L.map('profile-map').setView(initialCenter, 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(this.map);

    // Si el usuario ya tenía una ubicación guardada, la dibujamos en el mapa
    if (this.selectedCoords) {
      this.placeMarker([this.selectedCoords.lat, this.selectedCoords.lng]);
    } else if (this.profileForm.controls.sector.value) {
      this.focusSectorOnMap(this.profileForm.controls.sector.value);
    }

    // Escuchar el clic sobre el mapa para fijar el pin y capturar latitud/longitud
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

  isValidField(control: AbstractControl | null): boolean {
    if (!control) return false;
    return control.invalid && (control.dirty || control.touched);
  }

  togglePasswordVisibility() {
    this.passwordFieldType = this.passwordFieldType === 'password' ? 'text' : 'password';
  }

  toggleConfirmPasswordVisibility() {
    this.confirmPasswordFieldType =
      this.confirmPasswordFieldType === 'password' ? 'text' : 'password';
  }

  getErrorMessage(control: AbstractControl | null): string {
    if (!control || !control.errors) return '';

    if (control.hasError('required')) return 'El campo es requerido';
    if (control.hasError('minlength') || control.hasError('maxlength')) {
      return 'Debe colocar un mínimo de 6 caracteres y un máximo de 16';
    }
    if (control.hasError('email')) return 'El email es inválido';
    if (control.hasError('passwordMismatch')) return 'Las contraseñas no coinciden';

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

    if (!this.selectedCoords) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Ubicación requerida',
        detail: 'Por favor, haz clic en el mapa para marcar la posición exacta de tu vivienda.',
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
          postalCode: postalCode ? Number(postalCode) : 0,
          lat: this.selectedCoords.lat,
          lng: this.selectedCoords.lng,
        },
        rol: currentRol,
        activo: true,
      };

      // 1. Guardar en Realtime Database con las coordenadas numéricas
      await set(userNodeRef, updatedUser);

      // 2. Actualizar el Signal y el localStorage
      this.userService.currentUserSignal.set({
        uid: currentUser.uid,
        ...updatedUser,
      });

      localStorage.setItem('currentUser', JSON.stringify({ uid: currentUser.uid, ...updatedUser }));

      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Perfil y ubicación guardados correctamente.',
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

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }
}
