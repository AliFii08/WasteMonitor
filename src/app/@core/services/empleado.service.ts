import { inject, Injectable } from '@angular/core';
import { Database, ref, get, query, orderByChild, equalTo } from '@angular/fire/database';
import { FirebaseUser } from '../interfaces/user.model';

@Injectable({
  providedIn: 'root',
})
export class EmpleadoService{
    private database = inject(Database);

    // Obtiene a los empleados que van en el camion
    async getEmpleado(): Promise<FirebaseUser[]> {
        try {
        
            const usersRef = ref(this.database, 'usuarios');
            const snapshot = await get(usersRef);
            const empleados: FirebaseUser[] = [];

            if(snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    const empleadoData = childSnapshot.val();
                    if (empleadoData && empleadoData.rol === 'empleado') {
                        empleados.push({
                            uid: childSnapshot.key,
                            ...empleadoData,
                        });
                    }

                });
            }
            console.log("Lista de empleados", empleados);
            return empleados;
        } catch(e) {
            console.error('Error al obtener a los empleados', e)
            return [];
        }
    }
}