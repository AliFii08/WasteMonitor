import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Database, ref, get } from '@angular/fire/database';

export interface EstadisticasDashboard {
  empleados: {
    total: number;
    supervisores: number;
    crew: number;
    conductores: number;
    empleadosSinRolEspecifico: number;
  };
  vehiculos: {
    total: number;
    disponibles: number;
    noDisponibles: number;
    porTipo: Record<string, number>;
    porCapacidadTons: Record<string, number>;
  };
  operaciones: {
    totalRutas: number;
    camionesConConductor: number;
    camionesSinConductor: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private database = inject(Database);
  private platformId = inject(PLATFORM_ID);

  async obtenerEstadisticas(): Promise<EstadisticasDashboard | null> {
    if (!isPlatformBrowser(this.platformId)) return null;

    try {
      const [usersSnap, camionesSnap, routesSnap] = await Promise.all([
        get(ref(this.database, 'usuarios')),
        get(ref(this.database, 'camiones')),
        get(ref(this.database, 'routes')),
      ]);

      const usersData = usersSnap.exists() ? usersSnap.val() : {};
      const camionesData = camionesSnap.exists() ? camionesSnap.val() : {};
      const routesData = routesSnap.exists() ? routesSnap.val() : {};

      // 1. Estadísticas de Empleados
      let supervisores = 0;
      let crew = 0;
      let conductores = 0;
      let otrosEmpleados = 0;

      Object.values<any>(usersData).forEach((u) => {
        if (!u) return;
        const rol = (u.rol || '').toLowerCase().trim();
        if (rol === 'supervisor') supervisores++;
        else if (rol === 'crew') crew++;
        else if (rol === 'conductor') conductores++;
        else if (rol === 'empleado') otrosEmpleados++;
      });

      // 2. Estadísticas de Vehículos
      let disponibles = 0;
      let noDisponibles = 0;
      let camionesConConductor = 0;
      let camionesSinConductor = 0;
      const porTipo: Record<string, number> = {};
      const porCapacidadTons: Record<string, number> = {};

      const listaCamiones = Object.values<any>(camionesData);

      listaCamiones.forEach((c) => {
        if (!c) return;

        if (c.disponible) disponibles++;
        else noDisponibles++;

        if (c.conductorId) camionesConConductor++;
        else camionesSinConductor++;

        // Conteo por tipo de vehículo
        const tipo = c.tipo || 'Sin Tipo';
        porTipo[tipo] = (porTipo[tipo] || 0) + 1;

        // Conteo por capacidad (toneladas/volumen)
        const capKey = c.capacidad ? `${c.capacidad} Ton` : 'No especificada';
        porCapacidadTons[capKey] = (porCapacidadTons[capKey] || 0) + 1;
      });

      return {
        empleados: {
          total: supervisores + crew + conductores + otrosEmpleados,
          supervisores,
          crew,
          conductores,
          empleadosSinRolEspecifico: otrosEmpleados,
        },
        vehiculos: {
          total: listaCamiones.length,
          disponibles,
          noDisponibles,
          porTipo,
          porCapacidadTons,
        },
        operaciones: {
          totalRutas: Object.keys(routesData).length,
          camionesConConductor,
          camionesSinConductor,
        },
      };
    } catch (error) {
      console.error('Error al generar las estadísticas del dashboard:', error);
      return null;
    }
  }
}