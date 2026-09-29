import { inject, Injectable } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, deleteUser, sendPasswordResetEmail, signOut } from '@angular/fire/auth';
import { Database, get, ref, set, update } from '@angular/fire/database';
import { deleteApp, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { FirebaseUser } from '../interfaces/user.model';
import { AuthService, UserRole } from './auth.service';
import { environment } from '../../../environments/environment';

export type StaffRole = Extract<UserRole, 'supervisor' | 'crew' | 'conductor' | 'mecanico'>;

export interface StaffUserInput {
  name: string;
  lastName: string;
  email: string;
  phone: string;
  rol: StaffRole;
}

@Injectable({ providedIn: 'root' })
export class StaffUsersService {
  private readonly auth = inject(Auth);
  private readonly database = inject(Database);
  private readonly authService = inject(AuthService);

  async getStaffUsers(): Promise<FirebaseUser[]> {
    const snapshot = await get(ref(this.database, 'usuarios'));
    if (!snapshot.exists()) return [];

    const staffRoles: UserRole[] = ['admin', 'supervisor', 'crew', 'conductor', 'mecanico'];
    const users: FirebaseUser[] = [];
    snapshot.forEach((child) => {
      const data = child.val();
      if (data && staffRoles.includes(data.rol)) {
        users.push({ uid: child.key ?? '', ...data });
      }
    });

    return users.sort((first, second) => first.name.localeCompare(second.name));
  }

  async createStaffUser(input: StaffUserInput): Promise<boolean> {
    if (!this.authService.hasRole(['admin'])) throw new Error('admin-required');

    const email = input.email.trim().toLowerCase();
    const temporaryPassword = Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map((value) => value.toString(16).padStart(2, '0'))
      .join('');
    const secondaryApp = initializeApp(
      environment.firebaseConfig,
      `staff-registration-${crypto.randomUUID()}`,
    );
    const secondaryAuth = getAuth(secondaryApp);
    let createdUser: Awaited<ReturnType<typeof createUserWithEmailAndPassword>>['user'] | null = null;

    try {
      const credential = await createUserWithEmailAndPassword(secondaryAuth, email, temporaryPassword);
      createdUser = credential.user;
      await set(ref(this.database, `usuarios/${createdUser.uid}`), {
        name: input.name.trim(),
        lastName: input.lastName.trim(),
        email,
        phone: input.phone.trim(),
        rol: input.rol,
        activo: true,
      });
    } catch (error) {
      if (createdUser) await deleteUser(createdUser);
      throw error;
    } finally {
      await signOut(secondaryAuth);
      await deleteApp(secondaryApp);
    }

    try {
      await sendPasswordResetEmail(this.auth, email);
      return true;
    } catch {
      return false;
    }
  }

  async updateStaffUser(
    uid: string,
    input: Pick<StaffUserInput, 'name' | 'lastName' | 'phone' | 'rol'>,
  ): Promise<void> {
    if (!this.authService.hasRole(['admin'])) throw new Error('admin-required');

    await update(ref(this.database, `usuarios/${uid}`), {
      name: input.name.trim(),
      lastName: input.lastName.trim(),
      phone: input.phone.trim(),
      rol: input.rol,
    });
  }

  async setStaffUserActive(uid: string, active: boolean): Promise<void> {
    if (!this.authService.hasRole(['admin'])) throw new Error('admin-required');
    await update(ref(this.database, `usuarios/${uid}`), { activo: active });
  }
}
