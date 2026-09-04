import { Component, AfterViewInit, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RoutesService, RouteData, RoutePoint } from '../../@core/services/routes.service';
import { MapaComponent } from './mapa.component';

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

  ngAfterViewInit(): void {
    this.mapaComponent.initMap((lat, lng) => this.handleMapClick(lat, lng));
    this.loadRoutes();
  }

  async loadRoutes(): Promise<void> {
    try {
      const routes = await this.routesService.getRoutes();
      this.availableRoutes.set(routes);
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

    const route = this.availableRoutes().find((r) => r.id === routeId);
    if (route) {
      const points = Object.values(route).filter((val): val is RoutePoint => typeof val === 'object' && val !== null && 'x' in val);
      const coordinates = await this.routesService.getOSRMRouteCoordinates(points);
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
    alert('Ruta local creada. Haz clic en "Agregar punto" y luego selecciona un punto en el mapa.');
  }

  prepareAddLocalPoint(): void {
    if (!this.isBuildingLocalRoute()) {
      alert('Crea una ruta local primero con "Crear ruta local"');
      return;
    }
    this.awaitingLocalPoint.set(true);
    alert('Selecciona un punto en el mapa para añadirlo a la ruta local.');
  }

  private async addLocalPoint(lat: number, lng: number): Promise<void> {
    const updatedPoints = [...this.localRoutePoints(), { x: lat, y: lng }];
    this.localRoutePoints.set(updatedPoints);
    this.awaitingLocalPoint.set(false);

    this.mapaComponent.renderLocalMarkers(updatedPoints);

    if (updatedPoints.length >= 2) {
      const coordinates = await this.routesService.getOSRMRouteCoordinates(updatedPoints);
      this.mapaComponent.drawRoute(coordinates);
    }
  }

  async saveLocalRouteToFirebase(): Promise<void> {
    const points = this.localRoutePoints();
    if (!this.isBuildingLocalRoute() || points.length === 0) {
      alert('No hay ruta local para guardar.');
      return;
    }

    try {
      const routeKey = await this.routesService.saveRoute(points, this.availableRoutes().length);
      this.isBuildingLocalRoute.set(false);
      this.awaitingLocalPoint.set(false);
      this.localRoutePoints.set([]);
      
      await this.loadRoutes();
      alert(`Ruta guardada exitosamente con la clave: ${routeKey}`);
    } catch (error) {
      console.error('Error al guardar la ruta:', error);
      alert('Error al guardar la ruta.');
    }
  }

  private async addPointToCurrentRoute(lat: number, lng: number): Promise<void> {
    const routeId = this.selectedRouteId();
    if (!routeId) return;

    try {
      await this.routesService.addPointToRoute(routeId, { x: lat, y: lng });
      await this.loadRoutes();
      alert('Punto agregado a la ruta actual');
    } catch (error) {
      console.error('Error al agregar punto:', error);
    }
  }

  resetView(): void {
    this.mapaComponent.resetView();
  }

  trackByRouteId(_index: number, route: RouteData): string {
    return route.id;
  }

  ngOnDestroy(): void {
    if (this.mapaComponent) {
      this.mapaComponent.destroyMap();
    }
  }

  getSelectedRouteName(): string {
    const selectedId = this.selectedRouteId();
    if (!selectedId) return '';
  
    const route = this.availableRoutes().find((r) => r.id === selectedId);
    return route?.nombreRuta || selectedId;
  }
}