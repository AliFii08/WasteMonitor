import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import * as L from 'leaflet';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements AfterViewInit, OnDestroy {
  map!: L.Map;

  // Coordenadas iniciales (Maracaibo)
  private initialCoords: [number, number] = [10.6447, -71.6106];

  ngAfterViewInit(): void {
    this.initMap();
  }

  private initMap(): void {
    // Inicializar el mapa en el div con id='map'
    this.map = L.map('map', {
      zoomControl: false // Opcional: ocultar si quieres un look más limpio
    }).setView(this.initialCoords, 13);

    // Cargar capas de OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(this.map);

    // Agregar control de zoom en una posición diferente si lo deseas
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove(); // Limpieza al salir de la ruta
    }
  }
}
