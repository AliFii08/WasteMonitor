import { Component, OnDestroy } from '@angular/core';
import * as L from 'leaflet';

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
  private routeLayer!: L.Polyline;
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

  private createNumberedIcon(label: string | number): L.DivIcon {
    return L.divIcon({
      className: 'custom-numbered-marker',
      html: `<div class="marker-pin"><span>${label}</span></div>`,
      iconSize: [30, 42],
      iconAnchor: [15, 42],
    });
  }

  renderNumberedMarkers(points: PointWithLabel[]): void {
    this.markersGroup.clearLayers();

    points.forEach((pt) => {
      const marker = L.marker([pt.x, pt.y], {
        icon: this.createNumberedIcon(pt.label),
      });
      this.markersGroup.addLayer(marker);
    });
  }

  drawRoute(coordinates: [number, number][]): void {
    if (this.routeLayer) {
      this.map.removeLayer(this.routeLayer);
    }

    if (coordinates.length === 0) return;

    this.routeLayer = L.polyline(coordinates, {
      color: '#2e7d32',
      weight: 5,
      opacity: 0.8,
    }).addTo(this.map);

    this.map.fitBounds(this.routeLayer.getBounds(), { padding: [50, 50] });
  }

  clearRoute(): void {
    if (this.routeLayer) {
      this.map.removeLayer(this.routeLayer);
    }
  }

  // Agrega esta propiedad a MapaComponent:
  private tempMarker?: L.Marker;

  // Método para colocar un marcador temporal de selección
  showTemporaryMarker(lat: number, lng: number): void {
    if (this.tempMarker) {
      this.map.removeLayer(this.tempMarker);
    }

    const tempIcon = L.divIcon({
      className: 'custom-temp-marker',
      html: `<div class="marker-pin-temp"><span>+</span></div>`,
      iconSize: [30, 42],
      iconAnchor: [15, 42],
    });

    this.tempMarker = L.marker([lat, lng], { icon: tempIcon }).addTo(this.map);
  }

  // Método para remover el marcador temporal tras guardar
  clearTemporaryMarker(): void {
    if (this.tempMarker) {
      this.map.removeLayer(this.tempMarker);
      this.tempMarker = undefined;
    }
  }

  clearAll(): void {
    this.clearRoute();
    this.markersGroup.clearLayers();
  }

  resetView(): void {
    if (this.routeLayer) {
      this.map.fitBounds(this.routeLayer.getBounds(), { padding: [50, 50] });
    }
  }

  ngOnDestroy(): void {
    this.destroyMap();
  }

  destroyMap(): void {
    if (this.map) {
      this.map.remove();
    }
  }
}
