import { Component, OnInit, inject, signal } from '@angular/core';
import { SchedulesService, ScheduleItem } from '../../@core/services/schedules.service';
import { CreateSchesulesComponent } from './component/create-schesules-component/create-schesules-component';
import { UpdateSchesulesComponent } from './component/update-schesules-component/update-schesules-component';
import { DeleteSchesulesComponent } from './component/delete-schesules-component/delete-schesules-component';

interface WeekDay {
  number: string;
  name: string;
  key: string;
  dateStr: string; // Formato YYYY-MM-DD
}

@Component({
  selector: 'app-schedules',
  standalone: true,
  imports: [CreateSchesulesComponent, UpdateSchesulesComponent, DeleteSchesulesComponent],
  templateUrl: './schedules.html',
  styleUrl: './schedules.scss',
})
export class Schedules implements OnInit {
  private schedulesService = inject(SchedulesService);

  readonly isCreateModalOpen = signal<boolean>(false);
  readonly isUpdateModalOpen = signal<boolean>(false);
  readonly isDeleteModalOpen = signal<boolean>(false);
  readonly selectedSchedule = signal<ScheduleItem | null>(null);
  // Horarios marcados con el check para eliminación múltiple
  readonly checkedSchedules = signal<ScheduleItem[]>([]);
  // Qué se envía al modal de eliminar (uno o varios)
  readonly schedulesToDelete = signal<ScheduleItem[]>([]);
  readonly schedulesMap = signal<Record<string, ScheduleItem[]>>({});
  readonly journeyStatusMap = signal<Record<string, 'active' | 'finished'>>({});

  // Señal para almacenar la semana actual calculada dinámicamente
  readonly weekDays = signal<WeekDay[]>([]);

  // Opcional: Para controlar si el usuario quiere navegar entre semanas (si deseas agregar botones de anterior/siguiente)
  private currentWeekOffset = 0;

  ngOnInit(): void {
    this.generateWeekDays();
    this.loadSchedules();
  }

  /**
   * Calcula de forma dinámica los días de la semana (Lunes a Domingo)
   * basándose en la fecha actual y el desplazamiento de semanas.
   */
  generateWeekDays(offsetWeeks: number = 0): void {
    const now = new Date();

    // Ajustar la fecha según el desplazamiento de semanas
    now.setDate(now.getDate() + offsetWeeks * 7);

    // Obtener el día de la semana actual (0 = Domingo, 1 = Lunes, ..., 6 = Sábado)
    const currentDayOfWeek = now.getDay();

    // Calcular cuántos días restar para llegar al lunes de esta semana
    // Si es domingo (0), el lunes anterior fue hace 6 días. Si es lunes (1), es 0 días, etc.
    const distanceToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;

    const monday = new Date(now);
    monday.setDate(now.getDate() + distanceToMonday);

    const dayNames = [
      { name: 'Lunes', key: 'lunes' },
      { name: 'Martes', key: 'martes' },
      { name: 'Miércoles', key: 'miercoles' },
      { name: 'Jueves', key: 'jueves' },
      { name: 'Viernes', key: 'viernes' },
      { name: 'Sábado', key: 'sabado' },
      { name: 'Domingo', key: 'domingo' },
    ];

    const computedDays: WeekDay[] = dayNames.map((d, index) => {
      const targetDate = new Date(monday);
      targetDate.setDate(monday.getDate() + index);

      const year = targetDate.getFullYear();
      const month = String(targetDate.getMonth() + 1).padStart(2, '0');
      const dayNum = String(targetDate.getDate()).padStart(2, '0');

      return {
        number: dayNum,
        name: d.name,
        key: d.key,
        dateStr: `${year}-${month}-${dayNum}`,
      };
    });

    this.weekDays.set(computedDays);
  }

  async loadSchedules(): Promise<void> {
    try {
      const [items, informesData] = await Promise.all([
        this.schedulesService.getHorarios(),
        this.schedulesService.getActiveJourneys(),
      ]);

      const map: Record<string, ScheduleItem[]> = {};
      for (const item of items) {
        // Eliminación lógica: se ocultan solo los marcados como activo === false.
        // Los horarios antiguos (sin el campo) se siguen mostrando.
        if (item.activo === false) continue;

        const normalizedDay = item.dia?.toLowerCase().trim();
        if (normalizedDay) {
          if (!map[normalizedDay]) {
            map[normalizedDay] = [];
          }
          map[normalizedDay].push(item);
        }
      }
      this.schedulesMap.set(map);

      // Mapear estados filtrando por la fecha exacta del informe
      const statusMap: Record<string, 'active' | 'finished'> = {};

      Object.values(informesData).forEach((informe: any) => {
        if (!informe || !informe.camion) return;

        const fechaRaw = informe.creadoEl || informe.finalizadoEl;
        if (!fechaRaw) return;
        const informeDate = new Date(fechaRaw).toISOString().split('T')[0];

        const estado = String(informe.estado || '').toLowerCase();
        const isFinished =
          informe.activo === false && (estado === 'finalizado' || estado === 'firmado');
        const isActive = informe.activo === true;

        const keys = [
          `${informeDate}_${informe.camion}`,
          `${informeDate}_${informe.camion}-${informe.ruta}`,
        ];

        keys.forEach((key) => {
          if (isActive) {
            statusMap[key] = 'active';
          } else if (isFinished && statusMap[key] !== 'active') {
            statusMap[key] = 'finished';
          }
        });
      });

      this.journeyStatusMap.set(statusMap);
    } catch (error) {
      console.error('Error al cargar la programación de horarios:', error);
    }
  }

  getJourneyStatus(item: ScheduleItem, dayDateStr: string): 'active' | 'finished' | null {
    const map = this.journeyStatusMap();
    return (
      map[`${dayDateStr}_${item.camion}-${item.ruta}`] ||
      map[`${dayDateStr}_${item.camion}`] ||
      null
    );
  }

  getDiurnos(dayKey: string): ScheduleItem[] {
    const list = this.schedulesMap()[dayKey] || [];
    return list.filter((i) => i.turno?.toLowerCase().includes('diurno'));
  }

  getNocturnos(dayKey: string): ScheduleItem[] {
    const list = this.schedulesMap()[dayKey] || [];
    return list.filter((i) => i.turno?.toLowerCase().includes('nocturno'));
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

  openUpdateModal(item: ScheduleItem): void {
    this.selectedSchedule.set(item);
    this.isUpdateModalOpen.set(true);
  }

  closeUpdateModal(): void {
    this.isUpdateModalOpen.set(false);
    this.selectedSchedule.set(null);
  }

  async onScheduleUpdated(): Promise<void> {
    this.closeUpdateModal();
    await this.loadSchedules();
  }

  // --- Selección múltiple (check) ---

  isChecked(item: ScheduleItem): boolean {
    return this.checkedSchedules().some((c) => c.id === item.id);
  }

  toggleCheck(item: ScheduleItem): void {
    if (!item.id) return;
    const current = this.checkedSchedules();
    const exists = current.some((c) => c.id === item.id);
    this.checkedSchedules.set(
      exists ? current.filter((c) => c.id !== item.id) : [...current, item],
    );
  }

  // --- Eliminación (individual y múltiple) ---

  openDeleteModal(item: ScheduleItem): void {
    this.schedulesToDelete.set([item]);
    this.isDeleteModalOpen.set(true);
  }

  openDeleteCheckedModal(): void {
    const checked = this.checkedSchedules();
    if (checked.length === 0) return;
    this.schedulesToDelete.set(checked);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.schedulesToDelete.set([]);
  }

  async onSchedulesDeleted(): Promise<void> {
    this.closeDeleteModal();
    this.checkedSchedules.set([]);
    await this.loadSchedules();
  }
}
