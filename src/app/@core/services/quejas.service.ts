import { inject, Injectable } from '@angular/core';
import { Database, ref, push, set, get, update, query, orderByChild, equalTo } from '@angular/fire/database';
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
  async obtenerQuejas(userId?: string): Promise<Quejas[]> {
    const quejasRef = ref(this.database, 'quejas');
    
    // Si se pasa userId, se aplica la consulta filtrada
    const consulta = userId 
      ? query(quejasRef, orderByChild('userId'), equalTo(userId))
      : quejasRef;

    const snapshot = await get(consulta);

    if (!snapshot.exists()) {
      return [];
    }

    const data = snapshot.val();
    const listaQuejas: Quejas[] = [];

    Object.keys(data).forEach((key) => {
      listaQuejas.push({
        id: key,
        ...data[key],
      });
    });

    return listaQuejas;
  }

  async obtenerUsuarioPorId(userId: string): Promise<{ name: string; lastName: string } | null> {
    const userRef = ref(this.database, `usuarios/${userId}`);
    const snapshot = await get(userRef);

    if (snapshot.exists()) {
      const data = snapshot.val();
      return {
        name: data.name || data.nombreUsuario || 'Usuario',
        lastName: data.lastName || ''
      };
    }

    return null;
  }

  

  async actualizarEstadoQueja(quejaId: string, nuevoEstado: 'pendiente' | 'en_revision' | 'resuelto'): Promise<void> {
    const quejaRef = ref(this.database, `quejas/${quejaId}`);
    await update(quejaRef, { estado: nuevoEstado });
  }
}