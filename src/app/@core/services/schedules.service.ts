import { Injectable } from '@angular/core';

export interface ScheduleItem {
  id?: string;
  camion: string;
  culminado: boolean;
  dia: string;
  turno: string;
  ruta: string;
  sector: string;
}

export interface CreateScheduleDto {
  camion: string;
  dia: string;
  turno: string;
  ruta: string;
  sector: string;
  culminado?: boolean;
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

      return Object.keys(data).map((key) => ({
        id: key,
        ...data[key],
      }));
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

  async createSchedule(schedule: CreateScheduleDto): Promise<{ name: string }> {
    try {
      const payload: Omit<ScheduleItem, 'id'> = {
        camion: schedule.camion,
        culminado: schedule.culminado ?? false,
        dia: schedule.dia.toLowerCase().trim(),
        turno: schedule.turno,
        ruta: schedule.ruta,
        sector: schedule.sector,
      };

      const response = await fetch(`${this.baseUrl}/horarios.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Error al crear el horario. Estado: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error al guardar el horario:', error);
      throw error;
    }
  }
}
