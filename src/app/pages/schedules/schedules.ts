import { Component, OnInit, inject, signal } from '@angular/core';
import { SchedulesService, ScheduleItem } from '../../@core/services/schedules.service';
import { CreateSchesulesComponent } from './component/create-schesules-component/create-schesules-component';

@Component({
  selector: 'app-schedules',
  standalone: true,
  imports: [CreateSchesulesComponent],
  templateUrl: './schedules.html',
  styleUrl: './schedules.scss',
})
export class Schedules implements OnInit {
  private schedulesService = inject(SchedulesService);

  readonly isCreateModalOpen = signal<boolean>(false);
  readonly schedulesMap = signal<Record<string, ScheduleItem[]>>({});
  readonly activeJourneysMap = signal<Record<string, boolean>>({});

  readonly weekDays = [
    { number: '01', name: 'Lunes', key: 'lunes' },
    { number: '02', name: 'Martes', key: 'martes' },
    { number: '03', name: 'Miércoles', key: 'miercoles' },
    { number: '04', name: 'Jueves', key: 'jueves' },
    { number: '05', name: 'Viernes', key: 'viernes' },
    { number: '06', name: 'Sábado', key: 'sabado' },
    { number: '07', name: 'Domingo', key: 'domingo' },
  ];

  ngOnInit(): void {
    this.loadSchedules();
  }

  async loadSchedules(): Promise<void> {
    try {
      const [items, informesData] = await Promise.all([
        this.schedulesService.getHorarios(),
        this.schedulesService.getActiveJourneys(),
      ]);

      const map: Record<string, ScheduleItem[]> = {};
      for (const item of items) {
        const normalizedDay = item.dia?.toLowerCase().trim();
        if (normalizedDay) {
          if (!map[normalizedDay]) {
            map[normalizedDay] = [];
          }
          map[normalizedDay].push(item);
        }
      }
      this.schedulesMap.set(map);

      // Mapear camiones con informes activos
      const activeMap: Record<string, boolean> = {};
      Object.values(informesData).forEach((informe: any) => {
        if (informe && informe.activo === true && informe.camion) {
          activeMap[informe.camion] = true;
          if (informe.ruta) {
            activeMap[`${informe.camion}-${informe.ruta}`] = true;
          }
        }
      });
      this.activeJourneysMap.set(activeMap);
    } catch (error) {
      console.error('Error al cargar la programación de horarios:', error);
    }
  }

  isJourneyActive(item: ScheduleItem): boolean {
    const activeMap = this.activeJourneysMap();
    return !!(activeMap[`${item.camion}-${item.ruta}`] || activeMap[item.camion]);
  }

  getDiurnos(dayKey: string): ScheduleItem[] {
    const list = this.schedulesMap()[dayKey] || [];
    return list.filter(i => i.turno?.toLowerCase().includes('diurno'));
  }

  getNocturnos(dayKey: string): ScheduleItem[] {
    const list = this.schedulesMap()[dayKey] || [];
    return list.filter(i => i.turno?.toLowerCase().includes('nocturno'));
  }

  openCreateModal(): void {
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  async onScheduleCreated(): Promise<void> {
    this.closeCreateModal();
    await this.loadSchedules();
  }
}
