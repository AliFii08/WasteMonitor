import * as L from 'leaflet';

// Definimos la ruta del camión (esto vendría de tu backend)
const coordenadasRuta: [number, number][] = [
  [10.6695, -71.6133], // Punto A (Ej: Av. 4 Bella Vista)
  [10.672, -71.615], // Punto B
  [10.675, -71.618], // Punto C
];

export class MapaComponent {
  map!: L.Map;

  initMap() {
    // 1. Inicializar el mapa centrado en Maracaibo
    this.map = L.map('map').setView([10.6447, -71.6106], 13);

    // 2. Cargar los cuadros de OpenStreetMap (Gratis)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(this.map);

    // 3. Dibujar la ruta (Polyline)
    const polyline = L.polyline(coordenadasRuta, {
      color: 'green',
      weight: 5,
      opacity: 0.7,
      smoothFactor: 1,
    }).addTo(this.map);

    // Ajustar el zoom para que se vea toda la ruta
    this.map.fitBounds(polyline.getBounds());

    // 4. Agregar marcador del camión (Posición actual)
    const iconoCamion = L.icon({
      iconUrl: 'assets/camion-basura.png',
      iconSize: [38, 38],
    });
    L.marker([10.675, -71.618], { icon: iconoCamion }).addTo(this.map);
  }
}
