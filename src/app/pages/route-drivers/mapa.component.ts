import { Component, ElementRef, NgZone, ViewChild, inject } from '@angular/core';
import * as L from 'leaflet';
import { RoutesService, RouteData, RoutePoint } from '../../@core/services/routes.service';

const localPointIcon = L.divIcon({
  className: 'local-point-icon',
  html: '<i class="pi pi-map-marker" style="color: #FF0000;"></i>',
  iconSize: [24, 24],
  iconAnchor: [12, 24],
});

@Component({
  selector: 'app-mapa',
  standalone: true,
  template: `<div #mapContainer id="map"></div>`,
  styles: [`
    #map {
      height: 450px;
      width: 100%;
      border-radius: 15px;
      border: 3px solid white;
      box-shadow: 0 10px 20px rgba(0,0,0,0.05);
      z-index: 1;
    }
  `]
})
export class MapaComponent {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;

  private map!: L.Map;
  private routeLayer?: L.Polyline;
  private markers: L.Marker[] = [];
  private ngZone = inject(NgZone);

  initMap(onClickCallback: (lat: number, lng: number) => void): void {
    this.map = L.map(this.mapContainer.nativeElement).setView([10.6447, -71.6106], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }).addTo(this.map);

    this.ngZone.runOutsideAngular(() => {
      this.map.on('click', (e: L.LeafletMouseEvent) => {
        this.ngZone.run(() => onClickCallback(e.latlng.lat, e.latlng.lng));
      });
    });
  }

  // Dibujar la polínea que retorna OSRM en el mapa
  drawRoute(latLngs: [number, number][]): void {
    this.clearRoute();

    if (latLngs.length === 0) return;

    this.routeLayer = L.polyline(latLngs, {
      color: '#68a357',
      weight: 6,
      opacity: 0.9,
    }).addTo(this.map);

    this.map.fitBounds(this.routeLayer.getBounds());
  }

  // Renderizar los marcadores de puntos locales
  renderLocalMarkers(points: RoutePoint[]): void {
    this.clearMarkers();

    points.forEach((p) => {
      const m = L.marker([p.x, p.y], { icon: localPointIcon }).addTo(this.map);
      this.markers.push(m);
    });

    if (points.length === 1) {
      this.map.flyTo([points[0].x, points[0].y], 15);
    }
  }

  clearRoute(): void {
    if (this.routeLayer) {
      this.map.removeLayer(this.routeLayer);
      this.routeLayer = undefined;
    }
  }

  clearMarkers(): void {
    this.markers.forEach((m) => m.remove());
    this.markers = [];
  }

  clearAll(): void {
    this.clearRoute();
    this.clearMarkers();
  }

  resetView(): void {
    if (this.routeLayer) {
      this.map.fitBounds(this.routeLayer.getBounds());
    } else {
      this.map.flyTo([10.6447, -71.6106], 13);
    }
  }

  destroyMap(): void {
    if (this.map) {
      this.map.remove();
    }
  }
}