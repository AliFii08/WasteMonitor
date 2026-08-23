import { Component, AfterViewInit, OnDestroy, NgZone, inject } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common'; // Para el *ngFor
import { Database, ref, get, set, push } from '@angular/fire/database'; // Firebase
import * as L from 'leaflet';

const localPointIcon = L.divIcon({
  className: 'local-point-icon',
  html: '<i class="pi pi-map-marker" style="color: #FF0000;"></i>',
  iconSize: [24, 24],
  iconAnchor: [12, 24],
});

@Component({
  selector: 'app-route-drivers',
  standalone: true,
  imports: [HttpClientModule, CommonModule],
  templateUrl: './route-drivers.html',
  styleUrl: './route-drivers.scss',
})
export class RouteDrivers implements AfterViewInit, OnDestroy {
  map!: L.Map;
  private routeLayer!: L.Polyline;
  private markers: L.Marker[] = [];

  // Lista de rutas obtenidas de Firebase
  availableRoutes: any[] = [];
  selectedRouteId: string = '';
  // Estado para la ruta local (temporal, en memoria)
  isBuildingLocalRoute: boolean = false;
  localRoutePoints: { x: number | null; y: number | null }[] = [];
  awaitingLocalPoint: boolean = false;

  // Inyección de servicios
  private http = inject(HttpClient);
  private database = inject(Database);
  private ngZone = inject(NgZone);

  ngAfterViewInit(): void {
    this.initMap();
    this.loadRoutesFromFirebase();
  }

  private initMap(): void {
    this.map = L.map('map').setView([10.6447, -71.6106], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }).addTo(this.map);

    console.log('Mapa inicializado', { isBuildingLocalRoute: this.isBuildingLocalRoute, selectedRouteId: this.selectedRouteId });

    // Evento para manejar clics en el mapa fuera de Angular
    this.ngZone.runOutsideAngular(() => {
      this.map.on('click', (e: L.LeafletMouseEvent) => {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        console.log('Click en mapa', { lat, lng, isBuildingLocalRoute: this.isBuildingLocalRoute, awaitingLocalPoint: this.awaitingLocalPoint });

        if (this.isBuildingLocalRoute) {
          if (!this.awaitingLocalPoint) {
            console.log('Click ignorado: no está activo el modo Agregar punto');
            return;
          }
          this.ngZone.run(() => this.addLocalPoint(lat, lng));
          return;
        }

        this.ngZone.run(() => this.addPointToCurrentRoute(lat, lng));
      });
    });
  }

  // Carga inicial de todas las rutas para el desplegable
  private loadRoutesFromFirebase() {
    console.log('Leyendo rutas desde Firebase...');
    const routesRef = ref(this.database, 'routes');
    get(routesRef)
      .then((snapshot) => {
        const data = snapshot.val();
        console.log('Snapshot de rutas recibida', data);
        if (data) {
          this.availableRoutes = Object.keys(data).map((key) => ({
            id: key,
            ...data[key],
          }));
          console.log('Rutas disponibles actualizadas', this.availableRoutes.map((route) => route.id));
        } else {
          this.availableRoutes = [];
          console.log('No hay rutas en Firebase');
        }
      })
      .catch((error) => {
        console.error('Error leyendo rutas desde Firebase', error);
      });
  }

  // Al seleccionar una ruta en el HTML
  onRouteSelect(event: any) {
    this.selectedRouteId = event.target.value;
    console.log('Ruta seleccionada', this.selectedRouteId);
    // Desactivar modo de ruta local
    this.isBuildingLocalRoute = false;
    this.localRoutePoints = [];
    this.awaitingLocalPoint = false;

    const route = this.availableRoutes.find((r) => r.id === this.selectedRouteId);
    if (route) {
      console.log('Cargando ruta de Firebase', route);
      // Convertimos el objeto de puntos (p1, p2...) en un array ordenado para OSRM
      const points = Object.values(route).filter((val) => typeof val === 'object');
      this.trazarRutaReal(points as any[]);
    } else {
      console.log('Ruta no encontrada en availableRoutes', this.selectedRouteId);
    }
  }

  trackByRouteId(index: number, route: any) {
    return route?.id;
  }

  private trazarRutaReal(points: any[]): void {
    console.log('Trazando ruta real con puntos', points);
    if (points.length < 2) return;

    // Formateamos para OSRM: "lng,lat;lng,lat;lng,lat..."
    const coordsString = points.map((p: any) => `${p.y},${p.x}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordsString}?geometries=geojson&overview=full`;
    console.log('Llamando a OSRM', url);

    this.http.get(url).subscribe((data: any) => {
      const coordinates = data.routes[0].geometry.coordinates;
      const latLngs = coordinates.map((coords: number[]) => [coords[1], coords[0]]);

      if (this.routeLayer) this.map.removeLayer(this.routeLayer);

      this.routeLayer = L.polyline(latLngs, {
        color: '#68a357',
        weight: 6,
        opacity: 0.9,
      }).addTo(this.map);

      this.map.fitBounds(this.routeLayer.getBounds());
    });
  }

    // Crear una nueva ruta en memoria (no se guarda en Firebase)
    createLocalRoute() {
      console.log('Iniciando ruta local');
      this.isBuildingLocalRoute = true;
      this.localRoutePoints = [];
      this.awaitingLocalPoint = false;
      // Deseleccionar cualquier ruta cargada
      this.selectedRouteId = '';
      if (this.routeLayer) {
        this.map.removeLayer(this.routeLayer);
      }
      this.markers.forEach((m) => m.remove());
      this.markers = [];
      console.log('Ruta local creada', { localRoutePoints: this.localRoutePoints });
      alert('Ruta local creada. Pulsa "Agregar punto" y luego selecciona un punto en el mapa.');
    }

    // Preparar el siguiente clic en el mapa para añadir un punto local
    prepareAddLocalPoint() {
      console.log('Preparando para agregar punto local');
      if (!this.isBuildingLocalRoute) {
        alert('Crea una ruta local primero con "Crear ruta local"');
        return;
      }
      this.awaitingLocalPoint = true;
      console.log('Modo Agregar punto activado', { awaitingLocalPoint: this.awaitingLocalPoint });
      alert('Selecciona un punto en el mapa para añadirlo a la ruta local.');
    }

    private addLocalPoint(lat: number, lng: number) {
      console.log('Añadiendo punto local', { lat, lng });
      // Añadimos el punto al array local
      this.localRoutePoints.push({ x: lat, y: lng });
      this.awaitingLocalPoint = false;
      console.log('Estado de localRoutePoints', this.localRoutePoints);
      this.updateLocalRouteOnMap();
    }

    private updateLocalRouteOnMap() {
      console.log('Actualizando ruta local en el mapa', { localRoutePoints: this.localRoutePoints });
      // Limpiar marcador antiguo
      this.markers.forEach((m) => m.remove());
      this.markers = [];

      const validPoints = this.localRoutePoints.filter((p) => p && p.x !== null && p.y !== null) as any[];
      console.log('Puntos válidos para dibujar', validPoints);

      if (validPoints.length === 0) return;

      // Añadir marcadores
      validPoints.forEach((p) => {
        const m = L.marker([p.x, p.y], { icon: localPointIcon }).addTo(this.map);
        this.markers.push(m);
      });

      // Si hay 2 o más puntos, intentamos trazar la ruta con OSRM como la versión original
      if (validPoints.length >= 2) {
        this.trazarRutaReal(validPoints);
      } else {
        // Si sólo hay 1 punto, centramos el mapa en ese punto
        const p = validPoints[0];
        this.map.flyTo([p.x, p.y], 15);
      }
    }

  saveLocalRouteToFirebase() {
    console.log('Guardando ruta local en Firebase', { isBuildingLocalRoute: this.isBuildingLocalRoute, localRoutePoints: this.localRoutePoints });
    if (!this.isBuildingLocalRoute || this.localRoutePoints.length === 0) {
      alert('No hay ruta local para guardar. Crea una ruta local y agrega puntos primero.');
      return;
    }

    const pointsObject: Record<string, { x: number; y: number }> = {};
    this.localRoutePoints.forEach((point, index) => {
      if (point.x !== null && point.y !== null) {
        pointsObject[`p${index + 1}`] = { x: point.x, y: point.y };
      }
    });
    console.log('Objeto a guardar en Firebase', pointsObject);

    if (Object.keys(pointsObject).length === 0) {
      alert('La ruta local no contiene puntos válidos. Agrega al menos un punto.');
      return;
    }

    const routeNumber = this.availableRoutes.length + 1;
    const routeKey = `route${routeNumber}`;
    const newRouteRef = ref(this.database, `routes/${routeKey}`);

    set(newRouteRef, pointsObject)
      .then(() => {
        console.log('Ruta guardada en Firebase correctamente', { routeKey });
        this.isBuildingLocalRoute = false;
        this.awaitingLocalPoint = false;
        this.localRoutePoints = [];
        this.loadRoutesFromFirebase();
        alert('Ruta guardada en Firebase con llave: ' + routeKey);
      })
      .catch((error) => {
        console.error('Error guardando ruta local en Firebase:', error);
        alert('Ocurrió un error al guardar la ruta en Firebase. Revisa la consola.');
      });
  }

  // Guardar nuevo punto en la ruta actual de Firebase
  private addPointToCurrentRoute(lat: number, lng: number) {
    console.log('Añadiendo punto a ruta existente en Firebase', { selectedRouteId: this.selectedRouteId, lat, lng });
    if (!this.selectedRouteId) {
      alert('Por favor, selecciona o crea una ruta primero en el desplegable');
      return;
    }

    // Buscamos el siguiente índice (p1, p2, p3...)
    const routeRef = ref(this.database, `routes/${this.selectedRouteId}`);
    const newPointRef = push(routeRef); // Firebase genera un ID único o puedes manejar pN manualmente

    set(newPointRef, { x: lat, y: lng }).then(() => {
      console.log('Punto guardado en Firebase', { routeId: this.selectedRouteId, lat, lng });
      alert('Punto guardado en la ruta existente');
      // El onValue de loadRoutesFromFirebase se encargará de refrescar la vista automáticamente
    });
  }

  resetView() {
    if (this.map && this.routeLayer) {
      this.map.fitBounds(this.routeLayer.getBounds());
    } else {
      this.map.flyTo([10.6447, -71.6106], 13);
    }
  }

  ngOnDestroy(): void {
    if (this.map) this.map.remove();
  }
}
