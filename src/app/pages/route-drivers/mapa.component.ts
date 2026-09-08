import { Component, OnDestroy } from '@angular/core';
import * as L from 'leaflet';
import { RoutePoint } from '../../@core/services/routes.service';

export interface PointWithLabel {
  x: number;
  y: number;
  label: string | number;
}

@Component({
  selector: 'app-mapa',
  standalone: true,
  template: `<div
    id="map"
    style="height: 400px; width: 100%; border-radius: 12px; z-index: 1;"
  ></div>`,
})
export class MapaComponent implements OnDestroy {
  private map!: L.Map;
  private routeLayer?: L.Polyline;
  private tempMarker?: L.Marker;
  private markersGroup: L.LayerGroup = L.layerGroup();

  initMap(onMapClick: (lat: number, lng: number) => void): void {
    if (this.map) return;

    this.map = L.map('map').setView([10.667, -71.622], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);

    this.markersGroup.addTo(this.map);

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    });
  }

  // --- Manejo de Iconos y Marcadores ---

  private createCustomIcon(className: string, content: string): L.DivIcon {
    return L.divIcon({
      className,
      html: `<div class="marker-pin"><span>${content}</span></div>`,
      iconSize: [30, 42],
      iconAnchor: [15, 42],
    });
  }

  renderNumberedMarkers(points: PointWithLabel[]): void {
    this.clearMarkers();

    points.forEach((pt) => {
      const icon = this.createCustomIcon('custom-numbered-marker', String(pt.label));
      const marker = L.marker([pt.x, pt.y], { icon });
      this.markersGroup.addLayer(marker);
    });
  }

  renderLocalMarkers(points: RoutePoint[]): void {
    this.clearMarkers();

    points.forEach((p, index) => {
      const icon = this.createCustomIcon('custom-local-marker', String(index + 1));
      const marker = L.marker([p.x, p.y], { icon });
      this.markersGroup.addLayer(marker);
    });

    if (points.length === 1 && this.map) {
      this.map.flyTo([points[0].x, points[0].y], 15);
    }
  }

  showTemporaryMarker(lat: number, lng: number): void {
    this.clearTemporaryMarker();

    const icon = this.createCustomIcon('custom-temp-marker', '+');
    this.tempMarker = L.marker([lat, lng], { icon }).addTo(this.map);
  }

  clearTemporaryMarker(): void {
    if (this.tempMarker) {
      this.map.removeLayer(this.tempMarker);
      this.tempMarker = undefined;
    }
  }

  clearMarkers(): void {
    this.markersGroup.clearLayers();
  }

  // --- Manejo de Rutas y Capas ---

  drawRoute(coordinates: [number, number][]): void {
    this.clearRoute();

    if (!coordinates || coordinates.length === 0) return;

    this.routeLayer = L.polyline(coordinates, {
      color: '#68a357',
      weight: 6,
      opacity: 0.9,
    }).addTo(this.map);

    this.map.fitBounds(this.routeLayer.getBounds(), { padding: [50, 50] });
  }

  clearRoute(): void {
    if (this.routeLayer) {
      this.map.removeLayer(this.routeLayer);
      this.routeLayer = undefined;
    }
  }

  clearAll(): void {
    this.clearRoute();
    this.clearMarkers();
    this.clearTemporaryMarker();
  }

  resetView(): void {
    if (this.routeLayer) {
      this.map.fitBounds(this.routeLayer.getBounds(), { padding: [50, 50] });
    } else if (this.map) {
      this.map.flyTo([10.667, -71.622], 14);
    }
  }

  // --- Ciclo de Vida ---

  destroyMap(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  ngOnDestroy(): void {
    this.destroyMap();
  }
}
