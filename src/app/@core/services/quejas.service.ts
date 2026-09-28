import { inject, Injectable } from '@angular/core';
import { Database, ref, get, update } from '@angular/fire/database';
import { Quejas } from '../interfaces/quejas.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class QuejasService {
  private database = inject(Database);
  private readonly API_QUEJAS = `${environment.firebaseConfig.databaseURL}/quejas.json`;

  /**
   * Registra una queja vía REST (Fetch) con el ID del usuario dinámico
   */
  async registrarQueja(userId: string, asunto: string, descripcion: string): Promise<void> {
    const payload: Omit<Quejas, 'id'> = {
      userId,
      asunto,
      descripcion,
      fecha: Date.now(),
      estado: 'pendiente',
    };

    const response = await fetch(this.API_QUEJAS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }
  }

  /**
   * Obtiene quejas. Si viene `userId`, filtra en memoria asegurando
   * que se muestren las del usuario actual.
   */
  async obtenerQuejas(userId?: string): Promise<Quejas[]> {
    const quejasRef = ref(this.database, 'quejas');
    const snapshot = await get(quejasRef);

    if (!snapshot.exists()) {
      return [];
    }

    const data = snapshot.val();
    const listaQuejas: Quejas[] = [];

    Object.keys(data).forEach((key) => {
      const item = data[key];
      if (!userId || item.userId === userId) {
        listaQuejas.push({
          id: key,
          ...item,
        });
      }
    });

    return listaQuejas.sort((a, b) => (b.fecha || 0) - (a.fecha || 0));
  }

  async obtenerUsuarioPorId(userId: string): Promise<{ name: string; lastName: string } | null> {
    const userRef = ref(this.database, `usuarios/${userId}`);
    const snapshot = await get(userRef);

    if (snapshot.exists()) {
      const data = snapshot.val();
      return {
        name: data.name || data.nombreUsuario || 'Usuario',
        lastName: data.lastName || '',
      };
    }

    return null;
  }

  async actualizarEstadoQueja(
    quejaId: string,
    nuevoEstado: 'pendiente' | 'en_revision' | 'resuelto',
  ): Promise<void> {
    const quejaRef = ref(this.database, `quejas/${quejaId}`);
    await update(quejaRef, { estado: nuevoEstado });
  }
}