// import { inject, Injectable } from '@angular/core';
// import { Auth, signInWithEmailAndPassword } from '@angular/fire/auth';
// import { Database, ref, get } from '@angular/fire/database';
// import { FirebaseUser } from '../interfaces/user.model';
// import { UserService } from './user.service';

// @Injectable({
//   providedIn: 'root',
// })
// export class AuthService {
//   private auth = inject(Auth);
//   private database = inject(Database);
//   private userService = inject(UserService);

//   /**
//    * Inicia sesión con email y contraseña, consulta la base de datos
//    * y actualiza el estado global del usuario (Signal + LocalStorage).
//    */
//   async login(email: string, pass: string): Promise<FirebaseUser> {
//     // 1. Autenticar con Firebase Auth
//     const userCredential = await signInWithEmailAndPassword(this.auth, email, pass);
//     const uid = userCredential.user.uid;

//     // 2. Buscar datos en Realtime Database
//     const userRef = ref(this.database, `usuarios/${uid}`);
//     const snapshot = await get(userRef);

//     if (!snapshot.exists()) {
//       throw new Error('user-data-not-found');
//     }

//     const userData = snapshot.val();

//     // 3. Mapear datos
//     const userToSave: FirebaseUser = {
//       uid: uid,
//       email: userData.email,
//       name: userData.name,
//       lastName: userData.lastName,
//       phone: userData.phone,
//       rol: userData.rol,
//       address: userData.address,
//     };

//     // 4. Guardar en Signal y LocalStorage
//     this.userService.currentUserSignal.set(userToSave);
//     localStorage.setItem('currentUser', JSON.stringify(userToSave));

//     return userToSave;
//   }
// }

import { inject, Injectable } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from '@angular/fire/auth';
import { Database, ref, set, get } from '@angular/fire/database';
import { FirebaseUser } from '../interfaces/user.model';
import { UserService } from './user.service';

// Definimos un tipo DTO para los datos del formulario de registro
export interface RegisterData {
  email: string;
  password: string;
  name: string;
  lastName: string;
  phone: string;
  sector: string;
  street: string;
  houseNumber: string;
  postalCode: string | number;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private auth = inject(Auth);
  private database = inject(Database);
  private userService = inject(UserService);

  /**
   * Registra un nuevo usuario en Firebase Auth y crea su nodo en Realtime Database.
   */
  async register(data: RegisterData): Promise<void> {
    const normalizedEmail = data.email.trim().toLowerCase();

    // 1. Crear el usuario en Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(
      this.auth,
      normalizedEmail,
      data.password
    );
    const user = userCredential.user;

    // 2. Guardar los datos en Realtime Database bajo el nodo "usuarios/UID"
    const userNodeRef = ref(this.database, `usuarios/${user.uid}`);

    await set(userNodeRef, {
      name: data.name,
      lastName: data.lastName,
      email: normalizedEmail,
      phone: data.phone,
      address: {
        sector: data.sector,
        street: data.street,
        houseNumber: data.houseNumber,
        postalCode: data.postalCode ? Number(data.postalCode) : 0,
      },
      rol: 'user',
    });

    // 3. Cerrar la sesión iniciada automáticamente al registrarse para redirigir al login
    await signOut(this.auth);
  }

  /**
   * Inicia sesión con email y contraseña.
   */
  async login(email: string, pass: string): Promise<FirebaseUser> {
    const userCredential = await signInWithEmailAndPassword(this.auth, email, pass);
    const uid = userCredential.user.uid;

    const userRef = ref(this.database, `usuarios/${uid}`);
    const snapshot = await get(userRef);

    if (!snapshot.exists()) {
      throw new Error('user-data-not-found');
    }

    const userData = snapshot.val();

    const userToSave: FirebaseUser = {
      uid: uid,
      email: userData.email,
      name: userData.name,
      lastName: userData.lastName,
      phone: userData.phone,
      rol: userData.rol,
      address: userData.address,
    };

    this.userService.currentUserSignal.set(userToSave);
    localStorage.setItem('currentUser', JSON.stringify(userToSave));

    return userToSave;
  }
}