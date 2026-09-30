import { Component, AfterViewInit, OnDestroy, inject, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Database, ref, get } from '@angular/fire/database';
import * as L from 'leaflet';
import { firstValueFrom } from 'rxjs';

import { UserService } from '../../@core/services/user.service';
import { AuthService } from '../../@core/services/auth.service';

interface RutaData {
  id: string;
  puntos: [number, number][]; // Array de [lat, lng]
}

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

    // Capturar clics sobre el mapa para obtener coordenadas exactas
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;

      console.log('📍 COORDENADAS HACIENDO CLIC EN EL MAPA:');
      console.log(`lat: ${lat}, lng: ${lng}`);
      console.log(`Formato para Firebase -> "lat": ${lat}, "lng": ${lng}`);
    });
  }

  /**
   * Extrae únicamente los nodos con coordenadas válidas (ignora nombreRuta u otras propiedades)
   */
  private extractValidPointsFromRouteObj(routeObj: any): [number, number][] {
    if (!routeObj || typeof routeObj !== 'object') return [];

    const validPoints: [number, number][] = [];

    Object.keys(routeObj).forEach((key) => {
      const val = routeObj[key];
      // Verificar que el subnodo sea un objeto con latitud y longitud válidas
      if (val && typeof val === 'object' && typeof val.x === 'number' && typeof val.y === 'number') {
        validPoints.push([val.x, val.y]);
      }
    });

    return validPoints;
  }

  /**
   * Obtiene la información del usuario y decide el renderizado según el rol
   */
  private async loadUserDataAndFindRoute(): Promise<void> {
    this.loading = true;

    let currentUser = this.userService.currentUserSignal();
    if (!currentUser) {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        try {
          currentUser = JSON.parse(stored);
        } catch {}
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

      const userData = snapshot.val();
      const userRole = userData.rol;
      this.userRole = userRole ?? null;
      const address = userData.address;

      // Mostrar la ubicación del usuario si es rol estándar
      if (userRole === 'user' && address && address.lat && address.lng) {
        const numLat = parseFloat(address.lat);
        const numLng = parseFloat(address.lng);

        if (!isNaN(numLat) && !isNaN(numLng)) {
          this.userCoords = [numLat, numLng];
          this.addUserMarker(this.userCoords, `${userData.name || 'Usuario'}, tu ubicación`);
        }
      }

      console.log('Rol autenticado:', userRole);

      // 2. Lógica de renderizado según el Rol
      if (userRole === 'admin') {
        console.log('👑 Rol de Admin detectado: renderizando todas las rutas.');
        await this.drawAllRoutes();
      } else if (userRole === 'mecanico') {
        console.log('🔧 Rol de Mecánico detectado: renderizando rutas asignadas a camiones.');
        await this.drawAllRoutesAssignedToAVehicle();
      } else if (userRole === 'conductor' || userRole === 'supervisor' || userRole === 'crew') {
        await this.drawAllRoutesAssignedToACrew();
      } else if (userRole === 'user' && this.userCoords) {
        console.log('👤 Rol estándar detectado: calculando ruta más cercana.');
        await this.findAndDrawNearestRoute(this.userCoords);
      } else if (userRole === 'user') {
        console.warn('Usuario estándar sin coordenadas válidas para buscar rutas.');
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
   * Obtiene y dibuja ÚNICAMENTE la ruta asignada al camión del usuario en sesión
   * (Aplica para roles: conductor, supervisor, crew).
   */
  private async drawAllRoutesAssignedToACrew(): Promise<void> {
    try {
      let currentUser = this.userService.currentUserSignal();
      if (!currentUser) {
        const stored = localStorage.getItem('currentUser');
        if (stored) {
          try {
            currentUser = JSON.parse(stored);
          } catch {}
        }
      }
  
      if (!currentUser || !currentUser.uid) {
        console.warn('No se encontró sesión activa.');
        return;
      }
  
      // 1. Obtener la información del usuario autenticado
      const userSnap = await get(ref(this.database, `usuarios/${currentUser.uid}`));
      if (!userSnap.exists()) {
        console.warn('Usuario no encontrado en la base de datos.');
        return;
      }
  
      const userData = userSnap.val();
      const camionId = userData?.camionId;
  
      if (!camionId) {
        console.warn(`El usuario ${userData?.name || currentUser.uid} no tiene un camión asignado (camionId).`);
        return;
      }
  
      // 2. Obtener la información del camión asignado
      const camionSnap = await get(ref(this.database, `camiones/${camionId}`));
      if (!camionSnap.exists()) {
        console.warn(`No se encontró la información del camión ${camionId} en Firebase.`);
        return;
      }
  
      const camionData = camionSnap.val();
      const rutaBuscada = camionData?.ruta ? camionData.ruta.trim() : null;
  
      if (!rutaBuscada) {
        console.warn(`El camión ${camionId} no tiene una ruta asignada actualmente.`);
        return;
      }
  
      // 3. Obtener el catálogo de rutas para ubicar las coordenadas
      const routesSnap = await get(ref(this.database, 'routes'));
      if (!routesSnap.exists()) {
        console.warn('No existen rutas registradas en la base de datos.');
        return;
      }
  
      const routesData = routesSnap.val();
      let routeObj: any = null;
      let routeKeyReal = '';
  
      // Buscar coincidencia directa por clave o por la propiedad 'nombreRuta'
      if (routesData[rutaBuscada]) {
        routeObj = routesData[rutaBuscada];
        routeKeyReal = rutaBuscada;
      } else {
        const foundEntry = Object.entries<any>(routesData).find(
          ([k, r]) => r && r.nombreRuta && r.nombreRuta.trim() === rutaBuscada
        );
        if (foundEntry) {
          routeKeyReal = foundEntry[0];
          routeObj = foundEntry[1];
        }
      }
  
      if (!routeObj) {
        console.warn(`No se encontró la definición del trazado para la ruta: ${rutaBuscada}`);
        return;
      }
  
      const routeName = routeObj?.nombreRuta || routeKeyReal;
      const points = this.extractValidPointsFromRouteObj(routeObj);
  
      if (points.length < 2) {
        console.warn(`La ruta ${routeName} no contiene suficientes puntos de trazado.`);
        return;
      }
  
      // 4. Preparar la capa del mapa
      if (this.routeLayer) {
        this.map.removeLayer(this.routeLayer);
      }
      this.routeLayer = L.layerGroup().addTo(this.map);
  
      // 5. Trazar la ruta con el API OSRM usando fetch directamente
      const coordsString = points.map((p) => `${p[1]},${p[0]}`).join(';');
      const url = `https://router.project-osrm.org/route/v1/driving/${coordsString}?geometries=geojson&overview=full`;
  
      const popupContent = `
        <b>Tu Ruta Asignada: ${routeName}</b><br>
        <small><b>Vehículo:</b> ${camionId} (${camionData.placa || ''})</small>
      `;
  
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        
        const data = await response.json();
  
        if (data && data.routes && data.routes.length > 0) {
          const coordinates = data.routes[0].geometry.coordinates;
          const latLngs: [number, number][] = coordinates.map((c: number[]) => [c[1], c[0]]);
  
          const polyline = L.polyline(latLngs, {
            color: '#007bff',
            weight: 6,
            opacity: 0.9,
          }).bindPopup(popupContent);
  
          polyline.addTo(this.routeLayer);
  
          const bounds = polyline.getBounds();
          this.map.fitBounds(bounds, { padding: [50, 50] });
        }
      } catch (err) {
        console.warn(`Fallback a línea recta para ${routeName}:`, err);
  
        const fallbackPolyline = L.polyline(points, {
          color: '#007bff',
          weight: 4,
          dashArray: '5, 10',
          opacity: 0.8,
        }).bindPopup(`${popupContent} <br><small>(Línea recta)</small>`);
  
        fallbackPolyline.addTo(this.routeLayer);
  
        const bounds = fallbackPolyline.getBounds();
        this.map.fitBounds(bounds, { padding: [50, 50] });
      }
    } catch (error) {
      console.error('Error al dibujar la ruta del personal:', error);
    }
  }

  /**
     * Obtiene los camiones activos y sus rutas asociadas, trazando solo aquellas rutas
     * que estén actualmente asignadas a un camión (buscando por ID o por nombreRuta).
     */
    private async drawAllRoutesAssignedToAVehicle(): Promise<void> {
      try {
        // 1. Obtener camiones y rutas desde Firebase
        const camionesSnap = await get(ref(this.database, 'camiones'));
        const routesSnap = await get(ref(this.database, 'routes'));
  
        if (!camionesSnap.exists() || !routesSnap.exists()) {
          console.warn('No hay suficiente información de camiones o rutas en Firebase');
          return;
        }
  
        const camionesData = camionesSnap.val();
        const routesData = routesSnap.val();
  
        // 2. Mapear cada identificador/nombre de ruta con la lista de camiones asignados
        const assignedRoutesMap = new Map<string, string[]>(); // identificadorRuta -> lista de IDs de camiones
  
        Object.entries<any>(camionesData).forEach(([camionId, camion]) => {
          if (camion && camion.ruta) {
            const rutaRef = camion.ruta.trim();
            if (!assignedRoutesMap.has(rutaRef)) {
              assignedRoutesMap.set(rutaRef, []);
            }
            assignedRoutesMap.get(rutaRef)?.push(camionId);
          }
        });
  
        if (assignedRoutesMap.size === 0) {
          console.warn('No hay camiones con rutas asignadas actualmente');
          return;
        }
  
        // 3. Preparar capa del mapa
        if (this.routeLayer) {
          this.map.removeLayer(this.routeLayer);
        }
        this.routeLayer = L.layerGroup().addTo(this.map);
  
        const colors = ['#ffe8bf', '#28a745', '#007bff', '#dc3545', '#17a2b8', '#6f42c1'];
        let colorIndex = 0;
        const allBounds: L.LatLngBounds = L.latLngBounds([]);
  
        // 4. Dibujar las rutas asignadas buscando por key o por nombreRuta
        for (const [rutaBuscada, camionesAsignados] of assignedRoutesMap.entries()) {
          let routeObj: any = null;
          let routeKeyReal = '';
  
          // Buscar coincidencia directa por clave o por la propiedad 'nombreRuta'
          if (routesData[rutaBuscada]) {
            routeObj = routesData[rutaBuscada];
            routeKeyReal = rutaBuscada;
          } else {
            const foundEntry = Object.entries<any>(routesData).find(
              ([k, r]) => r && r.nombreRuta && r.nombreRuta.trim() === rutaBuscada
            );
            if (foundEntry) {
              routeKeyReal = foundEntry[0];
              routeObj = foundEntry[1];
            }
          }
  
          if (!routeObj) {
            console.warn(`No se encontró el trazado en /routes para: ${rutaBuscada}`);
            continue;
          }
  
          const routeName = routeObj?.nombreRuta || routeKeyReal;
          const points = this.extractValidPointsFromRouteObj(routeObj);
  
          if (points.length >= 2) {
            const color = colors[colorIndex % colors.length];
            colorIndex++;
  
            const coordsString = points.map((p) => `${p[1]},${p[0]}`).join(';');
            const url = `https://router.project-osrm.org/route/v1/driving/${coordsString}?geometries=geojson&overview=full`;
  
            const popupContent = `
              <b>Ruta: ${routeName}</b><br>
              <small><b>Vehículo(s):</b> ${camionesAsignados.join(', ')}</small>
            `;
  
            try {
              const data = await this.http.get<any>(url).toPromise();
              if (data && data.routes && data.routes.length > 0) {
                const coordinates = data.routes[0].geometry.coordinates;
                const latLngs: [number, number][] = coordinates.map((c: number[]) => [c[1], c[0]]);
  
                const polyline = L.polyline(latLngs, {
                  color: color,
                  weight: 6,
                  opacity: 0.9,
                }).bindPopup(popupContent);
  
                polyline.addTo(this.routeLayer);
                latLngs.forEach((coord) => allBounds.extend(coord));
              }
            } catch (err) {
              console.warn(`Fallback a línea recta para ${routeName}:`, err);
  
              const fallbackPolyline = L.polyline(points, {
                color: color,
                weight: 4,
                dashArray: '5, 10',
                opacity: 0.8,
              }).bindPopup(`${popupContent} <br><small>(Línea recta)</small>`);
  
              fallbackPolyline.addTo(this.routeLayer);
              points.forEach((coord) => allBounds.extend(coord));
            }
          }
        }
  
        // Ajustar vista para encuadrar todas las rutas trazadas
        if (allBounds.isValid()) {
          this.map.fitBounds(allBounds, { padding: [40, 40] });
        }
      } catch (error) {
        console.error('Error al dibujar rutas asignadas a camiones:', error);
      }
    }

  /**
   * Dibuja TODAS las rutas registradas en Firebase ajustándolas a las carreteras mediante OSRM
   */
  private async drawAllRoutes(): Promise<void> {
    try {
      const routesRef = ref(this.database, 'routes');
      const snapshot = await get(routesRef);

      if (!snapshot.exists()) {
        console.warn('No existen rutas registradas en Firebase');
        return;
      }

      const routesData = snapshot.val();
      const colors = ['#06523f', '#28a745', '#007bff', '#dc3545', '#ffc107', '#6f42c1'];
      let colorIndex = 0;

      if (this.routeLayer) {
        this.map.removeLayer(this.routeLayer);
      }
      this.routeLayer = L.layerGroup().addTo(this.map);

      const allBounds: L.LatLngBounds = L.latLngBounds([]);

      for (const routeKey of Object.keys(routesData)) {
        const routeObj = routesData[routeKey];
        const routeName = routeObj?.nombreRuta || routeKey;

        const points = this.extractValidPointsFromRouteObj(routeObj);

        if (points.length >= 2) {
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
              }).bindPopup(`<b>Ruta: ${routeName}</b>`);

              polyline.addTo(this.routeLayer);
              latLngs.forEach((coord) => allBounds.extend(coord));
            }
          } catch (err) {
            console.warn(`Fallback a línea recta para ${routeName}:`, err);

            const fallbackPolyline = L.polyline(points, {
              color: color,
              weight: 4,
              dashArray: '5, 10',
              opacity: 0.7,
            }).bindPopup(`<b>Ruta: ${routeName} (Directa)</b>`);

            fallbackPolyline.addTo(this.routeLayer);
            points.forEach((coord) => allBounds.extend(coord));
          }
        }
      }

      if (allBounds.isValid()) {
        this.map.fitBounds(allBounds, { padding: [40, 40] });
      }
    } catch (error) {
      console.error('Error cargando y calculando rutas:', error);
    }
  }

  /**
   * Marca la casa del usuario en el mapa
   */
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
   * Obtiene las rutas de Firebase, calcula cuál pasa más cerca y la dibuja
   */
  private async findAndDrawNearestRoute(userCoords: [number, number]): Promise<void> {
    const routesRef = ref(this.database, 'routes');
    const snapshot = await get(routesRef);

    if (!snapshot.exists()) {
      console.warn('No hay rutas guardadas en Firebase.');
      return;
    }

    const data = snapshot.val();
    let minDistance = Infinity;
    let closestRoute: RutaData | null = null;

    for (const [routeId, routeObj] of Object.entries<any>(data)) {
      const puntos = this.extractValidPointsFromRouteObj(routeObj);
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

  /**
   * Llama al motor OSRM para trazar el camino real sobre las vías urbanas
   */
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
      error: (err) => console.error('Error al trazar ruta con OSRM:', err),
    });
  }

  /**
   * Fórmula Haversine para calcular distancia en kilómetros entre dos coordenadas
   */
  private calcularDistanciaHaversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radio de la Tierra en Km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  ngOnDestroy(): void {
    if (this.map) this.map.remove();
  }
}