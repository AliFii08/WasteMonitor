import { Injectable, inject } from '@angular/core';
import { Database, onValue, push, ref, set, update } from '@angular/fire/database';

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

  listen(callback: (alerts: EmergencyAlert[]) => void): () => void {
    return onValue(ref(this.database, 'emergencias'), (snapshot) => {
      const data = snapshot.val() as Record<string, Omit<EmergencyAlert, 'id' | 'events'> & {
        events?: Record<string, EmergencyEvent>;
      }> | null;

      const alerts = Object.entries(data ?? {}).map(([id, alert]) => ({
        ...alert,
        id,
        events: Object.values(alert.events ?? {}).sort((a, b) => a.timestamp - b.timestamp),
      }));

      callback(alerts.sort((a, b) => b.createdAt - a.createdAt));
    });
  }

  async report(alert: Omit<EmergencyAlert, 'id' | 'events'>, firstEvent: EmergencyEvent): Promise<void> {
    const emergencyRef = push(ref(this.database, 'emergencias'));
    if (!emergencyRef.key) throw new Error('No se pudo crear la emergencia.');
    const eventRef = push(ref(this.database, `emergencias/${emergencyRef.key}/events`));
    if (!eventRef.key) throw new Error('No se pudo crear el evento de emergencia.');

    await set(emergencyRef, {
      ...alert,
      events: {
        [eventRef.key]: firstEvent,
      },
    });
  }

  async addUpdate(id: string, status: string, event: EmergencyEvent): Promise<void> {
    const eventRef = push(ref(this.database, `emergencias/${id}/events`));
    await set(eventRef, event);
    await update(ref(this.database, `emergencias/${id}`), { status });
  }
}
