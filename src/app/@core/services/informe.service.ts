import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Database, ref, child, get, push, set, listVal, objectVal, update } from '@angular/fire/database';
import { Observable, combineLatest, from, map } from 'rxjs';
import { ViajeItem } from '../../pages/journey-report/components/update-journey-report/update-journey-report';

export interface DatosViajeInput {
  tonRecogidas: number | null;
  direccionLlenado: string;
  observaciones: string;
}

export interface InformeReporte {
  id?: string;

  // Datos normalizados para la tabla
  nombreUsuario?: string;
  uidUsuario?: string;

  camionId?: string;
  rutaId?: string;

  firmado?: boolean;
  creadoEn?: string | number;

  // Campos originales de la base de datos
  usuario?: string;
  camion?: string;
  ruta?: string;

  // Puede contener viaje1, viaje2, viaje3...
  [key: string]: any;
}

@Injectable({
  providedIn: 'root',
})
export class InformeService {
  private auth = inject(Auth);
  private db = inject(Database);

  /**
   * Obtiene los informes en tiempo real.
   *
   * No modifica la estructura de los informes.
   *
   * Soporta tanto la estructura antigua:
   *
   * {
   *   usuario: 'UID',
   *   camion: 'VEH-001',
   *   ruta: 'NombreRuta7',
   *   viaje1: {...}
   * }
   *
   * como la estructura nueva:
   *
   * {
   *   uidUsuario: 'UID',
   *   camionId: 'VEH-001',
   *   rutaId: '...',
   *   viaje1: {...}
   * }
   */
  getInformes(): Observable<[any[], Record<string, any>]> {
    const informesRef = ref(this.db, 'informe_de_viaje');
    const usuariosRef = ref(this.db, 'usuarios');

    return combineLatest([
      listVal<any>(informesRef, { keyField: 'id' }),
      objectVal<Record<string, any>>(usuariosRef),
    ]);
  }

  // Ver un solo informe
  verInforme() {}

  /**
   * Crea un nuevo informe.
   *
   * El informe comienza con viaje1.
   *
   * Los viajes posteriores NO deben crearse aquí;
   * cuando se implemente la edición se agregarán
   * viaje2, viaje3, etc. al mismo informe.
   */
  crearInforme(datosFormulario: DatosViajeInput, numeroViaje: number = 1): Observable<void> {
    return from(this.ejecutarCreacionInforme(datosFormulario, numeroViaje));
  }

  private async ejecutarCreacionInforme(
    datos: DatosViajeInput,
    numeroViaje: number,
  ): Promise<void> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      throw new Error('No hay un usuario autenticado activo.');
    }

    const uidUsuario = currentUser.uid;
    const dbRef = ref(this.db);

    /*
     * Obtener usuario actual
     */
    const userSnap = await get(child(dbRef, `usuarios/${uidUsuario}`));

    if (!userSnap.exists()) {
      throw new Error('El perfil del usuario no existe en la base de datos.');
    }

    const userData = userSnap.val();

    /*
     * Obtener camión del usuario
     */
    const camionId = userData?.camionId || '';

    if (!camionId) {
      throw new Error('El usuario no tiene un camión asignado.');
    }

    /*
     * Obtener información del camión
     */
    const camionSnap = await get(child(dbRef, `camiones/${camionId}`));

    const camionData = camionSnap.exists() ? camionSnap.val() : {};

    const rutaId = camionData?.ruta || '';

    /*
     * Mantenemos los campos antiguos
     * porque ya existen informes con esta estructura.
     *
     * También guardamos los nombres nuevos para
     * facilitar futuras migraciones.
     */
    const payload = {
      // Estructura existente
      usuario: uidUsuario,
      camion: camionId,
      ruta: rutaId,

      // Campos normalizados
      uidUsuario,
      camionId,
      rutaId,

      // Estado inicial
      firmado: false,

      // Fecha de creación
      creadoEn: new Date().toISOString(),

      /*
       * Primer viaje.
       *
       * Si numeroViaje es 1:
       * viaje1
       *
       * Si en el futuro se utiliza este método
       * con otro número:
       * viaje2, viaje3...
       */
      [`viaje${numeroViaje}`]: {
        descripcion: datos.observaciones || '',

        direccionDeLlenado: datos.direccionLlenado || '',

        tonRecogidas: datos.tonRecogidas ?? 0,
      },
    };

    /*
     * Crear un nuevo informe
     */
    const informesRef = ref(this.db, 'informe_de_viaje');

    const nuevoInformeRef = push(informesRef);

    await set(nuevoInformeRef, payload);
  }
  async updateViajeIndividual(
    viajeId: string,
    data: { descripcion: string; direccionDelLlenado: string; tonRecogidas: number },
  ): Promise<void> {
    const viajeRef = ref(this.db, `viajes/${viajeId}`);

    // Actualización atómica de un solo nodo sin referencias circulares
    await update(viajeRef, {
      descripcion: data.descripcion,
      direccionDelLlenado: data.direccionDelLlenado,
      tonRecogidas: data.tonRecogidas,
    });
  }

  async updateInforme(
    informeId: string,
    camion: string,
    ruta: string,
    viajes: ViajeItem[],
  ): Promise<void> {
    const updatesPayload: Record<string, any> = {};

    // 1. Campos simples del informe
    updatesPayload[`informe_de_viaje/${informeId}/camion`] = String(camion || '');
    updatesPayload[`informe_de_viaje/${informeId}/ruta`] = String(ruta || '');

    // 2. Extraer ÚNICAMENTE las propiedades primitivas de cada viaje (evita referencias circulares)
    viajes.forEach((viaje) => {
      if (viaje.id) {
        updatesPayload[`viajes/${viaje.id}/descripcion`] = String(viaje.descripcion || '');
        updatesPayload[`viajes/${viaje.id}/direccionDelLlenado`] = String(
          viaje.direccionDelLlenado || '',
        );
        updatesPayload[`viajes/${viaje.id}/tonRecogidas`] = Number(viaje.tonRecogidas) || 0;
        updatesPayload[`viajes/${viaje.id}/informeId`] = String(informeId);
      }
    });

    // 3. Ejecutar la actualización con un objeto totalmente plano
    await update(ref(this.db), updatesPayload);
  }
}
