import { Injectable, PLATFORM_ID, inject, NgZone } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Database, ref, onValue } from '@angular/fire/database';
import { Auth, user } from '@angular/fire/auth';
import { BehaviorSubject, Observable } from 'rxjs';
import { NotificacionItem } from '../interfaces/notification.model';
import { environment } from '../../../environments/environment';
import { BrowserNotificationService } from './browser-notification.service';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private db = inject(Database);
  private auth = inject(Auth);
  private ngZone = inject(NgZone);
  private platformId = inject(PLATFORM_ID);
  private browserNotifications = inject(BrowserNotificationService);

  // URL base de la Realtime Database
  private readonly DB_URL = environment.firebaseConfig.databaseURL;
  private readonly API_NOTIFICACIONES = `${this.DB_URL}/notificaciones.json`;

  private notificationsSubject = new BehaviorSubject<NotificacionItem[]>([]);
  public notifications$: Observable<NotificacionItem[]> = this.notificationsSubject.asObservable();

  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$: Observable<number> = this.unreadCountSubject.asObservable();

  private unsubscribeListener: any = null;
  private knownNotificationIds = new Set<string>();
  private isFirstSnapshot = true;

  constructor() {
    this.authSubscription();
  }

  private authSubscription(): void {
    user(this.auth).subscribe(async (currentUser) => {
      if (currentUser) {
        const userRole = await this.obtenerRolDesdeBD(currentUser.uid);
        this.iniciarEscuchaTiempoReal(userRole, currentUser.uid);
      } else {
        this.limpiarEscucha();
      }
    });
  }

  /**
   * Obtiene el rol del usuario vía fetch GET
   */
  private async obtenerRolDesdeBD(uid: string): Promise<string> {
    try {
      const res = await fetch(`${this.DB_URL}/usuarios/${uid}/rol.json`);
      if (!res.ok) return 'user';
      const role = await res.json();
      return (role || 'user').toString().trim().toLowerCase();
    } catch {
      return 'user';
    }
  }

  /**
   * Mantenemos el WebSocket de Firebase para la escucha en tiempo real de la UI
   */
  private iniciarEscuchaTiempoReal(userRole: string, userId: string): void {
    this.limpiarEscucha();
    this.knownNotificationIds.clear();
    this.isFirstSnapshot = true;
    const notifRef = ref(this.db, 'notificaciones');

    this.unsubscribeListener = onValue(notifRef, (snapshot) => {
      const lista: NotificacionItem[] = [];
      let noLeidas = 0;

      if (snapshot.exists()) {
        const data = snapshot.val();
        Object.keys(data).forEach((key) => {
          const item = data[key];
          const target = item.rolDestino;
          const userTarget = item.uidDestino;

          let esVisible = false;

          if (userTarget) {
            const targetIds = Array.isArray(userTarget)
              ? userTarget.map(String)
              : typeof userTarget === 'object'
                ? Object.values(userTarget).map(String)
                : [String(userTarget)];
            esVisible = targetIds.includes(userId);
          } else if (!target || target === 'todos') {
            esVisible = true;
          } else if (Array.isArray(target)) {
            esVisible = target.includes(userRole) || userRole === 'admin';
          } else {
            const targetClean = target.toString().trim().toLowerCase();
            esVisible =
              targetClean === userRole ||
              userRole === 'admin' ||
              userRole === 'supervisor';
          }

          if (esVisible) {
            if (
              !this.isFirstSnapshot &&
              !this.knownNotificationIds.has(key) &&
              item.creadoPor !== userId
            ) {
              this.mostrarNotificacionLocal(
                item.titulo || 'Notificación',
                item.mensaje || '',
                key,
              );
            }
            this.knownNotificationIds.add(key);
            const notif: NotificacionItem = {
              id: key,
              titulo: item.titulo || 'Notificación',
              mensaje: item.mensaje || '',
              tipo: item.tipo || 'info',
              leida: Boolean(item.leida),
              timestamp: Number(item.timestamp) || Date.now(),
            };

            if (!notif.leida) {
              noLeidas++;
            }
            lista.push(notif);
          }
        });

        lista.sort((a, b) => b.timestamp - a.timestamp);
      }

      this.isFirstSnapshot = false;
      this.ngZone.run(() => {
        this.notificationsSubject.next(lista);
        this.unreadCountSubject.next(noLeidas);
      });
    });
  }

  private mostrarNotificacionLocal(titulo: string, mensaje: string, id: string): void {
    if (
      !isPlatformBrowser(this.platformId) ||
      !this.browserNotifications.isEnabled
    ) {
      return;
    }

    void (async () => {
      const registration = await navigator.serviceWorker?.getRegistration();
      if (registration) {
        await registration.showNotification(titulo, { body: mensaje, tag: `wastemonitor-${id}` });
        return;
      }
      new Notification(titulo, { body: mensaje, tag: `wastemonitor-${id}` });
    })().catch((error: unknown) => {
      console.error('No se pudo mostrar la notificación del navegador:', error);
    });
  }

  private limpiarEscucha(): void {
    if (this.unsubscribeListener) {
      this.unsubscribeListener();
      this.unsubscribeListener = null;
    }
    this.notificationsSubject.next([]);
    this.unreadCountSubject.next(0);
  }

  /**
   * Marcar notificación como leída mediante PATCH fetch
   */
  async marcarComoLeida(idNotificacion: string): Promise<void> {
    try {
      await fetch(`${this.DB_URL}/notificaciones/${idNotificacion}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leida: true }),
      });
    } catch (error) {
      console.error('Error marcando notificación como leída:', error);
    }
  }

  /**
   * Marcar todas las notificaciones visibles como leídas mediante PATCH fetch
   */
  async marcarTodasComoLeidas(): Promise<void> {
    const actuales = this.notificationsSubject.value;
    const updates: Record<string, boolean> = {};

    actuales.forEach((n) => {
      if (!n.leida) {
        updates[`${n.id}/leida`] = true;
      }
    });

    if (Object.keys(updates).length > 0) {
      try {
        await fetch(this.API_NOTIFICACIONES, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
      } catch (error) {
        console.error('Error marcando todas como leídas:', error);
      }
    }
  }

  /**
   * Crear notificación global usando POST con fetch
   */
  async crearNotificacion(
    titulo: string,
    mensaje: string,
    tipo: string = 'info',
    rolDestino: string | string[] = 'todos'
  ): Promise<void> {
    try {
      const res = await fetch(this.API_NOTIFICACIONES, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo,
          mensaje,
          tipo,
          leida: false,
          timestamp: Date.now(),
          rolDestino,
          creadoPor: this.auth.currentUser?.uid || null,
        }),
      });
      if (!res.ok) throw new Error('Error en el servidor al enviar la notificación.');
    } catch (error) {
      console.error('Error al enviar notificación:', error);
      throw error;
    }
  }

  /**
   * Crear notificación para los usuarios seleccionados.
   */
  async crearNotificacionParaUsuarios(
    titulo: string,
    mensaje: string,
    userIds: string[]
  ): Promise<void> {
    const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
    if (uniqueUserIds.length === 0) throw new Error('Selecciona al menos un destinatario.');

    const timestamp = Date.now();
    const responses = await Promise.all(uniqueUserIds.map((userId) =>
      fetch(this.API_NOTIFICACIONES, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
        titulo,
        mensaje,
        tipo: 'info',
        leida: false,
        timestamp,
        rolDestino: 'destinatario',
        uidDestino: userId,
        creadoPor: this.auth.currentUser?.uid || null,
        }),
      }),
    ));
    if (responses.some((response) => !response.ok)) {
      throw new Error('No se pudieron enviar algunas notificaciones.');
    }
  }
}