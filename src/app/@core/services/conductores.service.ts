import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Database, ref, get, update } from '@angular/fire/database';

export interface ConductorTabla {
  uid: string;
  driverId: string;
  nombreCompleto: string;
  cargo: 'supervisor' | 'crew' | string;
  camionAsignado: string;
  rutaAsignada: string;
}

@Injectable({
  providedIn: 'root',
})
export class ConductoresService {
  private database = inject(Database);
  private platformId = inject(PLATFORM_ID);

  async getConductores(): Promise<ConductorTabla[]> {
    if (!isPlatformBrowser(this.platformId)) return [];

    try {
      const usersSnap = await get(ref(this.database, 'usuarios'));
      if (!usersSnap.exists()) return [];

      const usersData = usersSnap.val();

      // 1. Calcular el mayor número correlativo DRV-XXX guardado globalmente
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

      // 2. Filtrar únicamente miembros con rol supervisor o crew
      for (const [uid, user] of Object.entries<any>(usersData)) {
        if (user && (user.rol === 'supervisor' || user.rol === 'crew')) {
          let driverId = user.driverId;

          // Asignar y guardar driverId fijo si aún no tiene uno
          if (!driverId) {
            maxNum++;
            driverId = `DRV-${String(maxNum).padStart(3, '0')}`;
            await update(ref(this.database, `usuarios/${uid}`), { driverId });
          }

          conductores.push({
            uid,
            driverId,
            nombreCompleto: `${user.name || ''} ${user.lastName || ''}`.trim() || 'Sin Nombre',
            cargo: user.rol,
            camionAsignado: user.camionId || 'Sin asignar',
            rutaAsignada: user.rutaAsignada || 'Sin ruta',
          });
        }
      }

      return conductores;
    } catch (error) {
      console.error('Error al obtener la lista de conductores:', error);
      return [];
    }
  }
}