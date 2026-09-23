import { Injectable, inject, ChangeDetectorRef } from '@angular/core';
import { Database, ref, onValue, update, push, Unsubscribe } from '@angular/fire/database';
import { BehaviorSubject, Observable } from 'rxjs';
import { NotificacionItem } from '../interfaces/notification.model';


@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private db = inject(Database);

  private notificationsSubject = new BehaviorSubject<NotificacionItem[]>([]);
  public notifications$: Observable<NotificacionItem[]> = this.notificationsSubject.asObservable();

  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$: Observable<number> = this.unreadCountSubject.asObservable();

  private unsubscribeListener: Unsubscribe | null = null;

  constructor() {
    this.iniciarEscuchaTiempoReal();
  }

  /**
   * Suscripción reactiva global a la colección /notificaciones
   */
  private iniciarEscuchaTiempoReal(): void {
    const notifRef = ref(this.db, 'notificaciones');

    this.unsubscribeListener = onValue(notifRef, (snapshot) => {
      const lista: NotificacionItem[] = [];
      let noLeidas = 0;

      if (snapshot.exists()) {
        const data = snapshot.val();
        Object.keys(data).forEach((key) => {
          const item = data[key];
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
        });

        // Ordenar de la más reciente a la más antigua
        lista.sort((a, b) => b.timestamp - a.timestamp);
      }

      this.notificationsSubject.next(lista);
      this.unreadCountSubject.next(noLeidas);
    });
  }

  /**
   * Marcar una notificación específica como leída
   */
  async marcarComoLeida(idNotificacion: string): Promise<void> {
    const notifRef = ref(this.db, `notificaciones/${idNotificacion}`);
    await update(notifRef, { leida: true });
  }

  /**
   * Marcar todas las notificaciones recibidas como leídas en una sola transacción
   */
  async marcarTodasComoLeidas(): Promise<void> {
    const actuales = this.notificationsSubject.value;
    const updates: Record<string, any> = {};

    actuales.forEach((n) => {
      if (!n.leida) {
        updates[`notificaciones/${n.id}/leida`] = true;
      }
    });

    if (Object.keys(updates).length > 0) {
      await update(ref(this.db), updates);
    }
  }

  /**
   * Crear y emitir una nueva notificación
   */
  async crearNotificacion(titulo: string, mensaje: string, tipo: string = 'info'): Promise<void> {
    const notifRef = ref(this.db, 'notificaciones');
    const nuevaNotif = {
      titulo,
      mensaje,
      tipo,
      leida: false,
      timestamp: Date.now(),
    };
    await push(notifRef, nuevaNotif);
  }
}