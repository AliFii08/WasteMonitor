import { Injectable } from '@angular/core';

export interface ScheduleItem {
  id?: string;
  camion: string;
  culminado: boolean;
  dia: string;
  turno: string;
  ruta: string;
  sector: string;
  description?: string;
  activo?: boolean;
}

export interface CreateScheduleDto {
  camion: string;
  dia: string;
  turno: string;
  ruta: string;
  sector: string;
  description?: string;
  culminado?: boolean;
  activo?: boolean;
}

export interface CitizenScheduleItem {
  id?: string;
  dia: string;
  turno: string;
  sectores: string[];
  activo?: boolean;
}

export interface CreateCitizenScheduleDto {
  dia: string;
  turno: string;
  sectores: string[];
}

@Injectable({
  providedIn: 'root',
})
export class SchedulesService {
  private readonly baseUrl = 'https://wastemonitor-c425a-default-rtdb.firebaseio.com';

  async getHorarios(): Promise<ScheduleItem[]> {
    try {
      const response = await fetch(`${this.baseUrl}/horarios.json`);
      if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
      const data = await response.json();
      if (!data) return [];
      return Object.keys(data).map((key) => ({ id: key, ...data[key] }));
    } catch (error) {
      console.error('Error al obtener los horarios:', error);
      throw error;
    }
  }

  async getActiveJourneys(): Promise<Record<string, any>> {
    try {
      const response = await fetch(`${this.baseUrl}/informe_de_viaje.json`);
      if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
      const data = await response.json();
      return data || {};
    } catch (error) {
      console.error('Error al obtener los informes de viaje:', error);
      return {};
    }
  }

  async getCitizenSchedules(): Promise<CitizenScheduleItem[]> {
    try {
      const response = await fetch(`${this.baseUrl}/horarios_ciudadanos.json`);
      if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
      const data = await response.json();
      if (!data) return [];
      return Object.keys(data).map((key) => ({ id: key, ...data[key] }));
    } catch (error) {
      console.error('Error al obtener los horarios ciudadanos:', error);
      throw error;
    }
  }

  async createCitizenSchedule(schedule: CreateCitizenScheduleDto): Promise<{ name: string }> {
    try {
      const payload = {
        dia: schedule.dia.toLowerCase().trim(),
        turno: schedule.turno.toLowerCase().trim(),
        sectores: schedule.sectores.filter((s) => s && s.trim() !== ''),
        activo: true,
      };
      const response = await fetch(`${this.baseUrl}/horarios_ciudadanos.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`Error al crear el horario ciudadano.`);
      return await response.json();
    } catch (error) {
      console.error('Error al guardar el horario ciudadano:', error);
      throw error;
    }
  }

  async updateCitizenSchedule(id: string, schedule: CreateCitizenScheduleDto): Promise<void> {
    try {
      const payload = {
        dia: schedule.dia.toLowerCase().trim(),
        turno: schedule.turno.toLowerCase().trim(),
        sectores: schedule.sectores.filter((s) => s && s.trim() !== ''),
      };
      const response = await fetch(`${this.baseUrl}/horarios_ciudadanos/${id}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`Error al actualizar el horario ciudadano.`);
    } catch (error) {
      console.error('Error al actualizar el horario ciudadano:', error);
      throw error;
    }
  }

  async deleteCitizenSchedule(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/horarios_ciudadanos/${id}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: false }),
      });
      if (!response.ok) throw new Error('Error al eliminar el horario ciudadano');
    } catch (error) {
      console.error('Error al eliminar horario ciudadano:', error);
      throw error;
    }
  }

  async createSchedule(schedule: CreateScheduleDto): Promise<{ name: string }> {
    try {
      const payload = {
        camion: schedule.camion,
        culminado: schedule.culminado ?? false,
        activo: schedule.activo ?? true,
        dia: schedule.dia.toLowerCase().trim(),
        turno: schedule.turno,
        ruta: schedule.ruta,
        sector: schedule.sector,
        description: schedule.description?.trim() || '',
      };
      const response = await fetch(`${this.baseUrl}/horarios.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`Error al crear el horario.`);
      return await response.json();
    } catch (error) {
      console.error('Error al guardar el horario:', error);
      throw error;
    }
  }

  async updateSchedule(id: string, schedule: CreateScheduleDto): Promise<void> {
    try {
      const payload = {
        camion: schedule.camion,
        dia: schedule.dia.toLowerCase().trim(),
        turno: schedule.turno,
        ruta: schedule.ruta,
        sector: schedule.sector,
        description: schedule.description?.trim() || '',
      };
      const response = await fetch(`${this.baseUrl}/horarios/${id}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`Error al actualizar el horario.`);
    } catch (error) {
      console.error('Error al actualizar el horario:', error);
      throw error;
    }
  }

  async deleteSchedules(ids: string[]): Promise<void> {
    try {
      const validIds = ids.filter((id) => !!id);
      if (validIds.length === 0) throw new Error('No se identificaron los horarios.');
      const payload: Record<string, boolean> = {};
      validIds.forEach((id) => {
        payload[`horarios/${id}/activo`] = false;
      });
      const response = await fetch(`${this.baseUrl}/.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`Error al eliminar.`);
    } catch (error) {
      console.error('Error al eliminar:', error);
      throw error;
    }
  }
}
