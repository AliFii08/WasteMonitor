import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  sendPasswordResetEmail,
} from '@angular/fire/auth';
import { Database, ref, set, get } from '@angular/fire/database';
import emailjs from '@emailjs/browser';
import { FirebaseUser } from '../interfaces/user.model';
import { UserService } from './user.service';

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
  private platformId = inject(PLATFORM_ID);

  private readonly EMAILJS_SERVICE_ID = 'service_88280lv';
  private readonly EMAILJS_TEMPLATE_ID = 'template_lm1wwb6';
  private readonly EMAILJS_PUBLIC_KEY = '5zExxPk-wTveoA0uF';

  async register(data: RegisterData): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const normalizedEmail = data.email.trim().toLowerCase();
    const userCredential = await createUserWithEmailAndPassword(
      this.auth,
      normalizedEmail,
      data.password
    );
    const user = userCredential.user;

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

    await signOut(this.auth);
  }

  async login(email: string, pass: string): Promise<FirebaseUser> {
    if (!isPlatformBrowser(this.platformId)) {
      throw new Error('platform-not-supported');
    }

    const cleanEmail = email.trim().toLowerCase();
    const userCredential = await signInWithEmailAndPassword(this.auth, cleanEmail, pass);
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

  async sendResetCode(email: string): Promise<{ uid: string; email: string }> {
    if (!isPlatformBrowser(this.platformId)) throw new Error('platform-not-supported');

    const cleanEmail = email.trim().toLowerCase();
    const usersRef = ref(this.database, 'usuarios');
    const snapshot = await get(usersRef);

    if (!snapshot.exists()) throw new Error('user-not-found');

    let uid = '';
    let userName = 'Usuario';
    let userFound = false;

    snapshot.forEach((child) => {
      const data = child.val();
      if (data && data.email && data.email.toLowerCase() === cleanEmail) {
        uid = child.key;
        userName = `${data.name || ''} ${data.lastName || ''}`.trim() || 'Usuario';
        userFound = true;
      }
    });

    if (!userFound) throw new Error('user-not-found');

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000;

    const resetRef = ref(this.database, `reset_codes/${uid}`);
    await set(resetRef, {
      code: otpCode,
      expiresAt,
      used: false,
    });

    const templateParams = {
      to_email: cleanEmail,
      to_name: userName,
      pass_code: otpCode,
    };

    try {
      await emailjs.send(
        this.EMAILJS_SERVICE_ID,
        this.EMAILJS_TEMPLATE_ID,
        templateParams,
        this.EMAILJS_PUBLIC_KEY
      );
    } catch (error) {
      console.error('Error al enviar EmailJS:', error);
    }

    return { uid, email: cleanEmail };
  }

  async verifyCode(uid: string, inputCode: string): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) return false;

    const resetRef = ref(this.database, `reset_codes/${uid}`);
    const snapshot = await get(resetRef);

    if (!snapshot.exists()) throw new Error('code-not-found');

    const data = snapshot.val();
    if (data.used) throw new Error('code-already-used');
    if (Date.now() > data.expiresAt) throw new Error('code-expired');
    if (data.code !== inputCode.trim()) return false;

    return true;
  }

  /**
   * Cambia la contraseña en Firebase Auth asegurando que la sesión existe.
   */
  async changePasswordWithOTP(uid: string, newPass: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    // 1. Verificar si hay usuario activo en Firebase Auth
    if (!this.auth.currentUser) {
      throw new Error('no-active-session');
    }

    // 2. Actualizar contraseña en Firebase Auth
    await updatePassword(this.auth.currentUser, newPass);

    // 3. Marcar el código OTP como utilizado en RTDB
    const usedRef = ref(this.database, `reset_codes/${uid}/used`);
    await set(usedRef, true);
  }

  /**
   * Verifica la existencia del correo en Realtime Database y, de existir,
   * envía el correo nativo de recuperación de Firebase.
   */
  async sendResetPasswordEmail(email: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const cleanEmail = email.trim().toLowerCase();

    // 1. Consultar nodo de usuarios para verificar si el correo está registrado
    const usersRef = ref(this.database, 'usuarios');
    const snapshot = await get(usersRef);

    if (!snapshot.exists()) {
      throw { code: 'auth/user-not-found' };
    }

    let userFound = false;

    snapshot.forEach((child) => {
      const data = child.val();
      if (data && data.email && data.email.toLowerCase() === cleanEmail) {
        userFound = true;
      }
    });

    if (!userFound) {
      throw { code: 'auth/user-not-found' };
    }

    // 2. Si el correo existe en la base de datos, se envía el email nativo
    await sendPasswordResetEmail(this.auth, cleanEmail);
  }
}