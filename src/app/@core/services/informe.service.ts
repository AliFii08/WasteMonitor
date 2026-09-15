import { Injectable, inject } from '@angular/core';
import { Database, ref, objectVal } from '@angular/fire/database';
import { Observable, combineLatest, map } from 'rxjs';

export interface InformeReporte {
  id: string;
  uidUsuario?: string;
  nombreUsuario?: string;
  camionId?: string;
  rutaId?: string;
  nombreRuta?: string;
  tonRecogidas?: number;
  firmado?: boolean;
  idUsuarioFirma?: string;
  nombreUsuarioFirma?: string;
  creadoEn?: string;
  activo?: boolean;
  descripcion?: string;
}

@Injectable({
  providedIn: 'root'
})
export class InformeService {
  private db = inject(Database);

  getInformesConDetalles(): Observable<InformeReporte[]> {
    const informesRef = ref(this.db, 'informe_de_viaje');
    const usuariosRef = ref(this.db, 'usuarios');
    const rutasRef = ref(this.db, 'routes');

    return combineLatest([
      objectVal<any>(informesRef),
      objectVal<any>(usuariosRef),
      objectVal<any>(rutasRef)
    ]).pipe(
      map(([informes, usuarios, rutas]) => {
        if (!informes) return [];

        const listaUsuarios = usuarios || {};
        const listaRutas = rutas || {};

        return Object.keys(informes).map(key => {
          const item = informes[key];

          // 1. Obtener datos del Creador (uidUsuario)
          const creador = item.uidUsuario ? listaUsuarios[item.uidUsuario] : null;
          const nombreUsuario = creador
            ? `${creador.name || creador.nombreUsuario || ''} ${creador.lastName || ''}`.trim()
            : (item.uidUsuario || 'N/A');

          // 2. Obtener datos de quien Firma (idUsuarioFirma)
          const firmante = item.idUsuarioFirma ? listaUsuarios[item.idUsuarioFirma] : null;
          const nombreUsuarioFirma = firmante
            ? `${firmante.name || firmante.nombreUsuario || ''} ${firmante.lastName || ''}`.trim()
            : (item.idUsuarioFirma ? item.idUsuarioFirma : 'Sin firma');

          // 3. Obtener nombre de la Ruta (rutaId)
          const ruta = item.rutaId ? listaRutas[item.rutaId] : null;
          const nombreRuta = ruta ? (ruta.nombreRuta || item.rutaId) : 'Sin Ruta';

          return {
            id: key,
            ...item,
            nombreUsuario,
            nombreUsuarioFirma,
            nombreRuta
          };
        });
      })
    );
  }
}