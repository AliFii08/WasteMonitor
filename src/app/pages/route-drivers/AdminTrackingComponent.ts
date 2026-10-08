import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Database, ref, onValue } from '@angular/fire/database';
import * as L from 'leaflet';
import { LocationPayload } from '../../@core/services/location.service';

@Component({
  selector: 'app-admin-tracking',
  standalone: true,
  imports: [CommonModule],
  template: `<div id="admin-map" style="height: 100vh; width: 100%;"></div>`,
})
export class AdminTrackingComponent implements OnInit, OnDestroy {
  private readonly db = inject(Database);
  private map!: L.Map;
  private markers = new Map<string, L.Marker>();

  ngOnInit(): void {
    this.initMap();
    this.escucharUbicacionesEnVivo();
  }

  private initMap(): void {
    this.map = L.map('admin-map').setView([10.6427, -71.6125], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(this.map);
  }

  private escucharUbicacionesEnVivo(): void {
    const trackingRef = ref(this.db, 'tracking');

    // Mantiene un listener reactivo en tiempo real vía WebSockets
    onValue(trackingRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      Object.keys(data).forEach((userId) => {
        const currentData: LocationPayload = data[userId]?.current;

        // Si el supervisor tiene la sesión activa y enviando coordenadas
        if (currentData && currentData.active && currentData.latitude && currentData.longitude) {
          this.actualizarMarcador(userId, currentData);
        } else {
          this.removerMarcador(userId);
        }
      });
    });
  }

  private actualizarMarcador(userId: string, data: LocationPayload): void {
    const latLng: L.LatLngExpression = [data.latitude, data.longitude];

    if (this.markers.has(userId)) {
      // Mueve suavemente el marcador existente
      this.markers.get(userId)!.setLatLng(latLng);
    } else {
      // Crea un nuevo marcador para el supervisor
      const marker = L.marker(latLng)
        .bindPopup(`<b>Supervisor ID:</b> ${userId}<br><b>Informe:</b> ${data.informeId}`)
        .addTo(this.map);
      this.markers.set(userId, marker);
    }
  }

  private removerMarcador(userId: string): void {
    if (this.markers.has(userId)) {
      this.markers.get(userId)!.remove();
      this.markers.delete(userId);
    }
  }

  ngOnDestroy(): void {
    if (this.map) this.map.remove();
  }
}
