import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Database, ref, get, set, remove, push } from '@angular/fire/database';
import { Vehicle } from '../interfaces/vehicle.model';

@Injectable({
  providedIn: 'root',
})
export class VehiculoService {
  private database = inject(Database);
  private platformId = inject(PLATFORM_ID);

  /**
   * Obtiene todos los camiones registrados en Realtime Database.
   */
  async getVehicles(): Promise<Vehicle[]> {
    if (!isPlatformBrowser(this.platformId)) return [];

    const dbRef = ref(this.database, 'camiones');
    const snapshot = await get(dbRef);

    if (!snapshot.exists()) return [];

    const vehicles: Vehicle[] = [];
    snapshot.forEach((child) => {
      const data = child.val();
      vehicles.push({
        id: child.key || '',
        type: data.tipo || '',
        weight: data.capacidad || 0,
        route: data.ruta || '',
        plate: data.placa || '',
        status: data.estado || 'disponible', // <--- LEER ESTADO DESDE FIREBASE
        activo: data.activo
      });
    });

    return vehicles;
  }

  /**
   * Crea un nuevo camión utilizando un ID autoincrementable con formato VEH-001.
   */
  async createVehicle(vehicleData: Omit<Vehicle, 'id'>): Promise<string> {
    if (!isPlatformBrowser(this.platformId)) throw new Error('platform-not-supported');

    const camionesRef = ref(this.database, 'camiones');
    const snapshot = await get(camionesRef);

    let maxNum = 0;
    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        const key = child.key || '';
        const match = /^VEH-(\d+)$/i.exec(key.trim());
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      });
    }

    const nextNum = maxNum + 1;
    const customId = `VEH-${String(nextNum).padStart(3, '0')}`;

    const newVehicleRef = ref(this.database, `camiones/${customId}`);
    await set(newVehicleRef, {
      tipo: vehicleData.type,
      capacidad: vehicleData.weight,
      placa: vehicleData.plate,
      ruta: vehicleData.route || '',
      estado: vehicleData.status || 'disponible', // <--- GUARDAR ESTADO
      activo: true,
    });

    return customId;
  }

  async updateVehicle(vehicle: Vehicle): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const vehicleRef = ref(this.database, `camiones/${vehicle.id}`);
    await set(vehicleRef, {
      tipo: vehicle.type,
      capacidad: vehicle.weight,
      placa: vehicle.plate,
      ruta: vehicle.route || '',
      estado: vehicle.status || 'disponible', // <--- ACTUALIZAR ESTADO
      activo: vehicle.activo ?? true,
    });
  }

  /**
   * Elimina un camión según su ID en Realtime Database.
   */
  async deleteVehicle(id: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const vehicleRef = ref(this.database, `camiones/${id}`);
    await remove(vehicleRef);
  }
}