import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Database, ref, update } from '@angular/fire/database';
import { environment } from '../../../environments/environment';

export interface TripulacionTabla {
  uid: string;
  driverId: string;
  nombreCompleto: string;
  cargo: 'supervisor' | 'crew' | 'mecanico' | 'conductor' | string;
  encargado: string;
  camionAsignado: string;
  rutaAsignada: string;
}

@Injectable({
  providedIn: 'root',
})
export class TripulacionService {
  private database = inject(Database);
  private platformId = inject(PLATFORM_ID);

  private readonly BASE_URL = environment.firebaseConfig.databaseURL;

  async getTripulacion(): Promise<TripulacionTabla[]> {
    if (!isPlatformBrowser(this.platformId)) return [];

    try {
      // 1. Obtener usuarios y camiones simultáneamente vía Fetch REST
      const [usersRes, camionesRes] = await Promise.all([
        fetch(`${this.BASE_URL}/usuarios.json`),
        fetch(`${this.BASE_URL}/camiones.json`),
      ]);

      if (!usersRes.ok) throw new Error(`HTTP error usuarios: ${usersRes.status}`);
      if (!camionesRes.ok) throw new Error(`HTTP error camiones: ${camionesRes.status}`);

      const usersData = await usersRes.json();
      const camionesData = (await camionesRes.json()) || {};

      if (!usersData) return [];

      // 2. Calcular el mayor número correlativo DRV-XXX guardado globalmente
      let maxNum = 0;
      Object.values<any>(usersData).forEach((u) => {
        if (u && u.driverId) {
          const match = /^DRV-(\d+)$/i.exec(u.driverId.trim());
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
          }
        }
      });

      const supervisoresPorCamion = new Map<string, string>();
      Object.values<any>(usersData).forEach((user) => {
        if (user?.rol === 'supervisor' && user.camionId) {
          const nombre = `${user.name || ''} ${user.lastName || ''}`.trim();
          if (nombre) supervisoresPorCamion.set(user.camionId, nombre);
        }
      });

      const tripulacion: TripulacionTabla[] = [];

      // 3. Mapear conductores obteniendo la ruta desde el nodo camiones
      for (const [uid, user] of Object.entries<any>(usersData)) {
        if (
          user &&
          (user.rol === 'supervisor' ||
            user.rol === 'crew' ||
            user.rol === 'mecanico' ||
            user.rol === 'conductor')
        ) {
          let driverId = user.driverId;

          // Guardar correlativo en Firebase si no posee uno
          if (!driverId) {
            maxNum++;
            driverId = `DRV-${String(maxNum).padStart(3, '0')}`;
            await update(ref(this.database, `usuarios/${uid}`), { driverId });
          }

          const idCamion = user.camionId || '';
          const nombreCompleto = `${user.name || ''} ${user.lastName || ''}`.trim() || 'Sin Nombre';

          // Buscar la ruta en el objeto del vehículo (ej. camiones['VEH-001'].ruta)
          let rutaEncontrada = 'Sin ruta';
          if (idCamion && camionesData[idCamion] && camionesData[idCamion].ruta) {
            rutaEncontrada = camionesData[idCamion].ruta;
          }

          tripulacion.push({
            uid,
            driverId,
            nombreCompleto,
            cargo: user.rol,
            encargado: supervisoresPorCamion.get(idCamion) || 'Sin supervisor',
            camionAsignado: idCamion || 'Sin asignar',
            rutaAsignada: rutaEncontrada,
          });
        }
      }

      return tripulacion;
    } catch (error) {
      console.error('Error al obtener la lista de conductores mediante fetch:', error);
      return [];
    }
  }
}
