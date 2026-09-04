import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Database, ref, get, set, push } from '@angular/fire/database';
import { firstValueFrom } from 'rxjs';

export interface RoutePoint {
    x: number;
    y: number;
  }
  
  export interface RouteData {
    id: string;
    nombreRuta?: string;
    [key: string]: RoutePoint | string | undefined;
  }

@Injectable({
  providedIn: 'root',
})
export class RoutesService {
  private database = inject(Database);
  private http = inject(HttpClient);

  // Obtener todas las rutas almacenadas en Firebase
  async getRoutes(): Promise<RouteData[]> {
    const routesRef = ref(this.database, 'routes');
    const snapshot = await get(routesRef);

    if (!snapshot.exists()) {
      return [];
    }

    const data = snapshot.val();
    return Object.keys(data).map((key) => ({
      id: key,
      ...data[key],
    }));
  }

  // Trazar el recorrido real usando la API pública de OSRM
  async getOSRMRouteCoordinates(points: RoutePoint[]): Promise<[number, number][]> {
    if (points.length < 2) return [];

    const coordsString = points.map((p) => `${p.y},${p.x}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordsString}?geometries=geojson&overview=full`;

    const response = await firstValueFrom(this.http.get<any>(url));
    if (response?.routes?.[0]?.geometry?.coordinates) {
      // OSRM devuelve [lng, lat], Leaflet necesita [lat, lng]
      return response.routes[0].geometry.coordinates.map((coords: number[]) => [coords[1], coords[0]]);
    }

    return [];
  }

  // Guardar una nueva ruta creada localmente
  async saveRoute(points: RoutePoint[], totalRoutesCount: number): Promise<string> {
    const pointsObject: Record<string, RoutePoint> = {};
    points.forEach((point, index) => {
      pointsObject[`p${index + 1}`] = point;
    });

    const routeKey = `route${totalRoutesCount + 1}`;
    const newRouteRef = ref(this.database, `routes/${routeKey}`);

    await set(newRouteRef, pointsObject);
    return routeKey;
  }

  // Añadir un punto individual a una ruta ya existente
  async addPointToRoute(routeId: string, point: RoutePoint): Promise<void> {
    const routeRef = ref(this.database, `routes/${routeId}`);
    const newPointRef = push(routeRef);
    await set(newPointRef, point);
  }
}