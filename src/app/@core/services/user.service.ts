import { inject, Injectable, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { FirebaseUser } from '../interfaces/user.model'; // <-- Importa la nueva interfaz

@Injectable({
  providedIn: 'root',
})
export class UserService {
  // Ahora el signal maneja la estructura correcta de Firebase
  currentUserSignal = signal<FirebaseUser | null>(null);

  constructor() {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      this.currentUserSignal.set(JSON.parse(storedUser));
    }
  }

  currentUser(): Observable<FirebaseUser | null> {
    return of(this.currentUserSignal());
  }
}