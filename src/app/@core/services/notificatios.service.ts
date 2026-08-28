import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Database, ref, onValue, update } from '@angular/fire/database';
import { Observable } from 'rxjs';

export interface Notificacion {
  id: string;
  titulo: string;
  mensaje: string;
  tipo?: string;
  leida: boolean;
  timestamp: number;
  horaFormateada?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {
  private database = inject(Database);
  private platformId = inject(PLATFORM_ID);

  getNotificaciones(): Observable<Notificacion[]> {
    return new Observable((observer) => {
      if (!isPlatformBrowser(this.platformId)) {
        observer.next([]);
        return;
      }

      const notifRef = ref(this.database, 'notificaciones');

      const unsubscribe = onValue(notifRef, (snapshot) => {
        if (!snapshot.exists()) {
          observer.next([]);
          return;
        }

        const data = snapshot.val();
        const lista: Notificacion[] = [];

        for (const [id, item] of Object.entries<any>(data)) {
          if (item) {
            const fecha = new Date(item.timestamp || Date.now());
            const horaFormateada = fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

            lista.push({
              id,
              titulo: item.titulo || 'Notificación',
              mensaje: item.mensaje || '',
              tipo: item.tipo || 'info',
              leida: item.leida ?? false,
              timestamp: item.timestamp || 0,
              horaFormateada
            });
          }
        }

        // Ordenar de la más reciente a la más antigua
        lista.sort((a, b) => b.timestamp - a.timestamp);
        observer.next(lista);
      }, (error) => {
        observer.error(error);
      });

      return () => unsubscribe();
    });
  }

  // Marcar una notificación como leída para descontarla del contador
  async marcarComoLeida(id: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    await update(ref(this.database, `notificaciones/${id}`), { leida: true });
  }
}