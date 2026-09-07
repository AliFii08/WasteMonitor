import {
  Component,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RoutesService, RouteData, RoutePoint } from '../../@core/services/routes.service';
import { MapaComponent, PointWithLabel } from './mapa.component';

export interface DisplayPoint {
  index: number;
  key: string;
  lat: number;
  lng: number;
  address?: string; // Propiedad para el nombre del lugar
}

@Component({
  selector: 'app-route-drivers',
  standalone: true,
  imports: [CommonModule, MapaComponent],
  templateUrl: './route-drivers.html',
  styleUrl: './route-drivers.scss',
})
export class RouteDrivers implements AfterViewInit, OnDestroy {
  @ViewChild(MapaComponent) mapaComponent!: MapaComponent;

  private routesService = inject(RoutesService);

  availableRoutes = signal<RouteData[]>([]);
  selectedRouteId = signal<string>('');

  isBuildingLocalRoute = signal<boolean>(false);
  localRoutePoints = signal<RoutePoint[]>([]);
  awaitingLocalPoint = signal<boolean>(false);
  isSelectingFromMap = signal<boolean>(false);
  editingPointKey = signal<string | null>(null);
  editLat = signal<string>('');
  editLng = signal<string>('');

  startEditing(point: DisplayPoint): void {
    this.editingPointKey.set(point.key);
    this.editLat.set(point.lat.toString());
    this.editLng.set(point.lng.toString());
    this.isSelectingFromMap.set(false);

    // Colocar marcador de previsualización en el punto actual
    this.mapaComponent.showTemporaryMarker(point.lat, point.lng);
  }

  cancelEditing(): void {
    this.editingPointKey.set(null);
    this.editLat.set('');
    this.editLng.set('');
    this.isSelectingFromMap.set(false);
    this.mapaComponent.clearTemporaryMarker();
  }

  // Calcula dinámicamente los puntos asignándoles un índice numérico secuencial (1, 2, 3...)
  currentPoints = computed<DisplayPoint[]>(() => {
    if (this.isBuildingLocalRoute()) {
      return this.localRoutePoints().map((pt, idx) => ({
        index: idx + 1,
        key: `p${idx + 1}`,
        lat: pt.x,
        lng: pt.y,
        address: pt.address || 'Guardar para obtener dirección',
      }));
    }

    const routeId = this.selectedRouteId();
    if (!routeId) return [];

    const route = this.availableRoutes().find((r) => r.id === routeId);
    if (!route) return [];

    // Filtrar y ordenar numéricamente según la clave (p1, p2, p3...)
    const pointKeys = Object.keys(route)
      .filter((key) => key !== 'id' && key !== 'nombreRuta')
      .sort((a, b) => {
        const numA = parseInt(a.replace('p', ''), 10);
        const numB = parseInt(b.replace('p', ''), 10);
        return numA - numB;
      });

    return pointKeys.map((key, idx) => {
      const val = route[key] as RoutePoint;
      return {
        index: idx + 1,
        key,
        lat: val.x,
        lng: val.y,
        address: val.address || 'Sin dirección',
      };
    });
  });

  ngAfterViewInit(): void {
    this.mapaComponent.initMap((lat, lng) => this.handleMapClick(lat, lng));
    this.loadRoutes();
  }

  enableMapSelection(): void {
    this.isSelectingFromMap.set(true);
  }

  async loadRoutes(): Promise<void> {
    try {
      const routes = await this.routesService.getRoutes();
      this.availableRoutes.set(routes);
      if (this.selectedRouteId()) {
        await this.refreshSelectedRouteView(this.selectedRouteId());
      }
    } catch (error) {
      console.error('Error al cargar las rutas:', error);
    }
  }

  private handleMapClick(lat: number, lng: number): void {
    if (this.isBuildingLocalRoute()) {
      if (!this.awaitingLocalPoint()) return;
      this.addLocalPoint(lat, lng);
      return;
    }

    if (this.selectedRouteId() && this.isSelectingFromMap()) {
      if (this.editingPointKey()) {
        // Si estamos editando, actualiza los campos del punto en edición
        this.editLat.set(lat.toString());
        this.editLng.set(lng.toString());
      } else {
        // Si estamos agregando uno nuevo
        this.newPointLat.set(lat.toString());
        this.newPointLng.set(lng.toString());
      }
      this.mapaComponent.showTemporaryMarker(lat, lng);
    }
  }

  // Guardar los cambios del punto editado
  async saveEditedPoint(point: DisplayPoint): Promise<void> {
    const routeId = this.selectedRouteId();
    const lat = parseFloat(this.editLat());
    const lng = parseFloat(this.editLng());

    if (isNaN(lat) || isNaN(lng)) return;

    try {
      if (this.isBuildingLocalRoute()) {
        const updated = [...this.localRoutePoints()];
        const idx = point.index - 1;
        updated[idx] = { ...updated[idx], x: lat, y: lng };
        this.localRoutePoints.set(updated);
        await this.updateLocalMapMarkers(updated);
      } else if (routeId) {
        const address = await this.routesService.getPlaceName(lat, lng);
        await this.routesService.updateRoutePoint(routeId, point.key, {
          x: lat,
          y: lng,
          address,
        });
        await this.loadRoutes();
        await this.refreshSelectedRouteView(routeId);
      }

      this.cancelEditing();
    } catch (error) {
      console.error('Error al actualizar el punto:', error);
    }
  }

  async onRouteSelect(event: Event): Promise<void> {
    const routeId = (event.target as HTMLSelectElement).value;
    this.selectedRouteId.set(routeId);

    this.isBuildingLocalRoute.set(false);
    this.localRoutePoints.set([]);
    this.awaitingLocalPoint.set(false);

    await this.refreshSelectedRouteView(routeId);
  }

  private async refreshSelectedRouteView(routeId: string): Promise<void> {
    const route = this.availableRoutes().find((r) => r.id === routeId);
    if (route) {
      const displayPts = this.currentPoints();
      const pointsToDraw: RoutePoint[] = displayPts.map((p) => ({ x: p.lat, y: p.lng }));
      const mapLabels: PointWithLabel[] = displayPts.map((p) => ({
        x: p.lat,
        y: p.lng,
        label: p.index,
      }));

      this.mapaComponent.renderNumberedMarkers(mapLabels);

      const coordinates = await this.routesService.getOSRMRouteCoordinates(pointsToDraw);
      this.mapaComponent.drawRoute(coordinates);
    } else {
      this.mapaComponent.clearAll();
    }
  }

  // Agrega la nueva señal en la clase RouteDrivers:
  routeNameInput = signal<string>('');

  // Método para limpiar campos al iniciar la creación local:
  createLocalRoute(): void {
    this.isBuildingLocalRoute.set(true);
    this.localRoutePoints.set([]);
    this.awaitingLocalPoint.set(false);
    this.selectedRouteId.set('');
    this.routeNameInput.set(''); // Limpia el nombre anterior
    this.mapaComponent.clearAll();
  }

  prepareAddLocalPoint(): void {
    if (!this.isBuildingLocalRoute()) return;
    this.awaitingLocalPoint.set(true);
  }

  private async addLocalPoint(lat: number, lng: number): Promise<void> {
    const address = await this.routesService.getPlaceName(lat, lng);
    const updatedPoints = [...this.localRoutePoints(), { x: lat, y: lng, address }];
    this.localRoutePoints.set(updatedPoints);
    this.awaitingLocalPoint.set(false);

    const mapLabels: PointWithLabel[] = updatedPoints.map((pt, idx) => ({
      x: pt.x,
      y: pt.y,
      label: idx + 1,
    }));

    this.mapaComponent.renderNumberedMarkers(mapLabels);

    if (updatedPoints.length >= 2) {
      const coordinates = await this.routesService.getOSRMRouteCoordinates(updatedPoints);
      this.mapaComponent.drawRoute(coordinates);
    }
  }

  async editPoint(point: DisplayPoint, index: number): Promise<void> {
    const newLatStr = prompt('Nueva latitud (X):', point.lat.toString());
    if (newLatStr === null) return;

    const newLngStr = prompt('Nueva longitud (Y):', point.lng.toString());
    if (newLngStr === null) return;

    const newLat = parseFloat(newLatStr);
    const newLng = parseFloat(newLngStr);

    if (isNaN(newLat) || isNaN(newLng)) return;

    if (this.isBuildingLocalRoute()) {
      const updated = [...this.localRoutePoints()];
      updated[index] = { x: newLat, y: newLng };
      this.localRoutePoints.set(updated);
      this.updateLocalMapMarkers(updated);
    } else if (this.selectedRouteId()) {
      await this.routesService.updateRoutePoint(this.selectedRouteId(), point.key, {
        x: newLat,
        y: newLng,
      });
      await this.loadRoutes();
    }
  }

  async deletePoint(point: DisplayPoint, index: number): Promise<void> {
    if (!confirm(`¿Eliminar el punto #${point.index}?`)) return;

    if (this.isBuildingLocalRoute()) {
      const updated = this.localRoutePoints().filter((_, i) => i !== index);
      this.localRoutePoints.set(updated);
      this.updateLocalMapMarkers(updated);
    } else if (this.selectedRouteId()) {
      await this.routesService.deleteRoutePoint(this.selectedRouteId(), point.key);
      await this.loadRoutes();
    }
  }

  private async updateLocalMapMarkers(points: RoutePoint[]): Promise<void> {
    const mapLabels: PointWithLabel[] = points.map((pt, idx) => ({
      x: pt.x,
      y: pt.y,
      label: idx + 1,
    }));

    this.mapaComponent.renderNumberedMarkers(mapLabels);

    if (points.length >= 2) {
      const coords = await this.routesService.getOSRMRouteCoordinates(points);
      this.mapaComponent.drawRoute(coords);
    } else {
      this.mapaComponent.clearRoute();
    }
  }

  // Actualiza saveLocalRouteToFirebase:
  async saveLocalRouteToFirebase(): Promise<void> {
    const points = this.localRoutePoints();
    const name = this.routeNameInput().trim();

    if (!this.isBuildingLocalRoute() || points.length === 0) return;

    if (!name) {
      alert('Por favor ingrese un nombre para la ruta.');
      return;
    }

    try {
      const routeKey = await this.routesService.saveRoute(points, name);

      this.isBuildingLocalRoute.set(false);
      this.awaitingLocalPoint.set(false);
      this.localRoutePoints.set([]);
      this.routeNameInput.set('');

      await this.loadRoutes();
      this.selectedRouteId.set(routeKey);
      await this.refreshSelectedRouteView(routeKey);
    } catch (error) {
      console.error('Error al guardar la ruta:', error);
    }
  }

  private async addPointToCurrentRoute(lat: number, lng: number): Promise<void> {
    const routeId = this.selectedRouteId();
    if (!routeId) return;

    try {
      await this.routesService.addPointToRoute(routeId, { x: lat, y: lng });
      await this.loadRoutes();
    } catch (error) {
      console.error('Error al agregar punto:', error);
    }
  }

  async resolvePointAddresses(): Promise<void> {
    const points = this.currentPoints();
    for (const pt of points) {
      if (!pt.address) {
        pt.address = await this.routesService.getPlaceName(pt.lat, pt.lng);
      }
    }
  }

  // Agrega estas señales dentro de la clase RouteDrivers:
  newPointLat = signal<string>('');
  newPointLng = signal<string>('');

  // Método para agregar el punto manualmente desde la fila de la tabla
  async addPointFromTable(): Promise<void> {
    const routeId = this.selectedRouteId();
    const lat = parseFloat(this.newPointLat());
    const lng = parseFloat(this.newPointLng());

    if (!routeId || isNaN(lat) || isNaN(lng)) return;

    try {
      await this.routesService.addPointToRoute(routeId, { x: lat, y: lng });

      // Limpiar estados y marcador temporal
      this.newPointLat.set('');
      this.newPointLng.set('');
      this.isSelectingFromMap.set(false);
      this.mapaComponent.clearTemporaryMarker();

      await this.loadRoutes();
      await this.refreshSelectedRouteView(routeId);
    } catch (error) {
      console.error('Error al agregar punto:', error);
    }
  }

  trackByRouteId(_index: number, route: RouteData): string {
    return route.id;
  }

  getSelectedRouteName(): string {
    const selectedId = this.selectedRouteId();
    if (!selectedId) return '';

    const route = this.availableRoutes().find((r) => r.id === selectedId);
    return route?.nombreRuta || selectedId;
  }

  resetView(): void {
    this.mapaComponent.resetView();
  }

  trackByPointKey(_index: number, point: DisplayPoint): string {
    return point.key;
  }

  ngOnDestroy(): void {
    if (this.mapaComponent) {
      this.mapaComponent.destroyMap();
    }
  }
}