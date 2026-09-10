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

  // --- OBTENER TODOS LOS VEHÍCULOS ---
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
        status: data.estado || 'disponible',
        activo: data.activo,
      });
    });

    return vehicles;
  }

  // --- CREAR VEHÍCULO Y REGISTRAR EN HISTORIAL ---
  async createVehicle(
    vehicleData: Omit<Vehicle, 'id'>,
    userContext?: { nombre: string; rol: string },
  ): Promise<string> {
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

    // 1. Guardar el nuevo camión
    const newVehicleRef = ref(this.database, `camiones/${customId}`);
    await set(newVehicleRef, {
      tipo: vehicleData.type,
      capacidad: vehicleData.weight,
      placa: vehicleData.plate,
      ruta: vehicleData.route || '',
      estado: vehicleData.status || 'disponible',
      activo: true,
    });

    // 2. Insertar entrada en el nodo 'operaciones'
    const now = new Date();
    const opsRef = ref(this.database, 'operaciones');
    const newOpRef = push(opsRef);

    await set(newOpRef, {
      id: newOpRef.key,
      accion: 'crear',
      modulo: 'Vehículos',
      detalle: `Registró la unidad ${customId} con placa ${vehicleData.plate}.`,
      entidadId: customId,
      fechaFormateada: now.toLocaleString('es-ES'),
      timestamp: now.getTime(),
      usuarioNombre: userContext?.nombre || 'Usuario del Sistema',
      usuarioRol: userContext?.rol || 'admin',
    });

    return customId;
  }

  // --- ACTUALIZAR VEHÍCULO ---
  async updateVehicle(vehicle: Vehicle): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const vehicleRef = ref(this.database, `camiones/${vehicle.id}`);
    await set(vehicleRef, {
      tipo: vehicle.type,
      capacidad: vehicle.weight,
      placa: vehicle.plate,
      ruta: vehicle.route || '',
      estado: vehicle.status || 'disponible',
      activo: vehicle.activo ?? true,
    });
  }

  // --- DESACTIVAR (ELIMINAR LÓGICAMENTE) Y REGISTRAR EN HISTORIAL ---
  async deactivateVehicle(
    vehicle: Vehicle,
    userContext?: { nombre: string; rol: string },
  ): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    // 1. Marcar el camión como inactivo (borrado lógico)
    const vehicleRef = ref(this.database, `camiones/${vehicle.id}`);
    await set(vehicleRef, {
      tipo: vehicle.type,
      capacidad: vehicle.weight,
      placa: vehicle.plate,
      ruta: vehicle.route || '',
      estado: vehicle.status || 'disponible',
      activo: false,
    });

    // 2. Insertar entrada de eliminación en 'operaciones'
    const now = new Date();
    const opsRef = ref(this.database, 'operaciones');
    const newOpRef = push(opsRef);

    await set(newOpRef, {
      id: newOpRef.key,
      accion: 'eliminar',
      modulo: 'Vehículos',
      detalle: `Desactivó el vehículo ${vehicle.id} (${vehicle.plate}).`,
      entidadId: vehicle.id,
      fechaFormateada: now.toLocaleString('es-ES'),
      timestamp: now.getTime(),
      usuarioNombre: userContext?.nombre || 'Usuario del Sistema',
      usuarioRol: userContext?.rol || 'admin',
    });
  }
}
