import { Component, AfterViewInit, OnDestroy, inject, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Database, ref, get, onValue, Unsubscribe, query, equalTo, orderByChild } from '@angular/fire/database';
import { firstValueFrom } from 'rxjs';
import * as L from 'leaflet';
import { UserService } from '../../@core/services/user.service'; // Ajusta la ruta si aplica
import { AuthService } from '../../@core/services/auth.service'; // Ajusta la ruta si aplica

interface Punto {
  x: number; // latitud
  y: number; // longitud
}

interface RutaData {
  id: string;
  puntos: [number, number][];
}

interface UserAddress {
  lat?: string | number;
  lng?: string | number;
}

interface UserData {
  rol?: string;
  name?: string;
  address?: UserAddress;
  ruta?: string;
  rutaId?: string;
  camionId?: string;
}

const ROLES_SIN_PIN_CASA = ['admin', 'conductor', 'supervisor', 'crew', 'mecanico'] as const;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements AfterViewInit, OnDestroy {
  map!: L.Map;

  // Inyección de dependencias
  private http = inject(HttpClient);
  private database = inject(Database);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private ngZone = inject(NgZone);

  // Variables de estado
  public userAddressText: string = '';
  public nearestRouteId: string = '';
  public userCoords: [number, number] | null = null;
  public routeDistanceKm: number | null = null;
  public loading: boolean = true;
  public userRole: string | null = null;
  public infoCardCollapsed = false;

  // Capas del mapa Leaflet
  private userMarker!: L.Marker;
  private routePolyline!: L.Polyline;
  private routeLayer?: L.LayerGroup;
  private supervisorMarkers: Map<string, L.Marker> = new Map();
  private unsubscribeSupervisores?: Unsubscribe;
  // Solo rol 'mecanico': rutas de los informes que están en curso
  private unsubscribeInformesActivos?: Unsubscribe;
  private activeRoutesSignature = '';
  // Solo rol 'user': ruta más cercana a la casa del usuario. El mapa solo
  // muestra los supervisores cuya jornada activa sea de esa ruta; en null
  // (rol admin) no se filtra y se muestran TODOS los supervisores activos.
  private supervisorFilterRoute: { id: string; nombre: string } | null = null;
  // Caché informeId -> ruta, para no re-leer Firebase en cada actualización
  // de tracking (que llega cada pocos segundos)
  private informeRouteCache = new Map<string, string>();
  // Secuencia para descartar snapshots desfasados del listener de tracking
  private trackingSeq = 0;

  // Coordenadas por defecto (Maracaibo centro)
  private initialCoords: [number, number] = [10.6447, -71.6106];

  ngAfterViewInit(): void {
    this.initMap();
    this.loadUserDataAndFindRoute();
  }

  private initMap(): void {
    this.map = L.map('map', {
      zoomControl: false,
    }).setView(this.initialCoords, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(this.map);

    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;

      console.log('COORDENADAS HACIENDO CLIC EN EL MAPA:');
      console.log(`lat: ${lat}, lng: ${lng}`);
      console.log(`Formato para Firebase -> "lat": ${lat}, "lng": ${lng}`);
    });
  }

  /**
   * Obtiene la información del usuario y evalúa permisos/acciones por rol.
   */
  private async loadUserDataAndFindRoute(): Promise<void> {
    this.loading = true;

    let currentUser = this.userService.currentUserSignal();
    if (!currentUser) {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        try { currentUser = JSON.parse(stored); } catch { }
      }
    }

    if (!currentUser || !currentUser.uid) {
      console.warn('No se encontró sesión activa');
      this.userRole = null;
      this.loading = false;
      return;
    }

    try {
      // 1. Obtener datos actualizados del usuario desde Firebase
      const userRef = ref(this.database, `usuarios/${currentUser.uid}`);
      const snapshot = await get(userRef);

      if (!snapshot.exists()) {
        this.loading = false;
        return;
      }

      const userData: UserData = snapshot.val() || {};
      const rawRole = userData.rol ?? '';
      const normalizedRole = rawRole.trim().toLowerCase();

      this.userRole = userData.rol ?? null;
      const address = userData.address;

      // 2. Normalización y comparación case-insensitive para la exclusión del Pin
      const esRolExcluido = ROLES_SIN_PIN_CASA.includes(normalizedRole as typeof ROLES_SIN_PIN_CASA[number]);

      if (!esRolExcluido && address?.lat != null && address?.lng != null) {
        const numLat = Number(address.lat);
        const numLng = Number(address.lng);

        if (Number.isFinite(numLat) && Number.isFinite(numLng)) {
          this.userCoords = [numLat, numLng];
          const userName = userData.name?.trim() || 'Usuario';
          this.addUserMarker(this.userCoords, `${userName}, tu ubicación`);
        }
      }

      // 3. Lógica de renderizado basada en la variable normalizada
      if (normalizedRole === 'admin') {
        // El admin ve TODAS las rutas y la ubicación en tiempo real de
        // TODOS los supervisores con jornada activa (sin filtro de ruta)
        console.log('Rol de Admin detectado: renderizando todas las rutas.');
        await this.drawAllRoutes();
        this.listenSupervisorLocations();
      } else if (normalizedRole === 'user' && this.userCoords) {
        console.log('👤 Rol estándar detectado: calculando ruta más cercana.');
        await this.findAndDrawNearestRoute(this.userCoords);
        // El usuario solo ve al supervisor de SU ruta más cercana
        // cuya jornada esté activa
        this.listenSupervisorLocations();
      } else if (normalizedRole === 'user') {
        console.warn('Usuario estándar sin coordenadas válidas para buscar rutas.');
      } else if (normalizedRole === 'mecanico') {
        // El mecánico ve las rutas de los informes que están EN CURSO
        console.log('🔧 Rol Mecánico detectado: renderizando rutas de informes activos.');
        await this.drawRouteFromAciveJourney();
      } else if (['conductor', 'crew', 'supervisor'].includes(normalizedRole)) {
        console.log('Usuario operativo detectado: ', normalizedRole, 'Con ruta: ', userData.ruta);
        this.findAndDrawAsignedRoute(currentUser.uid);
      }

    } catch (error) {
      console.error('Error al procesar la vista del mapa según rol:', error);
    } finally {
      this.ngZone.run(() => {
        this.loading = false;
      });
    }
  }

  /**
   * Escucha en tiempo real la ubicación de los supervisores con jornada
   * activa. El admin ve a TODOS; el rol 'user' solo ve a los supervisores
   * cuya jornada activa corresponda a su ruta más cercana.
   */
  private listenSupervisorLocations(): void {
    const trackingRef = ref(this.database, 'tracking');

    this.unsubscribeSupervisores = onValue(trackingRef, async (snapshot) => {
      const seq = ++this.trackingSeq;

      if (!snapshot.exists()) {
        // Sin datos de tracking: limpiar marcadores visibles
        this.ngZone.run(() => this.clearSupervisorMarkers());
        return;
      }
      const trackingData = snapshot.val();

      // Marcadores que ya no aplican y deben retirarse del mapa
      const activeUserIds = new Set<string>();

      for (const [userId, payload] of Object.entries<any>(trackingData)) {
        const current = payload?.current;

        if (!(current && current.active && current.latitude && current.longitude)) continue;

        // Filtrado por ruta más cercana (solo aplica al rol 'user')
        if (this.supervisorFilterRoute) {
          const rutaDelSupervisor = await this.resolveTrackingRouteId(current.informeId);
          // Llegó un snapshot más reciente mientras se resolvía la ruta
          if (seq !== this.trackingSeq) return;
          if (!this.matchesNearestRoute(rutaDelSupervisor)) continue;
        }

        activeUserIds.add(userId);

        const lat = Number(current.latitude);
        const lng = Number(current.longitude);
        const label = `Supervisor (${userId.substring(0, 5)}...)`;

        this.ngZone.run(() => {
          if (this.supervisorMarkers.has(userId)) {
            this.supervisorMarkers.get(userId)!.setLatLng([lat, lng]);
          } else {
            const supervisorIcon = L.divIcon({
              className: 'supervisor-custom-marker',
              html: `<div style="background:#06523f; color:#fff; padding:5px 10px; border-radius:20px; font-weight:800; font-size:12px; border:2px solid #fff; box-shadow:0 3px 8px rgba(0,0,0,0.3); display:flex; align-items:center; gap:5px; white-space:nowrap;">
                      <i class="pi pi-user" style="font-size: 11px;"></i> ${label}
                     </div>`,
              iconAnchor: [30, 15],
            });

            const marker = L.marker([lat, lng], { icon: supervisorIcon })
              .bindPopup(`<b>Supervisor:</b> ${userId}<br><b>Informe:</b> ${current.informeId || 'N/A'}`)
              .addTo(this.map);

            this.supervisorMarkers.set(userId, marker);
          }
        });
      }

      // Retirar los marcadores que quedaron fuera del filtro
      this.ngZone.run(() => {
        for (const [userId, marker] of this.supervisorMarkers) {
          if (!activeUserIds.has(userId)) {
            marker.remove();
            this.supervisorMarkers.delete(userId);
          }
        }
      });
    });
  }

  /**
   * Resuelve a qué ruta pertenece la jornada activa de un supervisor a partir
   * del informeId de su payload de tracking:
   *   - ruta directa en el informe (`ruta`/`rutaId`), o
   *   - derivada del camión asignado (`camiones/{id}`).
   * Se cachea porque el tracking se actualiza cada pocos segundos.
   */
  private async resolveTrackingRouteId(informeId: string): Promise<string> {
    const id = String(informeId ?? '').trim();
    if (!id) return '';

    if (this.informeRouteCache.has(id)) {
      return this.informeRouteCache.get(id)!;
    }

    let rutaId = '';

    try {
      const snap = await get(ref(this.database, `informe_de_viaje/${id}`));
      if (snap.exists()) {
        const informe = snap.val();
        rutaId = String(informe?.rutaId || informe?.ruta || '').trim();

        if (!rutaId) {
          const camionId = String(informe?.camionId || informe?.camion || '').trim();
          if (camionId) {
            const camionSnap = await get(ref(this.database, `camiones/${camionId}`));
            if (camionSnap.exists()) {
              rutaId = String(camionSnap.val()?.rutaId || camionSnap.val()?.ruta || '').trim();
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error resolviendo la ruta del informe ${id}:`, error);
    }

    this.informeRouteCache.set(id, rutaId);
    return rutaId;
  }

  /**
   * Compara la ruta resuelta del supervisor con la ruta más cercana del
   * usuario. El informe puede guardar la key de 'routes' (id) o el nombre
   * visible (`nombreRuta`), por eso se comprueban ambos.
   */
  private matchesNearestRoute(rutaDelSupervisor: string): boolean {
    if (!this.supervisorFilterRoute || !rutaDelSupervisor) return false;

    const { id, nombre } = this.supervisorFilterRoute;
    return rutaDelSupervisor === id || (!!nombre && rutaDelSupervisor === nombre);
  }

  private clearSupervisorMarkers(): void {
    this.supervisorMarkers.forEach((marker) => marker.remove());
    this.supervisorMarkers.clear();
  }

  /**
   * RUTAS ACTIVAS — solo para el rol 'mecanico'.
   *
   * Dibuja en el mapa únicamente las rutas de los informes de viaje que están
   * en curso, es decir los que cumplen:
   *   - `activo !== false`  (no fueron eliminados/ocultados)
   *   - `estado` distinto de 'finalizado' y 'firmado' (no cerrados)
   *
   * La doble condición es intencional: al finalizar y al firmar se pone
   * `activo: false`, pero puede existir informes antiguos sin el campo `activo`
   * que sí tengan estado cerrado, y esos también deben quedar fuera.
   *
   * Se suscribe en tiempo real a `informe_de_viaje`, de modo que si un
   * supervisor crea, finaliza o firma un informe el mapa del mecánico se
   * actualiza solo, sin recargar.
   */
  private async drawRouteFromAciveJourney(): Promise<void> {
    this.unsubscribeInformesActivos = onValue(
      ref(this.database, 'informe_de_viaje'),
      async (snapshot) => {
        const informes = snapshot.val() || {};

        // 1. Filtrar los informes que siguen en curso
        const activos = Object.entries<any>(informes).filter(([_, inf]) => {
          if (!inf) return false;

          const estado = String(inf?.estado ?? '').toLowerCase();
          const estaCerrado =
            estado === 'finalizado' ||
            estado === 'firmado' ||
            inf?.estado === true ||
            inf?.activo === false;

          return !estaCerrado;
        });

        if (activos.length === 0) {
          console.log('ℹ️ No hay informes activos. Se limpian las rutas del mapa.');
          this.clearActiveJourneyRoutes();
          return;
        }

        // 2. Resolver el rutaId de cada informe activo (puede venir en el
        //    propio informe o derivarse del camión asignado)
        const rutasActivas = await this.resolveActiveRouteIds(activos);

        // 3. Evitar llamadas repetidas a OSRM: solo se re-traza si cambió el
        //    conjunto de rutas activas
        const signature = [...rutasActivas.keys()].sort().join('|');
        if (signature === this.activeRoutesSignature) return;
        this.activeRoutesSignature = signature;

        await this.drawActiveJourneyRoutes(rutasActivas);
      },
      (error) => console.error('Error al escuchar informes activos:', error),
    );
  }

  /**
   * A partir de los informes activos devuelve un Map<rutaId, datosRuta>.
   * Duplica el nombre de la ruta si varios informes comparten la misma, que
   * es el caso normal (varias tripulaciones en una misma ruta).
   */
  private async resolveActiveRouteIds(
    activos: [string, any][],
  ): Promise<Map<string, { nombreRuta: string; supervisors: string[] }>> {
    const rutas = new Map<string, { nombreRuta: string; supervisors: string[] }>();

    // Cachés para no repetir lecturas cuando varios informes apuntan al mismo
    // camión o al mismo usuario
    const camionesCache = new Map<string, string>();
    const usuariosCache = new Map<string, string>();

    const normalizar = (valor: unknown): string =>
      String(valor ?? '').trim();

    const addRuta = (rutaId: string, nombreRuta: string, supervisor: string) => {
      if (!rutaId) return;
      const existente = rutas.get(rutaId);
      if (existente) {
        if (supervisor && !existente.supervisors.includes(supervisor)) {
          existente.supervisors.push(supervisor);
        }
        if (!existente.nombreRuta && nombreRuta) existente.nombreRuta = nombreRuta;
      } else {
        rutas.set(rutaId, {
          nombreRuta,
          supervisors: supervisor ? [supervisor] : [],
        });
      }
    };

    for (const [, inf] of activos) {
      let rutaId = normalizar(inf?.rutaId || inf?.ruta);
      const camionId = normalizar(inf?.camionId || inf?.camion);
      const uid = normalizar(inf?.usuario || inf?.uidUsuario || inf?.usuarioId);

      // Sin ruta directa, se deriva del camión asignado al informe
      if (!rutaId && camionId) {
        if (!camionesCache.has(camionId)) {
          try {
            const snap = await get(ref(this.database, `camiones/${camionId}`));
            camionesCache.set(
              camionId,
              normalizar(snap.exists() ? snap.val()?.ruta || snap.val()?.rutaId : ''),
            );
          } catch {
            camionesCache.set(camionId, '');
          }
        }
        rutaId = camionesCache.get(camionId) || '';
      }

      // Nombre del supervisor para el popup de la ruta
      let supervisor = '';
      if (uid) {
        if (!usuariosCache.has(uid)) {
          try {
            const snap = await get(ref(this.database, `usuarios/${uid}`));
            const u = snap.exists() ? snap.val() : null;
            const nombre = String(u?.name || u?.nombre || '').trim();
            const apellido = String(u?.lastName || u?.apellido || '').trim();
            usuariosCache.set(uid, `${nombre} ${apellido}`.trim());
          } catch {
            usuariosCache.set(uid, '');
          }
        }
        supervisor = usuariosCache.get(uid) || '';
      }

      addRuta(rutaId, '', supervisor);
    }

    return rutas;
  }

  /**
   * Traza las rutas activas en el mapa. Cada polilínea lleva en el popup el
   * nombre de la ruta y los supervisors que la están recorriendo.
   */
  private async drawActiveJourneyRoutes(
    rutas: Map<string, { nombreRuta: string; supervisors: string[] }>,
  ): Promise<void> {
    const allRoutesSnap = await get(ref(this.database, 'routes'));
    const allRoutes = allRoutesSnap.exists() ? allRoutesSnap.val() : {};

    if (this.routeLayer) {
      this.map.removeLayer(this.routeLayer);
    }
    this.routeLayer = L.layerGroup().addTo(this.map);

    const colors = ['#28a745', '#007bff', '#dc3545', '#ffc107', '#17a2b8', '#6f42c1'];
    const allBounds: L.LatLngBounds = L.latLngBounds([]);
    let colorIndex = 0;

    for (const [rutaId, meta] of rutas) {
      // El informe puede guardar la key de 'routes' o el nombre visible
      const routeData = allRoutes[rutaId]
        ? allRoutes[rutaId]
        : Object.values<any>(allRoutes).find((r) => r?.nombreRuta === rutaId);

      if (!routeData) {
        console.warn(`⚠️ La ruta '${rutaId}' de un informe activo no existe en /routes.`);
        continue;
      }

      // x = latitud, y = longitud. Se ordenan por clave (p1, p2, p3...)
      const puntos: [number, number][] = Object.keys(routeData)
        .filter((key) => /^p\d+$/.test(key))
        .sort((a, b) => parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10))
        .map((key) => [routeData[key]?.x, routeData[key]?.y] as [number, number])
        .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));

      if (puntos.length < 2) continue;

      const color = colors[colorIndex % colors.length];
      colorIndex++;

      const nombre = routeData.nombreRuta || meta.nombreRuta || rutaId;
      const popup =
        `<b>Ruta:</b> ${nombre}<br>` +
        `<b>En curso:</b> ${meta.supervisors.length} supervisor(es)` +
        (meta.supervisors.length
          ? `<br><b>Supervisors:</b> ${meta.supervisors.join(', ')}`
          : '');

      const coordsString = puntos.map((p) => `${p[1]},${p[0]}`).join(';');
      const url = `https://router.project-osrm.org/route/v1/driving/${coordsString}?geometries=geojson&overview=full`;

      try {
        const data = await firstValueFrom(this.http.get<any>(url));

        if (data?.routes?.length > 0) {
          const latLngs: [number, number][] = data.routes[0].geometry.coordinates.map(
            (c: number[]) => [c[1], c[0]],
          );

          L.polyline(latLngs, { color, weight: 5, opacity: 0.85 })
            .bindPopup(popup)
            .addTo(this.routeLayer!);

          latLngs.forEach((coord) => allBounds.extend(coord));
          continue;
        }
      } catch {
        // Si OSRM falla se dibuja la línea directa como respaldo
      }

      L.polyline(puntos, {
        color,
        weight: 4,
        dashArray: '5, 10',
        opacity: 0.7,
      })
        .bindPopup(`${popup}<br><i>(Trazado directo)</i>`)
        .addTo(this.routeLayer!);

      puntos.forEach((coord) => allBounds.extend(coord));
    }

    if (allBounds.isValid()) {
      this.map.fitBounds(allBounds, { padding: [40, 40] });
    }
  }

  private clearActiveJourneyRoutes(): void {
    this.activeRoutesSignature = '';
    if (this.routeLayer) {
      this.map.removeLayer(this.routeLayer);
      this.routeLayer = undefined;
    }
  }

  private async drawAllRoutes(): Promise<void> {
    try {
      const routesRef = ref(this.database, 'routes');
      const snapshot = await get(routesRef);

      if (!snapshot.exists()) return;

      const routesData = snapshot.val();
      const colors = ['#28a745', '#007bff', '#dc3545', '#ffc107', '#17a2b8', '#6f42c1'];
      let colorIndex = 0;

      if (this.routeLayer) {
        this.map.removeLayer(this.routeLayer);
      }
      this.routeLayer = L.layerGroup().addTo(this.map);

      const allBounds: L.LatLngBounds = L.latLngBounds([]);

      for (const routeKey of Object.keys(routesData)) {
        const routeObj = routesData[routeKey];
        if (!routeObj || typeof routeObj !== 'object') continue;

        const points: [number, number][] = Object.keys(routeObj)
          .filter((key) => {
            const val = routeObj[key];
            return val && typeof val === 'object' && typeof val.x === 'number' && typeof val.y === 'number';
          })
          .sort()
          .map((key) => [routeObj[key].x, routeObj[key].y]);

        if (points.length < 2) continue;

        const color = colors[colorIndex % colors.length];
        colorIndex++;

        const coordsString = points.map((p) => `${p[1]},${p[0]}`).join(';');
        const url = `https://router.project-osrm.org/route/v1/driving/${coordsString}?geometries=geojson&overview=full`;

        try {
          const data = await this.http.get<any>(url).toPromise();

          if (data && data.routes && data.routes.length > 0) {
            const coordinates = data.routes[0].geometry.coordinates;
            const latLngs: [number, number][] = coordinates.map((c: number[]) => [c[1], c[0]]);

            const polyline = L.polyline(latLngs, {
              color: color,
              weight: 5,
              opacity: 0.85,
            }).bindPopup(`<b>Ruta: ${routeObj.nombreRuta || routeKey}</b>`);

            polyline.addTo(this.routeLayer);
            latLngs.forEach((coord) => allBounds.extend(coord));
          }
        } catch (err) {
          const fallbackPolyline = L.polyline(points, {
            color: color,
            weight: 4,
            dashArray: '5, 10',
            opacity: 0.7,
          }).bindPopup(`<b>Ruta: ${routeObj.nombreRuta || routeKey} (Directa)</b>`);

          fallbackPolyline.addTo(this.routeLayer);
          points.forEach((coord) => allBounds.extend(coord));
        }
      }

      if (allBounds.isValid()) {
        this.map.fitBounds(allBounds, { padding: [40, 40] });
      }
    } catch (error) {
      console.error('Error cargando y calculando rutas:', error);
    }
  }

  private async geocodeAddressDynamic(street?: string, sector?: string): Promise<[number, number] | null> {
    const queries: string[] = [];

    if (street) {
      const cleanStreet = street.replace(/con/gi, '&').replace(/Urb-|Sect-/gi, '');
      queries.push(`${cleanStreet}, Maracaibo, Venezuela`);

      const parts = street.split(/con|y/i);
      if (parts.length > 1) {
        const cleanSector = sector ? sector.replace(/Urb-|Sect-/gi, '') : '';
        queries.push(`${parts[1].trim()}, ${cleanSector}, Maracaibo, Venezuela`);
        queries.push(`${parts[0].trim()}, Maracaibo, Venezuela`);
      }
    }

    if (sector) {
      const cleanSector = sector.replace(/Urb-|Sect-/gi, '');
      queries.push(`${cleanSector}, Maracaibo, Venezuela`);
    }

    for (const query of queries) {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
      try {
        const results = await this.http.get<any[]>(url).toPromise();
        if (results && results.length > 0) {
          const resLat = parseFloat(results[0].lat);
          const resLon = parseFloat(results[0].lon);

          if (Math.abs(resLat - 10.6447) > 0.001 || Math.abs(resLon - (-71.6106)) > 0.001) {
            return [resLat, resLon];
          }
        }
      } catch (err) {
        console.error('Error buscando:', query, err);
      }
    }

    return null;
  }

  private geocodeAddress(addressQuery: string): Promise<[number, number] | null> {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressQuery)}`;

    return new Promise((resolve) => {
      this.http.get<any[]>(url).subscribe({
        next: (results) => {
          if (results && results.length > 0) {
            const lat = parseFloat(results[0].lat);
            const lon = parseFloat(results[0].lon);
            resolve([lat, lon]);
          } else {
            const fallbackUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent('Maracaibo, Venezuela')}`;
            this.http.get<any[]>(fallbackUrl).subscribe({
              next: (fbResults) => {
                if (fbResults && fbResults.length > 0) {
                  resolve([parseFloat(fbResults[0].lat), parseFloat(fbResults[0].lon)]);
                } else {
                  resolve(null);
                }
              },
              error: () => resolve(null)
            });
          }
        },
        error: () => resolve(null)
      });
    });
  }

  private addUserMarker(coords: [number, number], title: string): void {
    const homeIcon = L.divIcon({
      className: 'custom-home-icon',
      html: `<div style="background-color: #06523f; color: white; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4);">
              <i class="pi pi-home" style="font-size: 1.2rem;"></i>
             </div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    if (this.userMarker) this.map.removeLayer(this.userMarker);

    this.userMarker = L.marker(coords, { icon: homeIcon })
      .addTo(this.map)
      .bindPopup(`<b>${title}</b><br>${this.userAddressText}`)
      .openPopup();

    this.map.flyTo(coords, 15);
  }

  /**
   * Calcula la ruta más cercana a unas coordenadas sin dibujar nada.
   * Devuelve el id, el nombre visible, los puntos y la distancia en km.
   */
  private async findNearestRoute(
    coords: [number, number],
  ): Promise<{ id: string; nombre: string; puntos: [number, number][]; distanciaKm: number } | null> {
    const routesRef = ref(this.database, 'routes');
    const snapshot = await get(routesRef);

    if (!snapshot.exists()) return null;

    const data = snapshot.val();
    let minDistance = Infinity;
    let closestRoute: RutaData | null = null;
    let closestNombre = '';

    for (const [routeId, routeObj] of Object.entries<any>(data)) {
      if (!routeObj) continue;

      const puntos: [number, number][] = Object.values(routeObj)
        .filter((val: any) => val && typeof val === 'object' && val.x !== undefined && val.y !== undefined)
        .map((p: any) => [p.x, p.y]);

      if (puntos.length === 0) continue;

      for (const punto of puntos) {
        const dist = this.calcularDistanciaHaversine(coords[0], coords[1], punto[0], punto[1]);
        if (dist < minDistance) {
          minDistance = dist;
          closestRoute = { id: routeId, puntos };
          closestNombre = String(routeObj.nombreRuta ?? '').trim();
        }
      }
    }

    if (!closestRoute) return null;

    return {
      id: closestRoute.id,
      nombre: closestNombre,
      puntos: closestRoute.puntos,
      distanciaKm: parseFloat(minDistance.toFixed(2)),
    };
  }

  private async findAndDrawNearestRoute(userCoords: [number, number]): Promise<void> {
    const nearest = await this.findNearestRoute(userCoords);

    if (nearest) {
      this.nearestRouteId = nearest.id;
      this.routeDistanceKm = nearest.distanciaKm;
      this.trazarRutaConOSRM(nearest.puntos);
    }

    // Guarda la ruta como filtro: el usuario solo verá en tiempo real a los
    // supervisores cuya jornada activa sea de esta ruta. Si no hay ruta
    // cercana, el filtro queda vacío y no se muestra a ningún supervisor.
    this.supervisorFilterRoute = nearest
      ? { id: nearest.id, nombre: nearest.nombre }
      : { id: '', nombre: '' };
  }

  private async findAndDrawAsignedRoute(userId: string): Promise<void> {
    try {
      // 1. Obtener la información del usuario
      const userSnap = await get(ref(this.database, `usuarios/${userId}`));
      if (!userSnap.exists()) {
        console.warn('No se encontró información del usuario.');
        return;
      }

      const userData = userSnap.val();
      let rutaId = userData?.rutaId || userData?.ruta || '';
      let camionId = userData?.camionId || '';

      // 2. Si no tiene ruta o camión directo, buscar en 'grupoTripulacion'
      if (!rutaId && !camionId) {
        const gruposSnap = await get(ref(this.database, 'grupoTripulacion'));
        if (gruposSnap.exists()) {
          const gruposObj = gruposSnap.val();

          for (const key of Object.keys(gruposObj)) {
            const grupo = gruposObj[key];
            if (!grupo) continue;

            const esSupervisor = grupo.supervisor === userId;
            const esConductor = grupo.conductor === userId;
            const esCrew = grupo.crew && Object.values(grupo.crew).includes(userId);

            if (esSupervisor || esConductor || esCrew) {
              camionId = grupo.camion || '';
              break;
            }
          }
        }
      }

      // 3. Si tenemos camionId pero no rutaId, obtener la ruta del camión
      if (!rutaId && camionId) {
        const camionSnap = await get(ref(this.database, `camiones/${camionId}`));
        if (camionSnap.exists()) {
          const camionData = camionSnap.val();
          rutaId = camionData?.ruta || camionData?.rutaId || '';
        }
      }

      if (!rutaId) {
        console.warn('El usuario con rol operativo no tiene ninguna ruta asignada.');
        return;
      }

      // 4. Traer todas las rutas de Firebase en una sola petición
      const allRoutesSnap = await get(ref(this.database, 'routes'));
      if (!allRoutesSnap.exists()) {
        console.warn('No existe la colección de rutas en Firebase.');
        return;
      }

      const allRoutes = allRoutesSnap.val();
      let routeData: any = null;
      let actualRouteKey = rutaId;

      // A) Verificar si el id coincide exactamente con la Key (ej: 'route1' o '-P11jl1mB1ZkDjPp7ERN')
      if (allRoutes[rutaId]) {
        routeData = allRoutes[rutaId];
      } else {
        // B) Búsqueda y filtrado local por la propiedad 'nombreRuta' (ej: 'Algo')
        const foundKey = Object.keys(allRoutes).find(
          (key) => allRoutes[key]?.nombreRuta === rutaId
        );

        if (foundKey) {
          actualRouteKey = foundKey;
          routeData = allRoutes[foundKey];
        }
      }

      if (!routeData) {
        console.warn(`La ruta asignada '${rutaId}' no existe en Firebase.`);
        return;
      }

      // 5. Mapear y filtrar los puntos válidos (x = latitud, y = longitud)
      const puntos: [number, number][] = Object.values(routeData)
        .filter((val: any) => val && typeof val === 'object' && val.x !== undefined && val.y !== undefined)
        .map((p: any) => [p.x, p.y]);

      if (puntos.length === 0) {
        console.warn('La ruta asignada no posee puntos válidos.');
        return;
      }

      this.nearestRouteId = actualRouteKey;
      this.trazarRutaConOSRM(puntos);

    } catch (error) {
      console.error('Error al buscar y dibujar la ruta asignada:', error);
    }
  }
  private trazarRutaConOSRM(points: [number, number][]): void {
    if (points.length < 2) return;

    const coordsString = points.map((p) => `${p[1]},${p[0]}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordsString}?geometries=geojson&overview=full`;

    this.http.get<any>(url).subscribe({
      next: (data) => {
        if (!data.routes || data.routes.length === 0) return;

        const coordinates = data.routes[0].geometry.coordinates;
        const latLngs: [number, number][] = coordinates.map((c: number[]) => [c[1], c[0]]);

        if (this.routePolyline) this.map.removeLayer(this.routePolyline);

        this.routePolyline = L.polyline(latLngs, {
          color: '#68a357',
          weight: 6,
          opacity: 0.9,
        }).addTo(this.map);

        const bounds = this.routePolyline.getBounds();
        if (this.userCoords) {
          bounds.extend(this.userCoords);
        }
        this.map.fitBounds(bounds, { padding: [40, 40] });
      },
      error: (err) => console.error('Error al trazar ruta con OSRM:', err)
    });
  }

  private calcularDistanciaHaversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  ngOnDestroy(): void {
    if (this.unsubscribeSupervisores) {
      this.unsubscribeSupervisores();
    }
    if (this.unsubscribeInformesActivos) {
      this.unsubscribeInformesActivos();
    }
    if (this.map) {
      this.map.remove();
    }
  }
}
