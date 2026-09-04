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

    const points: DisplayPoint[] = [];
    let count = 1;

    Object.keys(route).forEach((key) => {
      if (key !== 'id' && key !== 'nombreRuta') {
        const val = route[key];
        if (typeof val === 'object' && val !== null && 'x' in val && 'y' in val) {
          const pt = val as RoutePoint;
          points.push({
            index: count++,
            key,
            lat: pt.x,
            lng: pt.y,
            address: pt.address || 'Sin dirección',
          });
        }
      }
    });

    return points;
  });

  ngAfterViewInit(): void {
    this.mapaComponent.initMap((lat, lng) => this.handleMapClick(lat, lng));
    this.loadRoutes();
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

    if (this.selectedRouteId()) {
      this.addPointToCurrentRoute(lat, lng);
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

  createLocalRoute(): void {
    this.isBuildingLocalRoute.set(true);
    this.localRoutePoints.set([]);
    this.awaitingLocalPoint.set(false);
    this.selectedRouteId.set('');

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

  async saveLocalRouteToFirebase(): Promise<void> {
    const points = this.localRoutePoints();
    if (!this.isBuildingLocalRoute() || points.length === 0) return;

    try {
      const routeKey = await this.routesService.saveRoute(points, this.availableRoutes().length);
      this.isBuildingLocalRoute.set(false);
      this.awaitingLocalPoint.set(false);
      this.localRoutePoints.set([]);

      await this.loadRoutes();
      this.selectedRouteId.set(routeKey);
      await this.refreshSelectedRouteView(routeKey);
    } catch (error) {
      console.error('Error al guardar:', error);
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
