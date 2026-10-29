import { Injectable, inject, signal } from '@angular/core';
import { Database, ref, set, get, onValue, Unsubscribe } from '@angular/fire/database';
import { Auth } from '@angular/fire/auth';
import { environment } from '../../../environments/environment';

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
  // Mantiene a mano a quién pertenece el tracking activo, para poder limpiar
  // completo desde cualquier punto (error de GPS, cierre de jornada, etc.)
  private contexto: { userId: string; informeId: string } | null = null;

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
    this.contexto = { userId, informeId };

    // ESCUCHAR EN TIEMPO REAL EL ESTADO DEL INFORME
    const informeRef = ref(this.db, `informe_de_viaje/${informeId}`);
    this.informeUnsubscribe = onValue(informeRef, (snapshot) => {
      const data = snapshot.val();

      // Si el informe se eliminó (null), o activo cambió a false, apagar el GPS en ESTE teléfono
      if (!snapshot.exists() || data?.activo === false || data?.estado === 'finalizado') {
        console.log('🛑 [LocationService] El informe fue desactivado/eliminado. Deteniendo GPS...');
        this.stopSupervisorTracking(userId, informeId);
      }
    });

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

  /**
   * Apaga el tracking de `userId`: detiene el GPS local (solo si le pertenece
   * a ESTE dispositivo), marca `active: false` en su nodo /tracking y limpia
   * el historial residual.
   *
   * Llamarlo desde el dispositivo de otro usuario (p. ej. un admin que elimina
   * el informe de un supervisor) es el "kill switch" remoto: no toca el GPS
   * local, solo escribe en la BD.
   */
  stopSupervisorTracking(userId: string, informeId?: string): void {
    // ¿El tracking activo en ESTE dispositivo es el de ese usuario?
    // Si no lo es (un admin con su propia jornada borrando el informe de otro),
    // no debemos apagar nuestro propio GPS.
    const esTrackingLocal = !this.contexto || this.contexto.userId === userId;

    if (esTrackingLocal) {
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

      this.contexto = null;
      this.isTracking.set(false);
    }

    // 3. Notificar a la BD que la transmisión del usuario pasó a inactiva.
    //    Se hace con fetch (REST) en vez del SDK: el SDK modular a veces lanza
    //    "childPathObj.split is not a function" por mezclar dos copias de
    //    firebase/database presentes en node_modules.
    if (userId) {
      void this.marcarTrackingInactivo(userId);
    }

    // 4. Limpiar cualquier residuo de historial (ya no se escribe, pero puede
    //    quedar basura de versiones anteriores de la app)
    void this.limpiarHistorialTracking(userId, informeId);
  }

  /**
   * Marca `tracking/{userId}/current` como inactivo usando fetch (REST),
   * sin depender del SDK modular.
   */
  private async marcarTrackingInactivo(userId: string): Promise<void> {
    try {
      const res = await fetch(
        `${environment.firebaseConfig.databaseURL}/tracking/${userId}/current.json`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ active: false, timestamp: Date.now(), userId }),
        },
      );
      if (!res.ok) {
        console.error(`Error al desactivar tracking (HTTP ${res.status})`);
      }
    } catch (err) {
      console.error('Error al desactivar tracking:', err);
    }
  }

  /**
   * Borra el historial de tracking de un usuario.
   * Con `informeId` borra solo el de ese informe; sin él, todo el del usuario.
   */
  async limpiarHistorialTracking(userId: string, informeId?: string): Promise<void> {
    if (!userId) return;

    const paths = [`tracking/${userId}/history`];
    if (informeId) {
      paths.push(`tracking_historial/${userId}/${informeId}`);
    }

    try {
      // fetch (REST) en vez de remove() del SDK, por la misma razón de arriba.
      await Promise.all(
        paths.map((path) =>
          fetch(`${environment.firebaseConfig.databaseURL}/${path}.json`, { method: 'DELETE' }),
        ),
      );
    } catch (err) {
      console.error('Error al limpiar historial de tracking:', err);
    }
  }

  /**
   * Kill switch remoto: usado desde el dispositivo de un admin que elimina
   * informes ajenos, porque el listener de `startSupervisorTracking` vive en el
   * teléfono del supervisor y no se dispara si él tiene la app cerrada.
   *
   * Solo apaga si el tracking en curso de ese usuario apunta a ALGUNO de los
   * informes eliminados. Si el supervisor está en otra jornada, se respeta.
   */
  async apagarTrackingDeInformes(ownerId: string, informeIds: string[]): Promise<void> {
    if (!ownerId || informeIds.length === 0) return;

    // El historial residual se limpia siempre, sea cual sea el caso.
    void this.limpiarHistorialTracking(ownerId);

    try {
      const snap = await get(ref(this.db, `tracking/${ownerId}/current`));
      if (!snap.exists()) return;

      const current = snap.val();
      if (current?.active !== true) return;

      const informeEnCurso = String(current?.informeId || '');
      if (!informeEnCurso || !informeIds.includes(informeEnCurso)) return;

      console.log(
        `🛑 [LocationService] Apagando tracking de ${ownerId} (informe ${informeEnCurso})`,
      );
      this.stopSupervisorTracking(ownerId, informeEnCurso);
    } catch (err) {
      console.error('Error al apagar tracking remoto:', err);
    }
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
        console.log(
          `🔄 [LocationService] Reanudando rastreo GPS tras recarga para el informe: ${informeId}`,
        );
        this.startSupervisorTracking(currentUser.uid, informeId);
      }
    } catch (err) {
      console.error('Error al intentar reanudar el rastreo GPS tras F5:', err);
    }
  }

  private handlePositionUpdate(
    position: GeolocationPosition,
    userId: string,
    informeId: string,
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
      // Solo se mantiene la posición actual. El historial ya NO se escribe:
      // /tracking queda plano, así los mapas (home y AdminTracking) que escuchan
      // el nodo completo solo bajan este único objeto por usuario.
      const currentRef = ref(this.db, `tracking/${payload.userId}/current`);
      await set(currentRef, payload);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al sincronizar coordenadas';
      this.errorState.set(`Error de sincronización: ${message}`);
    }
  }

  private handlePositionError(error: GeolocationPositionError): void {
    this.errorState.set(`Error GPS (${error.code}): ${error.message}`);

    // Antes solo se ponía isTracking=false y el watch seguía corriendo en el
    // navegador (fuga de batería + doble escritura). Ahora se limpia completo.
    const contexto = this.contexto;
    if (contexto) {
      this.stopSupervisorTracking(contexto.userId, contexto.informeId);
    } else {
      this.isTracking.set(false);
    }
  }
}
