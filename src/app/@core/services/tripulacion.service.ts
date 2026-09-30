import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface TripulacionTabla {
  uid: string;              // ID del grupo (ej: -P2nw1cIA8_dLQJDbMr2)
  driverId: string;         // ID legible / driverId del supervisor
  nombreCompleto: string;   // Nombre del supervisor o identificador
  encargado: string;        // Nombre completo del supervisor
  camionAsignado: string;   // ID del camión (ej: VEH-002)
  rutaAsignada: string;     // Nombre de la ruta (ej: route8)
  conductor: string;        // Nombre completo del conductor
  crewIntegrantes: string[];// Lista con los nombres de los miembros del crew
}

@Injectable({
  providedIn: 'root'
})
export class TripulacionService {
  private databaseUrl = environment.firebaseConfig.databaseURL;

  async getTripulacion(): Promise<TripulacionTabla[]> {
    try {
      const [resGrupos, resUsers, resCamiones, resRoutes] = await Promise.all([
        fetch(`${this.databaseUrl}/grupoTripulacion.json`),
        fetch(`${this.databaseUrl}/usuarios.json`),
        fetch(`${this.databaseUrl}/camiones.json`),
        fetch(`${this.databaseUrl}/routes.json`)
      ]);

      const gruposData = resGrupos.ok ? await resGrupos.json() : {};
      const usersData = resUsers.ok ? await resUsers.json() : {};
      const camionesData = resCamiones.ok ? await resCamiones.json() : {};
      const routesData = resRoutes.ok ? await resRoutes.json() : {};

      if (!gruposData) return [];

      const resultado: TripulacionTabla[] = [];

      Object.entries<any>(gruposData).forEach(([grupoKey, grupo]) => {
        if (!grupo || typeof grupo !== 'object') return;

        // Omitir grupos de prueba con IDs ficticios
        if (grupo.camion === 'idcamion' || grupo.supervisor === 'idusuario') return;

        // 1. Resolver Supervisor
        const supData = usersData?.[grupo.supervisor];
        const supervisorNombre = supData
          ? `${supData.name || supData.nombreUsuario || ''} ${supData.lastName || ''}`.trim()
          : 'Sin supervisor';

        // 2. Resolver Conductor
        const condData = usersData?.[grupo.conductor];
        const conductorNombre = condData
          ? `${condData.name || condData.nombreUsuario || ''} ${condData.lastName || ''}`.trim()
          : 'Sin conductor';

        // 3. Resolver Camión y Ruta
        const camionId = grupo.camion || 'Sin camión';
        const camionInfo = camionesData?.[camionId];
        const rutaKey = camionInfo?.ruta || 'Sin ruta';

        let rutaNombre = rutaKey;
        if (routesData && routesData[rutaKey]?.nombreRuta) {
          rutaNombre = routesData[rutaKey].nombreRuta;
        }

        // 4. Resolver Integrantes del Crew
        const crewNombres: string[] = [];
        if (grupo.crew && typeof grupo.crew === 'object') {
          Object.values<string>(grupo.crew).forEach((crewUid) => {
            const u = usersData?.[crewUid];
            if (u) {
              const n = `${u.name || u.nombreUsuario || ''} ${u.lastName || ''}`.trim();
              if (n) crewNombres.push(n);
            }
          });
        }

        resultado.push({
          uid: grupoKey,
          driverId: supData?.driverId || grupoKey.substring(0, 8),
          nombreCompleto: supervisorNombre,
          encargado: supervisorNombre,
          camionAsignado: camionId,
          rutaAsignada: rutaNombre,
          conductor: conductorNombre,
          crewIntegrantes: crewNombres,
        });
      });

      return resultado;
    } catch (error) {
      console.error('Error al obtener la lista de tripulación:', error);
      return [];
    }
  }
}