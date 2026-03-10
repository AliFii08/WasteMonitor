import { Injectable, Inject, Optional, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { FIREBASE_ADMIN } from '../app.config.server'; // El token que creamos
import { getDatabase, ref, push, set } from 'firebase/database'; // SDK Cliente
@Injectable({
  providedIn: 'root',
})
export class DatabaseService {
  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    @Optional() @Inject(FIREBASE_ADMIN) private admin: any,
  ) {}

  async guardarUsuario(datos: any) {
    // Si estamos en el Servidor (SSR)
    if (isPlatformServer(this.platformId)) {
      console.log('Guardando desde el servidor...');
      const db = this.admin.database();
      return db.ref('usuarios').push(datos);
    }

    // Si estamos en el Navegador (Cliente)
    else {
      console.log('Guardando desde el navegador...');
      const db = getDatabase(); // Requiere haber inicializado Firebase en app.config.ts
      const usuariosRef = ref(db, 'usuarios');
      return set(push(usuariosRef), datos);
    }
  }
}
