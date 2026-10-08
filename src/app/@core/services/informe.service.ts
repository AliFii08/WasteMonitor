import { Injectable, inject } from '@angular/core';
import { Database as NgDatabase, listVal, objectVal } from '@angular/fire/database';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, get, push, update, remove, onValue } from 'firebase/database';
import { Observable, combineLatest, from } from 'rxjs';
import { ViajeItem } from '../../pages/journey-report/components/update-journey-report/update-journey-report';

export interface DatosViajeInput {
  tonRecogidas: number | null;
  direccionLlenado: string;
  observaciones: string;
}

export interface InformeReporte {
  id?: string;
  nombreUsuario?: string;
  idUsuario?: string;
  camionId?: string;
  rutaId?: string;
  firmado?: boolean;
  creadoEn?: string | number;
  usuario?: string;
  camion?: string;
  ruta?: string;
  [key: string]: any;
}

export interface ResumenRutaAdministrativo {
  rutaId: string;
  ruta: string;
  sector: string;
  supervisor: string;
  camion: string;
  toneladas: number;
  viajes: number;
}

export interface ResumenJornadaAdministrativa {
  fecha: string;
  toneladasTotales: number;
  viajesTotales: number;
  rutas: ResumenRutaAdministrativo[];
  rutaLider: ResumenRutaAdministrativo | null;
  sectorLiderMensual: { sector: string; toneladas: number } | null;
}

export interface InformeAdministrativo {
  id: string;
  creadoPor?: string;
  fecha: string;
  toneladasTotales?: number;
  viajesTotales?: number;
  informesFinalizados?: number;
  rutaLider?: string;
  sectorLider?: string;
  observaciones?: string;
  creadoEl?: string;
  finalizado?: boolean;
  finalizadoEl?: string;
}

export interface ResumenInformesFinalizados {
  toneladasTotales: number;
  viajesTotales: number;
  informesFinalizados: number;
  informesSinFinalizar?: number;
}

@Injectable({
  providedIn: 'root',
})
export class InformeService {
  private ngDb = inject(NgDatabase);

  private get db() {
    return getDatabase();
  }

  getInformes(): Observable<[any[], Record<string, any>]> {
    const informesRef = ref(this.db, 'informe_de_viaje');
    const usuariosRef = ref(this.db, 'usuarios');

    return combineLatest([
      listVal<any>(informesRef as any, { keyField: 'id' }),
      objectVal<Record<string, any>>(usuariosRef as any),
    ]) as Observable<[any[], Record<string, any>]>;
  }

  crearInforme(datosFormulario: DatosViajeInput, numeroViaje: number = 1): Observable<string> {
    console.log('🚀 [crearInforme] Iniciando creación de la cabecera...');

    return from(this.ejecutarCreacionInforme(datosFormulario, numeroViaje));
  }

  async obtenerAsignacionActual(uidUsuario: string): Promise<{ camion: string; ruta: string }> {
    const userSnap = await get(ref(this.db, `usuarios/${uidUsuario}`));
    const userData = userSnap.exists() ? userSnap.val() : {};
    const camion = String(userData?.camionId || '');

    if (!camion) return { camion: '', ruta: '' };

    const camionSnap = await get(ref(this.db, `camiones/${camion}`));
    const camionData = camionSnap.exists() ? camionSnap.val() : {};

    return { camion, ruta: String(camionData?.ruta || '') };
  }

  async obtenerResumenJornadaAdministrativa(
    fecha = new Date(),
  ): Promise<ResumenJornadaAdministrativa> {
    const [informesSnap, viajesSnap, rutasSnap, usuariosSnap, camionesSnap] = await Promise.all([
      get(ref(this.db, 'informe_de_viaje')),
      get(ref(this.db, 'viajes')),
      get(ref(this.db, 'routes')),
      get(ref(this.db, 'usuarios')),
      get(ref(this.db, 'camiones')),
    ]);

    const informes = informesSnap.exists() ? informesSnap.val() : {};
    const viajes = viajesSnap.exists() ? viajesSnap.val() : {};
    const rutas = rutasSnap.exists() ? rutasSnap.val() : {};
    const usuarios = usuariosSnap.exists() ? usuariosSnap.val() : {};
    const camiones = camionesSnap.exists() ? camionesSnap.val() : {};
    const fechaClave = this.obtenerFechaClave(fecha);
    const mesClave = fechaClave.slice(0, 7);
    const resumenPorRuta = new Map<string, ResumenRutaAdministrativo>();
    const sectoresDelMes = new Map<string, number>();
    let toneladasTotales = 0;
    let viajesTotales = 0;

    Object.entries<any>(informes).forEach(([informeId, informe]) => {
      if (!informe || informe.activo === false) return;

      const fechaInforme = this.obtenerFechaClave(informe.creadoEl);
      if (!fechaInforme || !fechaInforme.startsWith(mesClave)) return;

      const rutaId = String(informe.rutaId || informe.ruta || 'sin-ruta');
      const rutaData = rutas[rutaId] || {};
      const sector = this.obtenerSectorRuta(rutaData);
      const informeViajes = Object.values<any>(viajes).filter(
        (viaje) => String(viaje?.informeId || '') === String(informeId),
      );
      const toneladas = informeViajes.reduce(
        (total, viaje) => total + (Number(viaje?.tonRecogidas) || 0),
        0,
      );

      sectoresDelMes.set(sector, (sectoresDelMes.get(sector) || 0) + toneladas);

      if (fechaInforme !== fechaClave) return;

      const usuario = usuarios[informe.usuario] || {};
      const camionId = String(informe.camionId || informe.camion || 'Sin camión');
      const camionData = camiones[camionId] || {};
      const supervisor =
        `${usuario.name || usuario.nombre || ''} ${usuario.lastName || usuario.apellido || ''}`.trim() ||
        'Sin supervisor';
      const actual = resumenPorRuta.get(rutaId) || {
        rutaId,
        ruta: String(rutaData.nombreRuta || rutaId),
        sector,
        supervisor,
        camion: String(camionData.placa || camionId),
        toneladas: 0,
        viajes: 0,
      };

      actual.toneladas += toneladas;
      actual.viajes += informeViajes.length;
      resumenPorRuta.set(rutaId, actual);
      toneladasTotales += toneladas;
      viajesTotales += informeViajes.length;
    });

    const rutasResumen = [...resumenPorRuta.values()].sort((a, b) => b.toneladas - a.toneladas);
    const sectorLiderMensual =
      [...sectoresDelMes.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([sector, toneladas]) => ({ sector, toneladas }))[0] || null;

    return {
      fecha: fechaClave,
      toneladasTotales,
      viajesTotales,
      rutas: rutasResumen,
      rutaLider: rutasResumen[0] || null,
      sectorLiderMensual,
    };
  }

  async crearInformeAdministrativo(
    fecha: string,
    observaciones: string,
    resumen: ResumenInformesFinalizados,
  ): Promise<void> {
    const currentUser = getAuth().currentUser;
    if (!currentUser) throw new Error('Se requiere una sesión para crear el informe.');
    const userSnapshot = await get(ref(this.db, `usuarios/${currentUser.uid}`));
    const role = userSnapshot.val()?.rol;
    if (role !== 'admin' && role !== 'supervisor') {
      throw new Error('El usuario no tiene permiso para crear informes administrativos.');
    }
    const informeRef = push(ref(this.db, 'informe_administrativo'));
    await update(informeRef, {
      creadoPor: currentUser.uid,
      fecha,
      toneladasTotales: resumen.toneladasTotales,
      viajesTotales: resumen.viajesTotales,
      informesFinalizados: resumen.informesFinalizados,
      observaciones: observaciones.trim(),
      creadoEl: new Date().toISOString(),
      finalizado: false,
    });
  }

  async obtenerResumenInformesFinalizados(fecha: string): Promise<ResumenInformesFinalizados> {
    const [informesSnap, viajesSnap] = await Promise.all([
      get(ref(this.db, 'informe_de_viaje')),
      get(ref(this.db, 'viajes')),
    ]);
    const informes = informesSnap.exists() ? informesSnap.val() : {};
    const viajes = viajesSnap.exists() ? viajesSnap.val() : {};
    const viajesPorInforme = new Map<string, any[]>();

    Object.values<any>(viajes).forEach((viaje) => {
      const informeId = String(viaje?.informeId || '');
      if (!informeId) return;
      const relacionados = viajesPorInforme.get(informeId) || [];
      relacionados.push(viaje);
      viajesPorInforme.set(informeId, relacionados);
    });

    const resumen: ResumenInformesFinalizados = {
      toneladasTotales: 0,
      viajesTotales: 0,
      informesFinalizados: 0,
      informesSinFinalizar: 0,
    };

    Object.entries<any>(informes).forEach(([informeId, informe]) => {
      if (!informe || informe.activo === false) return;

      const fechaJornada = this.obtenerFechaClave(informe.creadoEl || informe.finalizadoEl);
      if (fechaJornada !== fecha) return;

      const estado = String(informe?.estado || '').toLowerCase();
      const estaFinalizado =
        estado === 'finalizado' || estado === 'firmado' || informe?.estado === true;
      if (!estaFinalizado) {
        resumen.informesSinFinalizar = (resumen.informesSinFinalizar || 0) + 1;
        return;
      }

      const viajesDelInforme = viajesPorInforme.get(informeId) || [];
      resumen.informesFinalizados += 1;
      resumen.viajesTotales += viajesDelInforme.length;
      resumen.toneladasTotales += viajesDelInforme.reduce(
        (total, viaje) => total + (Number(viaje?.tonRecogidas) || 0),
        0,
      );
    });

    return resumen;
  }

  escucharResumenInformesFinalizados(
    fecha: string,
    alActualizar: (resumen: ResumenInformesFinalizados | null, error?: unknown) => void,
  ): () => void {
    let activo = true;
    let solicitudActual = 0;
    const actualizar = (): void => {
      const solicitud = ++solicitudActual;
      void this.obtenerResumenInformesFinalizados(fecha)
        .then((resumen) => {
          if (activo && solicitud === solicitudActual) alActualizar(resumen);
        })
        .catch((error: unknown) => {
          if (activo && solicitud === solicitudActual) alActualizar(null, error);
        });
    };
    const detenerInformes = onValue(ref(this.db, 'informe_de_viaje'), actualizar);
    const detenerViajes = onValue(ref(this.db, 'viajes'), actualizar);

    return () => {
      activo = false;
      detenerInformes();
      detenerViajes();
    };
  }

  async obtenerInformesAdministrativos(): Promise<InformeAdministrativo[]> {
    const snapshot = await get(ref(this.db, 'informe_administrativo'));
    if (!snapshot.exists()) return [];

    return Object.entries<any>(snapshot.val())
      .map(([id, informe]) => ({ id, ...informe }))
      .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  }

  async actualizarInformeAdministrativo(
    id: string,
    data: {
      fecha: string;
      observaciones: string;
      toneladasTotales: number;
      viajesTotales: number;
      informesFinalizados: number;
    },
  ): Promise<void> {
    const informeRef = ref(this.db, `informe_administrativo/${id}`);
    const snapshot = await get(informeRef);
    if (!snapshot.exists() || snapshot.val()?.finalizado === true) {
      throw new Error('El informe ya está finalizado y no se puede modificar.');
    }
    await this.verificarPermisoInformeAdministrativo(snapshot.val());
    await update(informeRef, {
      fecha: data.fecha,
      toneladasTotales: data.toneladasTotales,
      viajesTotales: data.viajesTotales,
      informesFinalizados: data.informesFinalizados,
      observaciones: data.observaciones.trim(),
    });
  }

  async finalizarInformeAdministrativo(
    id: string,
    data: {
      fecha: string;
      observaciones: string;
      toneladasTotales: number;
      viajesTotales: number;
      informesFinalizados: number;
    },
  ): Promise<void> {
    const informeRef = ref(this.db, `informe_administrativo/${id}`);
    const snapshot = await get(informeRef);
    if (!snapshot.exists() || snapshot.val()?.finalizado === true) {
      throw new Error('El informe ya está finalizado y no se puede modificar.');
    }
    await this.verificarPermisoInformeAdministrativo(snapshot.val());
    await update(informeRef, {
      ...data,
      observaciones: data.observaciones.trim(),
      finalizado: true,
      finalizadoEl: new Date().toISOString(),
    });
  }

  async eliminarInformeAdministrativo(id: string): Promise<void> {
    const informeRef = ref(this.db, `informe_administrativo/${id}`);
    const snapshot = await get(informeRef);
    if (!snapshot.exists()) throw new Error('No se encontró el informe.');
    const isAdmin = await this.verificarPermisoInformeAdministrativo(snapshot.val());
    if (snapshot.val()?.finalizado === true && !isAdmin) {
      throw new Error('El informe ya está finalizado y no se puede eliminar.');
    }
    await remove(informeRef);
  }

  private async verificarPermisoInformeAdministrativo(informe: any): Promise<boolean> {
    const currentUser = getAuth().currentUser;
    if (!currentUser) throw new Error('Se requiere una sesión para modificar el informe.');
    const userSnapshot = await get(ref(this.db, `usuarios/${currentUser.uid}`));
    const role = userSnapshot.val()?.rol;
    const isAdmin = role === 'admin';
    if (!isAdmin && (role !== 'supervisor' || informe?.creadoPor !== currentUser.uid)) {
      throw new Error('Solo el creador puede modificar o eliminar este informe.');
    }
    return isAdmin;
  }

  private obtenerFechaClave(fecha: unknown): string {
    if (!fecha) return '';
    const date = new Date(fecha as string | number | Date);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private obtenerSectorRuta(rutaData: Record<string, any>): string {
    const puntos = Object.entries(rutaData)
      .filter(([key, value]) => /^p\d+$/.test(key) && value?.address)
      .sort(([a], [b]) => Number(a.slice(1)) - Number(b.slice(1)));
    return String(puntos[0]?.[1]?.address || rutaData['sector'] || 'Sector no especificado');
  }

  private async ejecutarCreacionInforme(
    datos: DatosViajeInput,
    numeroViaje: number,
  ): Promise<string> {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      console.log('👤 Usuario activo Auth:', currentUser?.uid);

      if (!currentUser) {
        throw new Error('No hay un usuario autenticado activo.');
      }

      const uidUsuario = currentUser.uid;

      // 1. Obtener la asignación vigente del usuario
      console.log('🔍 Consultando usuario en /usuarios/', uidUsuario);

      const asignacion = await this.obtenerAsignacionActual(uidUsuario);

      if (!asignacion.camion || !asignacion.ruta) {
        throw new Error('No puedes iniciar una jornada sin un vehículo y una ruta asignados.');
      }

      // 2. Crear payload
      const payloadCabecera = JSON.parse(
        JSON.stringify({
          activo: true,
          camion: asignacion.camion,
          creadoEl: new Date().toISOString(),
          estado: '',
          ruta: asignacion.ruta,
          usuario: String(uidUsuario),
        }),
      );

      console.log('💾 Guardando únicamente cabecera en /informe_de_viaje...', payloadCabecera);

      // 3. Crear informe en Firebase
      const resPush = await push(ref(this.db, 'informe_de_viaje'), payloadCabecera);

      console.log('✅ Cabecera del informe creada con éxito. ID:', resPush.key);

      // 4. Verificar que Firebase devolvió el ID
      if (!resPush.key) {
        throw new Error('Firebase no devolvió el ID del informe creado.');
      }

      // 5. DEVOLVER EL ID
      return resPush.key;
    } catch (error) {
      console.error('❌ Error guardando la cabecera:', error);

      throw error;
    }
  }

  async updateViajeIndividual(
    viajeId: string,
    data: { descripcion: string; direccionDelLlenado: string; tonRecogidas: number },
  ): Promise<void> {
    const viajeRef = ref(this.db, `viajes/${viajeId}`);
    const viajeSnapshot = await get(viajeRef);
    const informeId = String(viajeSnapshot.val()?.informeId || '');
    if (!viajeSnapshot.exists() || !informeId) {
      throw new Error('No se encontró el informe asociado al viaje.');
    }
    await this.verificarInformeEditable(informeId);

    await update(viajeRef, {
      descripcion: String(data.descripcion || ''),
      direccionDelLlenado: String(data.direccionDelLlenado || ''),
      tonRecogidas: Number(data.tonRecogidas) || 0,
    });
  }

  async updateInforme(
    informeId: string,
    camion: string,
    ruta: string,
    viajes: ViajeItem[],
  ): Promise<void> {
    await this.verificarInformeEditable(informeId);
    const updatesPayload: Record<string, any> = {};

    updatesPayload[`informe_de_viaje/${informeId}/camion`] = String(camion || '');
    updatesPayload[`informe_de_viaje/${informeId}/ruta`] = String(ruta || '');

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

    await update(ref(this.db), updatesPayload);
  }

  async finalizarInforme(informeId: string, usuarioId: string): Promise<void> {
    if (getAuth().currentUser?.uid !== usuarioId) {
      throw new Error('Solo el creador del informe puede finalizarlo.');
    }
    await this.verificarInformeEditable(informeId);
    await update(ref(this.db, `informe_de_viaje/${informeId}`), {
      estado: 'finalizado',
      finalizadoEl: new Date().toISOString(),
      finalizadoPor: usuarioId,
    });
  }

  private async verificarInformeEditable(informeId: string): Promise<void> {
    const currentUserId = getAuth().currentUser?.uid;
    const snapshot = await get(ref(this.db, `informe_de_viaje/${informeId}`));
    const informe = snapshot.val();
    const creadorId =
      informe?.uidUsuario ||
      informe?.idUsuario ||
      informe?.usuario ||
      informe?.usuarioId ||
      informe?.userId;
    const estado = String(informe?.estado ?? '').toLowerCase();

    if (!snapshot.exists() || !currentUserId || creadorId !== currentUserId) {
      throw new Error('Solo el creador del informe puede modificarlo.');
    }
    if (estado === 'finalizado' || estado === 'firmado' || informe?.estado === true) {
      throw new Error('El informe ya está finalizado y no se puede modificar.');
    }
  }
}
