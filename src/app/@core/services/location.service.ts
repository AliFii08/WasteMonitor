import { Injectable, inject, signal } from '@angular/core';
import { Database, ref, set, push } from '@angular/fire/database';

export interface LocationPayload {
  userId: string;
  informeId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  timestamp: number;
  active: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class LocationService {
  private readonly db = inject(Database);
  private watchId: number | null = null;

  public readonly isTracking = signal<boolean>(false);
  public readonly lastLocation = signal<LocationPayload | null>(null);
  public readonly errorState = signal<string | null>(null);

  private lastSentTimestamp = 0;
  private readonly MIN_INTERVAL_MS = 3000;

  startSupervisorTracking(userId: string, informeId: string): void {
    console.log(
      `🚀 [LocationService] Iniciando rastreo para Supervisor: ${userId} | Informe: ${informeId}`,
    );

    if (!('geolocation' in navigator)) {
      const msg = 'La geolocalización no está soportada en este dispositivo.';
      console.error(`❌ [LocationService] ${msg}`);
      this.errorState.set(msg);
      return;
    }

    this.errorState.set(null);
    this.isTracking.set(true);

    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.handlePositionUpdate(position, userId, informeId),
      (error) => this.handlePositionError(error),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  }

  stopSupervisorTracking(userId: string): void {
    console.log(`🛑 [LocationService] Deteniendo rastreo para Supervisor: ${userId}`);

    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    this.isTracking.set(false);

    const currentRef = ref(this.db, `tracking/${userId}/current`);
    set(currentRef, { active: false, timestamp: Date.now(), userId })
      .then(() => {
        console.log(
          `✅ [LocationService] Estado desactivado en Firebase para: tracking/${userId}/current`,
        );
      })
      .catch((err) => {
        console.error(`❌ [LocationService] Error al desactivar tracking:`, err);
      });
  }

  private handlePositionUpdate(
    position: GeolocationPosition,
    userId: string,
    informeId: string,
  ): void {
    const coords = position.coords;
    console.log(
      `📍 [GPS Sensor] Coordenadas capturadas -> Lat: ${coords.latitude}, Lng: ${coords.longitude}, Precisión: ${coords.accuracy}m`,
    );

    const now = Date.now();
    if (now - this.lastSentTimestamp < this.MIN_INTERVAL_MS) {
      console.log(`⏳ [LocationService] Omitiendo envío (Throttle < ${this.MIN_INTERVAL_MS}ms)`);
      return;
    }
    this.lastSentTimestamp = now;

    const payload: LocationPayload = {
      userId,
      informeId,
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy,
      speed: coords.speed,
      heading: coords.heading,
      timestamp: now,
      active: true,
    };

    this.lastLocation.set(payload);
    this.syncToFirebase(payload);
  }

  private async syncToFirebase(payload: LocationPayload): Promise<void> {
    try {
      console.log(`📤 [Firebase Sync] Enviando payload a tracking/${payload.userId}...`, payload);

      const currentRef = ref(this.db, `tracking/${payload.userId}/current`);
      const historyRef = ref(this.db, `tracking/${payload.userId}/history`);

      await set(currentRef, payload);
      await push(historyRef, payload);

      console.log(`✅ [Firebase Sync] Coordenadas guardadas con éxito en Firebase.`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido al guardar ubicación';
      console.error(`❌ [Firebase Sync Error]:`, message);
      this.errorState.set(`Error de sincronización: ${message}`);
    }
  }

  private handlePositionError(error: GeolocationPositionError): void {
    console.error(`❌ [GPS Error Code ${error.code}]: ${error.message}`);
    this.errorState.set(`Error GPS (${error.code}): ${error.message}`);
    this.isTracking.set(false);
  }
}
