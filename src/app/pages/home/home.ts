import { Component, AfterViewInit, OnDestroy, inject, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Database, ref, get } from '@angular/fire/database';
import * as L from 'leaflet';

import { UserService } from '../../@core/services/user.service';
import { AuthService } from '../../@core/services/auth.service';

interface Punto {
  x: number; // latitud
  y: number; // longitud
}

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
   * Obtiene la información del usuario y decide si dibujar todas las rutas (admin)
   * o únicamente la más cercana (usuario regular).
   */
  private async loadUserDataAndFindRoute(): Promise<void> {
    this.loading = true;

    let currentUser = this.userService.currentUserSignal();
    if (!currentUser) {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        try { currentUser = JSON.parse(stored); } catch {}
      }
    }

    if (!currentUser || !currentUser.uid) {
      console.warn('No se encontró sesión activa');
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
      const userRole = userData.rol; // 'admin', 'user', 'supervisor', etc.
      const address = userData.address;

      // 2. Posicionar el pin de la vivienda del usuario si posee coordenadas
      if (address && address.lat && address.lng) {
        const numLat = parseFloat(address.lat);
        const numLng = parseFloat(address.lng);

        if (!isNaN(numLat) && !isNaN(numLng)) {
          this.userCoords = [numLat, numLng];
          this.addUserMarker(this.userCoords, `${userData.name || 'Usuario'}, tu ubicación`);
        }
      }

      // 3. Lógica de renderizado según el Rol
      if (userRole === 'admin') {
        console.log('👑 Rol de Admin detectado: renderizando todas las rutas.');
        await this.drawAllRoutes();
      } else if (this.userCoords) {
        console.log('👤 Rol estándar detectado: calculando ruta más cercana.');
        await this.findAndDrawNearestRoute(this.userCoords);
      } else {
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
      const colors = ['#28a745', '#007bff', '#dc3545', '#ffc107', '#17a2b8', '#6f42c1'];
      let colorIndex = 0;

      // Limpiar capas anteriores de rutas si existen
      if (this.routeLayer) {
        this.map.removeLayer(this.routeLayer);
      }
      this.routeLayer = L.layerGroup().addTo(this.map);

      const allBounds: L.LatLngBounds = L.latLngBounds([]);

      // Recorrer y trazar cada ruta sobre la red vial
      for (const routeKey of Object.keys(routesData)) {
        const routeObj = routesData[routeKey];
        if (!routeObj) continue;

        const pointsKeys = Object.keys(routeObj).sort(); // Ordenar p1, p2, p3...
        const points: [number, number][] = pointsKeys.map((key) => [
          routeObj[key].x,
          routeObj[key].y
        ]);

        if (points.length >= 2) {
          const color = colors[colorIndex % colors.length];
          colorIndex++;

          // Formato OSRM: "lng,lat;lng,lat..."
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
                opacity: 0.85
              }).bindPopup(`<b>Ruta: ${routeKey}</b>`);

              polyline.addTo(this.routeLayer);
              latLngs.forEach((coord) => allBounds.extend(coord));
            }
          } catch (err) {
            console.error(`Error procesando trazado vial para ${routeKey}:`, err);
            
            // Fallback: Si OSRM falla o hay límite de peticiones, dibuja línea recta
            const fallbackPolyline = L.polyline(points, {
              color: color,
              weight: 4,
              dashArray: '5, 10',
              opacity: 0.7
            }).bindPopup(`<b>Ruta: ${routeKey} (Directa)</b>`);

            fallbackPolyline.addTo(this.routeLayer);
            points.forEach((coord) => allBounds.extend(coord));
          }
        }
      }

      // Ajustar la vista para encuadrar todas las rutas trazadas
      if (allBounds.isValid()) {
        this.map.fitBounds(allBounds, { padding: [40, 40] });
      }

    } catch (error) {
      console.error('Error cargando y calculando rutas:', error);
    }
  }

  /**
   * Geocodificador adaptativo para direcciones complejas de Maracaibo
   */
  private async geocodeAddressDynamic(street?: string, sector?: string): Promise<[number, number] | null> {
    const queries: string[] = [];

    if (street) {
      // Normalizar términos locales ("con" -> "&", eliminar prefijos)
      const cleanStreet = street.replace(/con/gi, '&').replace(/Urb-|Sect-/gi, '');
      queries.push(`${cleanStreet}, Maracaibo, Venezuela`);

      // Descomponer si contiene intersección (ej. "Av. 15Q con calle 55")
      const parts = street.split(/con|y/i);
      if (parts.length > 1) {
        // Probar buscando la calle o avenida secundaria con el sector
        const cleanSector = sector ? sector.replace(/Urb-|Sect-/gi, '') : '';
        queries.push(`${parts[1].trim()}, ${cleanSector}, Maracaibo, Venezuela`);
        queries.push(`${parts[0].trim()}, Maracaibo, Venezuela`);
      }
    }

    if (sector) {
      const cleanSector = sector.replace(/Urb-|Sect-/gi, '');
      queries.push(`${cleanSector}, Maracaibo, Venezuela`);
    }

    // Probar las consultas en orden de especificidad
    for (const query of queries) {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
      try {
        const results = await this.http.get<any[]>(url).toPromise();
        if (results && results.length > 0) {
          const resLat = parseFloat(results[0].lat);
          const resLon = parseFloat(results[0].lon);

          // Descartar si devuelve las coordenadas del centro exacto de Maracaibo (fallback por defecto)
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

  /**
   * Geocodificación usando Nominatim (OSM)
   */
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
            // Si la búsqueda exacta falla, probar con el sector genérico en Maracaibo
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
   * Obtiene las rutas de Firebase, calcula cuál pasa más cerca de la casa y la dibuja con OSRM
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

    // Recorrer cada ruta en Firebase
    for (const [routeId, routeObj] of Object.entries<any>(data)) {
      if (!routeObj) continue;

      // Convertir p1, p2, p3... en coordenadas [lat, lng]
      const puntos: [number, number][] = Object.values(routeObj)
        .filter((val: any) => val && typeof val === 'object' && val.x !== undefined && val.y !== undefined)
        .map((p: any) => [p.x, p.y]);

      if (puntos.length === 0) continue;

      // Calcular distancia mínima entre la casa y los puntos de esta ruta
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
      
      // Trazar el camino real por calles con OSRM
      this.trazarRutaConOSRM(closestRoute.puntos);
    }
  }

  /**
   * Llama al motor OSRM para trazar el camino real sobre las vías urbanas
   */
  private trazarRutaConOSRM(points: [number, number][]): void {
    if (points.length < 2) return;

    // Formato OSRM: "lng,lat;lng,lat..."
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

        // Encuadrar el mapa para ver tanto la casa del usuario como la ruta completa
        const bounds = this.routePolyline.getBounds();
        if (this.userCoords) {
          bounds.extend(this.userCoords);
        }
        this.map.fitBounds(bounds, { padding: [40, 40] });
      },
      error: (err) => console.error('Error al trazar ruta con OSRM:', err)
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
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
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