import { inject, Injectable } from '@angular/core';
import { Database, ref, get, query, orderByChild, equalTo } from '@angular/fire/database';
import { FirebaseUser } from '../interfaces/user.model';

@Injectable({
  providedIn: 'root',
})
export class ConductoresService {
  private database = inject(Database);

  /**
   * Obtiene todos los usuarios y los filtra localmente por rol 'conductor'
   */
  async getConductores(): Promise<FirebaseUser[]> {
    try {
      const usersRef = ref(this.database, 'usuarios');
      const snapshot = await get(usersRef);

      const conductores: FirebaseUser[] = [];

      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const userData = childSnapshot.val();

          // Filtrado directo en JavaScript
          if (userData && userData.rol === 'conductor') {
            conductores.push({
              uid: childSnapshot.key,
              ...userData,
            });
          }
        });
      }

      console.log('Lista de conductores:', conductores);
      return conductores;

    } catch (error) {
      console.error('Error al obtener la lista de conductores:', error);
      return [];
    }
  }
}