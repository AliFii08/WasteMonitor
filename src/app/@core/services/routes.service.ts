import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Database, ref, get, set, push, remove, update } from '@angular/fire/database';
import { firstValueFrom } from 'rxjs';

export interface RoutePoint {
  x: number;
  y: number;
  address?: string;
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

  async getRoutes(): Promise<RouteData[]> {
    const routesRef = ref(this.database, 'routes');
    const snapshot = await get(routesRef);

    if (!snapshot.exists()) return [];

    const data = snapshot.val();
    return Object.keys(data).map((key) => ({
      id: key,
      ...data[key],
    }));
  }

  async getOSRMRouteCoordinates(points: RoutePoint[]): Promise<[number, number][]> {
    if (points.length < 2) return [];

    const coordsString = points.map((p) => `${p.y},${p.x}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordsString}?geometries=geojson&overview=full`;

    const response = await firstValueFrom(this.http.get<any>(url));
    if (response?.routes?.[0]?.geometry?.coordinates) {
      return response.routes[0].geometry.coordinates.map((coords: number[]) => [
        coords[1],
        coords[0],
      ]);
    }

    return [];
  }

  async saveRoute(points: RoutePoint[], totalRoutesCount: number): Promise<string> {
    const pointsObject: Record<string, RoutePoint> = {};

    for (let index = 0; index < points.length; index++) {
      const pt = points[index];
      const address = pt.address || (await this.getPlaceName(pt.x, pt.y));
      pointsObject[`p${index + 1}`] = { ...pt, address };
    }

    const routeKey = `route${totalRoutesCount + 1}`;
    const newRouteRef = ref(this.database, `routes/${routeKey}`);

    await set(newRouteRef, pointsObject);
    return routeKey;
  }

  async addPointToRoute(routeId: string, point: RoutePoint): Promise<void> {
    const address = await this.getPlaceName(point.x, point.y);
    const routeRef = ref(this.database, `routes/${routeId}`);
    const newPointRef = push(routeRef);
    await set(newPointRef, { ...point, address });
  }

  // Actualizar un punto en Firebase
  async updateRoutePoint(routeId: string, pointKey: string, point: RoutePoint): Promise<void> {
    const pointRef = ref(this.database, `routes/${routeId}/${pointKey}`);
    await set(pointRef, point);
  }

  // Eliminar un punto en Firebase
  async deleteRoutePoint(routeId: string, pointKey: string): Promise<void> {
    const pointRef = ref(this.database, `routes/${routeId}/${pointKey}`);
    await remove(pointRef);
  }

  async getPlaceName(lat: number, lng: number): Promise<string> {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
    try {
      const response = await firstValueFrom(this.http.get<any>(url));
      if (response?.address) {
        const addr = response.address;
        const road =
          addr.road || addr.pedestrian || addr.suburb || addr.neighbourhood || addr.amenity;
        const city = addr.city || addr.town || addr.county;
        return road ? `${road}${city ? ', ' + city : ''}` : response.display_name;
      }
    } catch (error) {
      console.error('Error en geocodificación inversa:', error);
    }
    return 'Ubicación desconocida';
  }
}
