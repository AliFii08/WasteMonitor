import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class LocationService {
  private databaseUrl = environment.firebaseConfig.databaseURL;

  private timeoutId: any = null;
  private tracking = false;

  /**
   * Verifica el estado del permiso de geolocalización
   */
  async checkPermissionState(): Promise<PermissionState | 'unsupported'> {
    if (!('geolocation' in navigator) || !('permissions' in navigator)) {
      return 'unsupported';
    }

    try {
      const result = await navigator.permissions.query({
        name: 'geolocation',
      });

      return result.state;
    } catch {
      return 'prompt';
    }
  }

  /**
   * Inicia el seguimiento del supervisor
   */
  startSupervisorTracking(userId: string, journeyId?: string): void {
    if (!userId || !('geolocation' in navigator)) {
      return;
    }

    // Detener cualquier seguimiento anterior
    this.stopTracking(userId);

    this.tracking = true;

    // Marcar al supervisor como activo
    this.updateLocationStatus(userId, true, journeyId);

    // Primera ubicación inmediatamente
    this.capturarYEnviar(userId, journeyId);
  }

  /**
   * Detiene el seguimiento del supervisor
   */
  stopTracking(userId?: string): void {
    this.tracking = false;

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    // Si tenemos usuario, marcarlo como inactivo
    if (userId) {
      this.updateLocationStatus(userId, false);
    }
  }

  /**
   * Obtiene una nueva ubicación.
   *
   * Después de terminar:
   * espera 3 segundos
   * y vuelve a solicitar una nueva ubicación.
   */
  private capturarYEnviar(userId: string, journeyId?: string): void {
    if (!this.tracking) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        console.log('📍 Nueva ubicación:', userId, lat, lng);

        await this.syncSupervisorLocationToFirebase(userId, lat, lng, journeyId);

        // Volver a buscar después de 3 segundos
        if (this.tracking) {
          this.timeoutId = setTimeout(() => {
            this.capturarYEnviar(userId, journeyId);
          }, 3000);
        }
      },

      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          console.warn('Permiso de geolocalización denegado.');

          this.stopTracking(userId);
          return;
        }

        console.error('Error GPS:', error.message);

        // Error temporal: volver a intentar
        if (this.tracking) {
          this.timeoutId = setTimeout(() => {
            this.capturarYEnviar(userId, journeyId);
          }, 3000);
        }
      },

      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  }

  /**
   * Guarda la ubicación actual
   */
  private async syncSupervisorLocationToFirebase(
    userId: string,
    lat: number,
    lng: number,
    journeyId?: string,
  ): Promise<void> {
    try {
      await fetch(`${this.databaseUrl}/usuarios/${userId}/location.json`, {
        method: 'PATCH',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          active: true,
          lat,
          lng,
          timestamp: Date.now(),
          journeyId: journeyId || null,
        }),
      });
    } catch (err) {
      console.error('Error enviando coordenadas:', err);
    }
  }

  /**
   * Cambia el estado de transmisión
   */
  private async updateLocationStatus(
    userId: string,
    active: boolean,
    journeyId?: string,
  ): Promise<void> {
    try {
      await fetch(`${this.databaseUrl}/usuarios/${userId}/location.json`, {
        method: 'PATCH',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          active,
          ...(journeyId !== undefined ? { journeyId } : {}),
          timestamp: Date.now(),
        }),
      });
    } catch (err) {
      console.error('Error actualizando estado de ubicación:', err);
    }
  }
}
