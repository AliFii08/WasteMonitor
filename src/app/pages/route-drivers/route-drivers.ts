import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import * as L from 'leaflet';

@Component({
  selector: 'app-route-drivers',
  standalone: true,
  imports: [HttpClientModule], // Asegúrate de tener esto para el trazado de calles
  templateUrl: './route-drivers.html',
  styleUrl: './route-drivers.scss',
})
export class RouteDrivers implements AfterViewInit, OnDestroy {
  map!: L.Map;
  private routeLayer!: L.Polyline;

  constructor(private http: HttpClient) {}

  ngAfterViewInit(): void {
    this.initMap();
  }

  private initMap(): void {
    this.map = L.map('map').setView([10.6447, -71.6106], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }).addTo(this.map);

    this.trazarRutaReal();
  }

  private trazarRutaReal(): void {
    // Ejemplo: De Bella Vista a un punto cercano
    const p1 = [10.6932014, -71.6339505]; //Urbe
    const p2 = [10.7008374, -71.6263984]; // Cerca de la casa de Ali
    const p3 = [10.7211974, -71.6315776]; // Sambil

    const url = `https://router.project-osrm.org/route/v1/driving/${p1[1]},${p1[0]};${p2[1]},${p2[0]};${p3[1]},${p3[0]}?geometries=geojson&overview=full`;

    this.http.get(url).subscribe((data: any) => {
      const coordinates = data.routes[0].geometry.coordinates;
      const latLngs = coordinates.map((coords: number[]) => [coords[1], coords[0]]);

      if (this.routeLayer) {
        this.map.removeLayer(this.routeLayer);
      }

      this.routeLayer = L.polyline(latLngs, {
        color: '#68a357',
        weight: 6,
        opacity: 0.9,
      }).addTo(this.map);

      this.map.fitBounds(this.routeLayer.getBounds());
    });
  }

  // --- ESTE ES EL MÉTODO QUE TE FALTA ---
  resetView() {
    if (this.map && this.routeLayer) {
      // Centra la cámara de nuevo en la ruta
      this.map.fitBounds(this.routeLayer.getBounds());
    } else {
      // Si no hay ruta, vuelve al centro de Maracaibo
      this.map.flyTo([10.6447, -71.6106], 13);
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }
}
