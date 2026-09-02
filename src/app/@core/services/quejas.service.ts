import { inject, Injectable } from '@angular/core';
import { Database, ref, push, set, get } from '@angular/fire/database';
import { Quejas } from '../interfaces/quejas.model'; // Ajusta la ruta del modelo si es necesario

@Injectable({
  providedIn: 'root',
})
export class QuejasService {
  private database = inject(Database);

  async registrarQueja(userId: string, asunto: string, descripcion: string): Promise<void> {
    const quejasRef = ref(this.database, 'quejas');
    const nuevaQuejaRef = push(quejasRef);

    const nuevaQueja: Quejas = {
      userId,
      asunto,
      descripcion,
      fecha: Date.now(),
      estado: 'pendiente',
    };

    await set(nuevaQuejaRef, nuevaQueja);
  }

  // Método para obtener y formatear las quejas
  async obtenerQuejas(): Promise<Quejas[]> {
    const quejasRef = ref(this.database, 'quejas');
    const snapshot = await get(quejasRef);

    if (!snapshot.exists()) {
      return [];
    }

    const data = snapshot.val();
    const listaQuejas: Quejas[] = [];

    // Mapeamos las llaves del objeto (ej. "queja_001") al campo id
    Object.keys(data).forEach((key) => {
      listaQuejas.push({
        id: key,
        ...data[key],
      });
    });

    return listaQuejas;
  }
}