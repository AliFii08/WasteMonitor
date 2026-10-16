import { Component, AfterViewInit, OnDestroy, inject, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Database, ref, get, onValue, Unsubscribe, query, equalTo, orderByChild } from '@angular/fire/database';
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
  private routeLayer!: L.LayerGroup;
  private supervisorMarkers: Map<string, L.Marker> = new Map();
  private unsubscribeSupervisores?: Unsubscribe;

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
        console.log('Rol de Admin detectado: renderizando todas las rutas.');
        await this.drawAllRoutes();
        this.listenSupervisorLocations();
      } else if (normalizedRole === 'user' && this.userCoords) {
        console.log('👤 Rol estándar detectado: calculando ruta más cercana.');
        await this.findAndDrawNearestRoute(this.userCoords);
      } else if (normalizedRole === 'user') {
        console.warn('Usuario estándar sin coordenadas válidas para buscar rutas.');
      } else if (['conductor', 'crew', 'supervisor', 'mecanico'].includes(normalizedRole)) {
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

  private listenSupervisorLocations(): void {
    const trackingRef = ref(this.database, 'tracking');

    this.unsubscribeSupervisores = onValue(trackingRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const trackingData = snapshot.val();

      this.ngZone.run(() => {
        Object.entries<any>(trackingData).forEach(([userId, payload]) => {
          const current = payload?.current;

          if (current && current.active && current.latitude && current.longitude) {
            const lat = Number(current.latitude);
            const lng = Number(current.longitude);
            const label = `Supervisor (${userId.substring(0, 5)}...)`;

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
          } else {
            if (this.supervisorMarkers.has(userId)) {
              this.supervisorMarkers.get(userId)!.remove();
              this.supervisorMarkers.delete(userId);
            }
          }
        });
      });
    });
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

  private async findAndDrawNearestRoute(userCoords: [number, number]): Promise<void> {
    const routesRef = ref(this.database, 'routes');
    const snapshot = await get(routesRef);

    if (!snapshot.exists()) return;

    const data = snapshot.val();
    let minDistance = Infinity;
    let closestRoute: RutaData | null = null;

    for (const [routeId, routeObj] of Object.entries<any>(data)) {
      if (!routeObj) continue;

      const puntos: [number, number][] = Object.values(routeObj)
        .filter((val: any) => val && typeof val === 'object' && val.x !== undefined && val.y !== undefined)
        .map((p: any) => [p.x, p.y]);

      if (puntos.length === 0) continue;

      for (const punto of puntos) {
        const dist = this.calcularDistanciaHaversine(userCoords[0], userCoords[1], punto[0], punto[1]);
        if (dist < minDistance) {
          minDistance = dist;
          closestRoute = { id: routeId, puntos };
        }
      }
    }

    if (closestRoute) {
      this.nearestRouteId = closestRoute.id;
      this.routeDistanceKm = parseFloat(minDistance.toFixed(2));
      this.trazarRutaConOSRM(closestRoute.puntos);
    }
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
    if (this.map) {
      this.map.remove();
    }
  }
}
