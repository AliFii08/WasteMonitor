import { Injectable, inject } from '@angular/core';
import { Database, ref, push, set, update, remove, get } from '@angular/fire/database';

export type TallerEstado = 'en_reparacion' | 'espera_repuesto' | 'listo';
export type TallerPrioridad = 'baja' | 'media' | 'alta';

export interface TallerRegistro {
  idKey?: string;
  idCamion: string;
  placa?: string;
  tipo?: string;
  ruta?: string;
  razon: string;
  descripcion: string;
  estado: TallerEstado;
  creadoEl: string;
  modificadoEl?: string;
  mecanicoId?: string;
  mecanicoNombre?: string;
  prioridad?: TallerPrioridad;
}

export type TallerRegistroInput = Omit<TallerRegistro, 'idKey' | 'creadoEl' | 'modificadoEl'> & {
  creadoEl?: string;
};

export interface Camion {
  idKey: string;
  activo?: boolean;
  capacidad?: number;
  estado?: string;
  placa?: string;
  ruta?: string;
  tipo?: string;
  enTaller?: boolean;
}

@Injectable({ providedIn: 'root' })
export class TallerService {
  private db = inject(Database);
  private tallerRef = ref(this.db, 'taller');
  private camionesRef = ref(this.db, 'camiones');

  /** Obtención directa vía Promesa sin WebSockets continuos */
  async getRegistrosTaller(): Promise<TallerRegistro[]> {
    const snapshot = await get(this.tallerRef);
    const data = snapshot.val() ?? {};
    const lista: TallerRegistro[] = Object.entries(data)
      .map(([idKey, value]) => ({ idKey, ...(value as Omit<TallerRegistro, 'idKey'>) }))
      .filter((r) => !!r.idCamion);

    lista.sort((a, b) => String(b.creadoEl ?? '').localeCompare(String(a.creadoEl ?? '')));
    return lista;
  }

  async getCamiones(): Promise<Camion[]> {
    const snapshot = await get(this.camionesRef);
    const data = snapshot.val() ?? {};
    const lista: Camion[] = Object.entries(data).map(([idKey, value]) => ({
      idKey,
      ...(value as Omit<Camion, 'idKey'>),
    }));

    lista.sort((a, b) => a.idKey.localeCompare(b.idKey));
    return lista;
  }

  async crearRegistro(registro: TallerRegistroInput): Promise<string> {
    const nuevoRef = push(this.tallerRef);
    const ahora = new Date().toISOString();
    await set(nuevoRef, {
      ...registro,
      creadoEl: registro.creadoEl ?? ahora,
      modificadoEl: ahora,
    });
    return nuevoRef.key as string;
  }

  async actualizarRegistro(idKey: string, cambios: Partial<TallerRegistro>): Promise<void> {
    const { idKey: _omit, ...resto } = cambios;
    await update(ref(this.db, `taller/${idKey}`), {
      ...resto,
      modificadoEl: new Date().toISOString(),
    });
  }

  async marcarCamionEnTaller(idCamion: string, enTaller: boolean): Promise<void> {
    if (!idCamion) return;
    await update(ref(this.db, `camiones/${idCamion}`), {
      enTaller,
      estado: enTaller ? 'en_taller' : 'disponible',
    });
  }

  async eliminarRegistro(idKey: string, idCamion?: string): Promise<void> {
    await remove(ref(this.db, `taller/${idKey}`));
    if (idCamion) {
      await this.marcarCamionEnTaller(idCamion, false);
    }
  }

  async eliminarMultiples(keys: string[]): Promise<void> {
    await Promise.all(keys.map((k) => remove(ref(this.db, `taller/${k}`))));
  }
}
