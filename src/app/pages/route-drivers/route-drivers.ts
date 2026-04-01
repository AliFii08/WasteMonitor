import { Component, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common'; // Para el *ngFor
import { Database, ref, onValue, set, push } from '@angular/fire/database'; // Firebase
import * as L from 'leaflet';

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

  // Inyección de servicios
  private http = inject(HttpClient);
  private database = inject(Database);

  ngAfterViewInit(): void {
    this.initMap();
    this.loadRoutesFromFirebase();
  }

  private initMap(): void {
    this.map = L.map('map').setView([10.6447, -71.6106], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }).addTo(this.map);

    // Evento para CREAR puntos al hacer clic
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.addPointToCurrentRoute(e.latlng.lat, e.latlng.lng);
    });
  }

  // Carga inicial de todas las rutas para el desplegable
  private loadRoutesFromFirebase() {
    const routesRef = ref(this.database, 'routes');
    onValue(routesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        this.availableRoutes = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
      }
    });
  }

  // Al seleccionar una ruta en el HTML
  onRouteSelect(event: any) {
    this.selectedRouteId = event.target.value;
    const route = this.availableRoutes.find((r) => r.id === this.selectedRouteId);
    if (route) {
      // Convertimos el objeto de puntos (p1, p2...) en un array ordenado para OSRM
      const points = Object.values(route).filter((val) => typeof val === 'object');
      this.trazarRutaReal(points);
    }
  }

  private trazarRutaReal(points: any[]): void {
    if (points.length < 2) return;

    // Formateamos para OSRM: "lng,lat;lng,lat;lng,lat..."
    const coordsString = points.map((p: any) => `${p.y},${p.x}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordsString}?geometries=geojson&overview=full`;

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

  // Guardar nuevo punto en la ruta actual de Firebase
  private addPointToCurrentRoute(lat: number, lng: number) {
    if (!this.selectedRouteId) {
      alert('Por favor, selecciona o crea una ruta primero en el desplegable');
      return;
    }

    // Buscamos el siguiente índice (p1, p2, p3...)
    const routeRef = ref(this.database, `routes/${this.selectedRouteId}`);
    const newPointRef = push(routeRef); // Firebase genera un ID único o puedes manejar pN manualmente

    set(newPointRef, { x: lat, y: lng }).then(() => {
      console.log('Punto guardado en Firebase');
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
