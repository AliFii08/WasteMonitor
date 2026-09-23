import { Injectable, inject, NgZone } from '@angular/core';
import { Database, ref, get, update, push, set, child, onValue } from '@angular/fire/database';
import { Auth, user } from '@angular/fire/auth';
import { BehaviorSubject, Observable } from 'rxjs';
import { NotificacionItem } from '../interfaces/notification.model';
import { environment } from '../../../environments/environment';


@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private db = inject(Database);
    private auth = inject(Auth);
    private ngZone = inject(NgZone);
  
    // 🔹 La URL centralizada apuntando al endpoint de notificaciones
    private readonly API_NOTIFICACIONES = `${environment.firebaseConfig.databaseURL}/notificaciones.json`;
  
    private notificationsSubject = new BehaviorSubject<NotificacionItem[]>([]);
    public notifications$: Observable<NotificacionItem[]> = this.notificationsSubject.asObservable();
  
    private unreadCountSubject = new BehaviorSubject<number>(0);
    public unreadCount$: Observable<number> = this.unreadCountSubject.asObservable();
  
    private unsubscribeListener: any = null;
  
    constructor() {
      this.authSubscription();
    }

  private authSubscription(): void {
    user(this.auth).subscribe(async (currentUser) => {
      if (currentUser) {
        const userRole = await this.obtenerRolDesdeBD(currentUser.uid);
        this.iniciarEscuchaTiempoReal(userRole);
      } else {
        this.limpiarEscucha();
      }
    });
  }

  private async obtenerRolDesdeBD(uid: string): Promise<string> {
    try {
      const userSnap = await get(ref(this.db, `usuarios/${uid}/rol`));
      if (userSnap.exists()) {
        return (userSnap.val() || 'user').toString().trim().toLowerCase();
      }
      return 'user';
    } catch {
      return 'user';
    }
  }

  private iniciarEscuchaTiempoReal(userRole: string): void {
    this.limpiarEscucha();
    const notifRef = ref(this.db, 'notificaciones');

    this.unsubscribeListener = onValue(notifRef, (snapshot) => {
      const lista: NotificacionItem[] = [];
      let noLeidas = 0;

      if (snapshot.exists()) {
        const data = snapshot.val();
        Object.keys(data).forEach((key) => {
          const item = data[key];
          const target = item.rolDestino;

          let esVisible = false;

          if (!target || target === 'todos') {
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

      // Re-entramos a la Zona de Angular únicamente para actualizar la UI cuando llegan datos
      this.ngZone.run(() => {
        this.notificationsSubject.next(lista);
        this.unreadCountSubject.next(noLeidas);
      });
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

  async marcarComoLeida(idNotificacion: string): Promise<void> {
    const notifRef = ref(this.db, `notificaciones/${idNotificacion}`);
    await update(notifRef, { leida: true });
  }

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
     * Crear notificación vía REST usando la URL del environment
     */
    async crearNotificacion(
      titulo: string, 
      mensaje: string, 
      tipo: string = 'info', 
      rolDestino: string = 'todos'
    ): Promise<void> {
      try {
        const body = {
          titulo,
          mensaje,
          tipo,
          leida: false,
          timestamp: Date.now(),
          rolDestino
        };
  
        await fetch(this.API_NOTIFICACIONES, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
  
        console.log('✅ Notificación guardada en Firebase por REST exitosamente');
      } catch (error) {
        console.error('❌ Error al enviar notificación:', error);
      }
    }
}