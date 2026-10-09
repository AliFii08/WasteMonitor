import { Injectable, inject, signal } from '@angular/core';
import { Database, ref, set, push, get, onValue, Unsubscribe } from '@angular/fire/database';
import { Auth } from '@angular/fire/auth';

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
  private readonly auth = inject(Auth);
  private watchId: number | null = null;
  private informeUnsubscribe: Unsubscribe | null = null;

  public readonly isTracking = signal<boolean>(false);
  public readonly lastLocation = signal<LocationPayload | null>(null);
  public readonly errorState = signal<string | null>(null);

  private lastSentTimestamp = 0;
  private readonly MIN_INTERVAL_MS = 3000;

  startSupervisorTracking(userId: string, informeId: string): void {
    if (this.isTracking()) return;

    if (!('geolocation' in navigator)) {
      this.errorState.set('La geolocalización no está soportada en este dispositivo.');
      return;
    }

    this.errorState.set(null);
    this.isTracking.set(true);

    // ESCUCHAR EN TIEMPO REAL EL ESTADO DEL INFORME
    const informeRef = ref(this.db, `informe_de_viaje/${informeId}`);
    this.informeUnsubscribe = onValue(informeRef, (snapshot) => {
      const data = snapshot.val();

      // Si el informe se eliminó (null), o activo cambió a false, apagar el GPS en ESTE teléfono
      if (!snapshot.exists() || data?.activo === false || data?.estado === 'finalizado') {
        console.log('🛑 [LocationService] El informe fue desactivado/eliminado. Deteniendo GPS...');
        this.stopSupervisorTracking(userId);
      }
    });

    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.handlePositionUpdate(position, userId, informeId),
      (error) => this.handlePositionError(error),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }

  stopSupervisorTracking(userId: string): void {
    // 1. Cancelar la escucha en tiempo real del informe
    if (this.informeUnsubscribe) {
      this.informeUnsubscribe();
      this.informeUnsubscribe = null;
    }

    // 2. Detener el watchPosition del navegador móvil
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    this.isTracking.set(false);

    // 3. Notificar a Firebase que la transmisión del usuario pasó a inactiva
    const currentRef = ref(this.db, `tracking/${userId}/current`);
    set(currentRef, { active: false, timestamp: Date.now(), userId }).catch((err) => {
      console.error('Error al desactivar tracking:', err);
    });
  }

  /**
   * Verifica al cargar/recargar la app si el usuario activo tiene una jornada en curso
   * y reanuda el rastreo GPS en segundo plano.
   */
  async restoreActiveTrackingIfAny(): Promise<void> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) return;

    try {
      const informesSnap = await get(ref(this.db, 'informe_de_viaje'));
      if (!informesSnap.exists()) return;

      const informes = informesSnap.val();
      const informeActivoEntry = Object.entries<any>(informes).find(([_, inf]) => {
        const uid = inf?.usuario || inf?.usuarioId || inf?.uidUsuario || inf?.idUsuario;
        return uid === currentUser.uid && inf?.activo === true;
      });

      if (informeActivoEntry) {
        const [informeId] = informeActivoEntry;
        console.log(`🔄 [LocationService] Reanudando rastreo GPS tras recarga para el informe: ${informeId}`);
        this.startSupervisorTracking(currentUser.uid, informeId);
      }
    } catch (err) {
      console.error('Error al intentar reanudar el rastreo GPS tras F5:', err);
    }
  }

  private handlePositionUpdate(
    position: GeolocationPosition,
    userId: string,
    informeId: string
  ): void {
    const coords = position.coords;

    const now = Date.now();
    if (now - this.lastSentTimestamp < this.MIN_INTERVAL_MS) return;
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
      const currentRef = ref(this.db, `tracking/${payload.userId}/current`);
      const historyRef = ref(this.db, `tracking/${payload.userId}/history`);

      await set(currentRef, payload);
      await push(historyRef, payload);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al sincronizar coordenadas';
      this.errorState.set(`Error de sincronización: ${message}`);
    }
  }

  private handlePositionError(error: GeolocationPositionError): void {
    this.errorState.set(`Error GPS (${error.code}): ${error.message}`);
    this.isTracking.set(false);
  }
}