import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Database, ref, onValue, get } from '@angular/fire/database';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface OperacionHistorial {
  id: string;
  usuario: string;
  rol: string;
  accion: 'crear' | 'actualizar' | 'eliminar';
  modulo: 'Usuarios' | 'Vehículos' | 'Rutas' | 'Informes' | 'Quejas';
  detalle: string;
  fechaHora: string;
  timestamp?: number;
}

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

  private readonly API_OPERACIONES = `${environment.firebaseConfig.databaseURL}/operaciones.json`;

  private operacionesSubject = new BehaviorSubject<OperacionHistorial[]>([]);
  public operaciones$: Observable<OperacionHistorial[]> = this.operacionesSubject.asObservable();

  /**
   * Registra una acción ejecutada por un usuario en el nodo 'operaciones' vía REST (Fetch)
   */
  async registrarOperacion(operacion: Omit<OperacionHistorial, 'id'>): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      const timestamp = operacion.timestamp || Date.now();

      const payload = {
        usuarioNombre: operacion.usuario,
        usuarioRol: operacion.rol,
        accion: operacion.accion,
        modulo: operacion.modulo,
        detalle: operacion.detalle,
        fechaFormateada: operacion.fechaHora,
        timestamp: timestamp,
      };

      // 1. Guardar mediante POST para que Firebase autogenere la clave
      const response = await fetch(this.API_OPERACIONES, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const resData = await response.json();
      const generatedId = resData.name; // Firebase devuelve { "name": "-P2E..." }

      // 2. Asignar el id recién creado en el nodo para mantener consistencia
      if (generatedId) {
        const updateUrl = `${environment.firebaseConfig.databaseURL}/operaciones/${generatedId}.json`;
        await fetch(updateUrl, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: generatedId }),
        });
      }

      console.log('✅ Operación registrada en historial exitosamente con ID:', generatedId);
    } catch (error) {
      console.error('❌ Error al registrar la operación:', error);
    }
  }

  /**
   * Escucha el nodo 'operaciones' en tiempo real (las lecturas no generan problemas de stack size)
   */
  obtenerOperacionesEnTiempoReal(): Observable<OperacionHistorial[]> {
    if (isPlatformBrowser(this.platformId)) {
      const opsRef = ref(this.database, 'operaciones');

      onValue(
        opsRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            const lista: OperacionHistorial[] = Object.entries<any>(data)
              .map(([key, item]) => ({
                id: item.id || key,
                usuario: item.usuarioNombre || 'Usuario Desconocido',
                rol: item.usuarioRol || 'Sin Rol',
                accion: item.accion || 'actualizar',
                modulo: item.modulo || 'Sistema',
                detalle: item.detalle || '',
                fechaHora: item.fechaFormateada || '',
                timestamp: item.timestamp || 0,
              }))
              .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

            this.operacionesSubject.next(lista);
          } else {
            this.operacionesSubject.next([]);
          }
        },
        (error) => console.error('Error al escuchar operaciones:', error),
      );
    }

    return this.operaciones$;
  }

  /**
   * Obtiene las estadísticas generales del dashboard
   */
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

        const tipo = c.tipo || 'Sin Tipo';
        porTipo[tipo] = (porTipo[tipo] || 0) + 1;

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