import { Injectable, inject } from '@angular/core';
import { Database as NgDatabase, listVal, objectVal } from '@angular/fire/database';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, get, push, update } from 'firebase/database';
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
  uidUsuario?: string;
  camionId?: string;
  rutaId?: string;
  firmado?: boolean;
  creadoEn?: string | number;
  usuario?: string;
  camion?: string;
  ruta?: string;
  [key: string]: any;
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

  crearInforme(datosFormulario: DatosViajeInput, numeroViaje: number = 1): Observable<void> {
    console.log('🚀 [crearInforme] Iniciando creación de la cabecera...');
    return from(this.ejecutarCreacionInforme(datosFormulario, numeroViaje));
  }

  private async ejecutarCreacionInforme(
    datos: DatosViajeInput,
    numeroViaje: number,
  ): Promise<void> {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      console.log('👤 Usuario activo Auth:', currentUser?.uid);

      if (!currentUser) {
        throw new Error('No hay un usuario autenticado activo.');
      }

      const uidUsuario = currentUser.uid;

      // 1. Obtener datos del usuario
      console.log('🔍 Consultando usuario en /usuarios/', uidUsuario);
      const userSnap = await get(ref(this.db, `usuarios/${uidUsuario}`));
      const userData = userSnap.exists() ? userSnap.val() : {};
      const camionId = String(userData?.camionId || '');

      // 2. Obtener datos del camión
      let rutaId = '';
      if (camionId) {
        console.log('🔍 Consultando camión en /camiones/', camionId);
        const camionSnap = await get(ref(this.db, `camiones/${camionId}`));
        const camionData = camionSnap.exists() ? camionSnap.val() : {};
        rutaId = String(camionData?.ruta || '');
      }

      // 3. Crear payload limpio (objeto plano sin referencias)
      const payloadCabecera = JSON.parse(
        JSON.stringify({
          activo: true,
          camion: String(camionId),
          creadoEl: new Date().toISOString(),
          estado: '',
          ruta: String(rutaId),
          usuario: String(uidUsuario),
        }),
      );

      console.log('💾 Guardando únicamente cabecera en /informe_de_viaje...', payloadCabecera);

      // Inserción directa en la colección
      const resPush = await push(ref(this.db, 'informe_de_viaje'), payloadCabecera);

      console.log('✅ Cabecera del informe creada con éxito. ID:', resPush.key);
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
}
