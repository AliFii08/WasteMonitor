import { Injectable, inject } from '@angular/core';
import { Database, onValue, ref } from '@angular/fire/database';
import { environment } from '../../../environments/environment';

export type EmergencyKind = 'delay' | 'mechanic' | 'tow';

export interface EmergencyEvent {
  message: string;
  author: string;
  role: string;
  timestamp: number;
}

export interface EmergencyAlert {
  id: string;
  vehicle: string;
  kind: EmergencyKind;
  description: string;
  status: string;
  createdAt: number;
  createdBy: string;
  createdRole: string;
  events: EmergencyEvent[];
}

@Injectable({ providedIn: 'root' })
export class EmergencyService {
  private database = inject(Database);
  private databaseUrl = environment.firebaseConfig.databaseURL;

  /**
   * Mantenemos el listener en tiempo real mediante WebSocket para actualizar la UI automáticamente
   */
  listen(callback: (alerts: EmergencyAlert[]) => void): () => void {
    return onValue(ref(this.database, 'emergencias'), (snapshot) => {
      const data = snapshot.val() as Record<
        string,
        Omit<EmergencyAlert, 'id' | 'events'> & {
          events?: Record<string, EmergencyEvent>;
        }
      > | null;

      const alerts = Object.entries(data ?? {}).map(([id, alert]) => ({
        ...alert,
        id,
        events: Object.values(alert.events ?? {}).sort((a, b) => a.timestamp - b.timestamp),
      }));

      callback(alerts.sort((a, b) => b.createdAt - a.createdAt));
    });
  }

  /**
   * Reporta una nueva emergencia usando fetch
   */
  async report(alert: Omit<EmergencyAlert, 'id' | 'events'>, firstEvent: EmergencyEvent): Promise<void> {
    // 1. Crear la nueva emergencia con POST para obtener un ID automático
    const bodyEmergencia = {
      ...alert,
      events: {},
    };

    const resEmergency = await fetch(`${this.databaseUrl}/emergencias.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyEmergencia),
    });

    if (!resEmergency.ok) throw new Error('No se pudo crear el reporte de emergencia.');

    const { name: newEmergencyId } = await resEmergency.json();

    // 2. Insertar el primer evento dentro del subnodo events de la emergencia recién creada
    const resEvent = await fetch(`${this.databaseUrl}/emergencias/${newEmergencyId}/events.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(firstEvent),
    });

    if (!resEvent.ok) throw new Error('No se pudo guardar el evento de la emergencia.');

    // 3. Crear la notificación enviándola a /notificaciones.json
    try {
      const nuevaNotificacion = {
        titulo: `Emergencia: ${alert.vehicle}`,
        mensaje: firstEvent.message,
        tipo: 'alerta',
        rolDestino: 'admin',
        leida: false,
        timestamp: Date.now(),
      };

      await fetch(`${this.databaseUrl}/notificaciones.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevaNotificacion),
      });
    } catch (e) {
      console.warn('La emergencia se creó pero la notificación con fetch falló:', e);
    }
  }

  /**
   * Agrega una respuesta y actualiza el estado de la emergencia usando fetch
   */
  async addUpdate(id: string, status: string, event: EmergencyEvent): Promise<void> {
    // 1. Agregar el nuevo evento al historial de la emergencia
    const resEvent = await fetch(`${this.databaseUrl}/emergencias/${id}/events.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });

    if (!resEvent.ok) throw new Error('No se pudo guardar la respuesta de la emergencia.');

    // 2. Actualizar el estado (status) mediante PATCH
    const resStatus = await fetch(`${this.databaseUrl}/emergencias/${id}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    if (!resStatus.ok) throw new Error('No se pudo actualizar el estado de la emergencia.');

    // 3. Registrar la notificación correspondiente
    try {
      let rolDestino = 'supervisor';
      if (event.role === 'supervisor') rolDestino = 'admin';
      if (event.role === 'admin' && status.includes('mecanico')) rolDestino = 'mecanico';

      const nuevaNotificacion = {
        titulo: `Respuesta a emergencia (${event.author})`,
        mensaje: event.message,
        tipo: 'alerta',
        rolDestino,
        leida: false,
        timestamp: Date.now(),
      };

      await fetch(`${this.databaseUrl}/notificaciones.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevaNotificacion),
      });
    } catch (e) {
      console.warn('La emergencia se actualizó pero la notificación falló:', e);
    }
  }
}