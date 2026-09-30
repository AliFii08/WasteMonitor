import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Database, ref, update } from '@angular/fire/database';
import { environment } from '../../../environments/environment';

export interface ConductorTabla {
  uid: string;
  driverId: string;
  nombreCompleto: string;
  cargo: 'supervisor' | 'crew' | 'mecanico' | 'conductor' | string;
  camionAsignado: string;
  rutaAsignada: string;
}

@Injectable({
  providedIn: 'root',
})
export class ConductoresService {
  private database = inject(Database);
  private platformId = inject(PLATFORM_ID);

  private readonly BASE_URL = environment.firebaseConfig.databaseURL;

  async getConductores(): Promise<ConductorTabla[]> {
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

      const conductores: ConductorTabla[] = [];

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
          
          // Buscar la ruta en el objeto del vehículo (ej. camiones['VEH-001'].ruta)
          let rutaEncontrada = 'Sin ruta';
          if (idCamion && camionesData[idCamion] && camionesData[idCamion].ruta) {
            rutaEncontrada = camionesData[idCamion].ruta;
          }

          conductores.push({
            uid,
            driverId,
            nombreCompleto: `${user.name || ''} ${user.lastName || ''}`.trim() || 'Sin Nombre',
            cargo: user.rol,
            camionAsignado: idCamion || 'Sin asignar',
            rutaAsignada: rutaEncontrada,
          });
        }
      }

      return conductores;
    } catch (error) {
      console.error('Error al obtener la lista de conductores mediante fetch:', error);
      return [];
    }
  }
}