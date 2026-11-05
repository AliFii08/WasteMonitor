import { Component, OnInit, inject, signal } from '@angular/core';
import {
  SchedulesService,
  ScheduleItem,
  CitizenScheduleItem,
} from '../../@core/services/schedules.service';
import { AuthService } from '../../@core/services/auth.service';
import { CreateSchesulesComponent } from './component/create-schesules-component/create-schesules-component';
import { UpdateSchesulesComponent } from './component/update-schesules-component/update-schesules-component';
import { DeleteSchesulesComponent } from './component/delete-schesules-component/delete-schesules-component';
import { ViewScheduleModal } from './component/view-schedule-modal/view-schedule-modal';
import { CreateCitizenScheduleComponent } from './component/create-citizen-schedule/create-citizen-schedule';

interface WeekDay {
  number: string;
  name: string;
  key: string;
  dateStr: string;
}

@Component({
  selector: 'app-schedules',
  standalone: true,
  imports: [
    CreateSchesulesComponent,
    UpdateSchesulesComponent,
    DeleteSchesulesComponent,
    ViewScheduleModal,
    CreateCitizenScheduleComponent,
  ],
  templateUrl: './schedules.html',
  styleUrl: './schedules.scss',
})
export class Schedules implements OnInit {
  private schedulesService = inject(SchedulesService);
  private authService = inject(AuthService);

  get isAdmin(): boolean {
    return this.authService.hasRole(['admin']);
  }

  // Permite al admin alternar entre su vista y la de ciudadano
  readonly previewAsCitizen = signal<boolean>(false);

  get isCitizen(): boolean {
    if (this.isAdmin && this.previewAsCitizen()) return true;
    const role = String(this.authService.getCurrentRole()).toLowerCase();
    const employeeRoles = ['admin', 'supervisor', 'crew', 'conductor', 'mecanico'];
    return !employeeRoles.includes(role);
  }

  toggleCitizenPreview(): void {
    this.previewAsCitizen.update((v) => !v);
  }

  readonly isCreateModalOpen = signal<boolean>(false);
  readonly isCreateCitizenModalOpen = signal<boolean>(false);
  readonly isUpdateModalOpen = signal<boolean>(false);
  readonly isDeleteModalOpen = signal<boolean>(false);
  readonly isViewModalOpen = signal<boolean>(false);

  readonly selectedSchedule = signal<ScheduleItem | null>(null);
  readonly selectedCitizenSchedule = signal<CitizenScheduleItem | null>(null);

  readonly checkedSchedules = signal<ScheduleItem[]>([]);
  readonly schedulesToDelete = signal<ScheduleItem[]>([]);
  readonly schedulesMap = signal<Record<string, ScheduleItem[]>>({});
  readonly citizenSchedulesMap = signal<Record<string, CitizenScheduleItem[]>>({});
  readonly journeyStatusMap = signal<Record<string, 'active' | 'finished'>>({});

  readonly weekDays = signal<WeekDay[]>([]);

  ngOnInit(): void {
    this.generateWeekDays();
    this.loadSchedules();
  }

  generateWeekDays(offsetWeeks: number = 0): void {
    const now = new Date();
    now.setDate(now.getDate() + offsetWeeks * 7);
    const currentDayOfWeek = now.getDay();
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
      return { number: dayNum, name: d.name, key: d.key, dateStr: `${year}-${month}-${dayNum}` };
    });

    this.weekDays.set(computedDays);
  }

  async loadSchedules(): Promise<void> {
    try {
      const [items, citizenItems, informesData] = await Promise.all([
        this.schedulesService.getHorarios(),
        this.schedulesService.getCitizenSchedules(),
        this.schedulesService.getActiveJourneys(),
      ]);

      const map: Record<string, ScheduleItem[]> = {};
      for (const item of items) {
        if (item.activo === false) continue;
        const normalizedDay = item.dia?.toLowerCase().trim();
        if (normalizedDay) {
          if (!map[normalizedDay]) map[normalizedDay] = [];
          map[normalizedDay].push(item);
        }
      }
      this.schedulesMap.set(map);

      const citizenMap: Record<string, CitizenScheduleItem[]> = {};
      for (const cItem of citizenItems) {
        if (cItem.activo === false) continue;
        const dayKey = cItem.dia?.toLowerCase().trim();
        if (dayKey) {
          if (!citizenMap[dayKey]) citizenMap[dayKey] = [];
          citizenMap[dayKey].push(cItem);
        }
      }
      this.citizenSchedulesMap.set(citizenMap);

      const activeScheduleIds = new Set(
        Object.values(map)
          .flat()
          .map((item) => item.id)
          .filter((id): id is string => !!id),
      );
      this.checkedSchedules.update((checked) =>
        checked.filter((item) => !!item.id && activeScheduleIds.has(item.id)),
      );

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

  getCitizenDiurnos(dayKey: string): CitizenScheduleItem[] {
    const list = this.citizenSchedulesMap()[dayKey] || [];
    return list.filter((i) => i.turno?.toLowerCase().includes('diurno'));
  }

  getCitizenNocturnos(dayKey: string): CitizenScheduleItem[] {
    const list = this.citizenSchedulesMap()[dayKey] || [];
    return list.filter((i) => i.turno?.toLowerCase().includes('nocturno'));
  }

  openCreateModal(): void {
    if (!this.isAdmin) return;
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  async onScheduleCreated(): Promise<void> {
    this.closeCreateModal();
    await this.loadSchedules();
  }

  openCreateCitizenModal(): void {
    if (!this.isAdmin) return;
    this.selectedCitizenSchedule.set(null);
    this.isCreateCitizenModalOpen.set(true);
  }

  openUpdateCitizenModal(item: CitizenScheduleItem): void {
    if (!this.isAdmin) return;
    this.selectedCitizenSchedule.set(item);
    this.isCreateCitizenModalOpen.set(true);
  }

  async deleteCitizenScheduleItem(item: CitizenScheduleItem): Promise<void> {
    if (!this.isAdmin || !item.id) return;
    if (confirm('¿Deseas eliminar este bloque de horario ciudadano?')) {
      await this.schedulesService.deleteCitizenSchedule(item.id);
      await this.loadSchedules();
    }
  }

  closeCreateCitizenModal(): void {
    this.isCreateCitizenModalOpen.set(false);
    this.selectedCitizenSchedule.set(null);
  }

  async onCitizenScheduleCreated(): Promise<void> {
    this.closeCreateCitizenModal();
    await this.loadSchedules();
  }

  openUpdateModal(item: ScheduleItem): void {
    if (!this.isAdmin) return;
    this.selectedSchedule.set(item);
    this.isUpdateModalOpen.set(true);
  }

  openViewModal(item: ScheduleItem): void {
    this.selectedSchedule.set(item);
    this.isViewModalOpen.set(true);
  }

  openViewModalFromKeyboard(item: ScheduleItem, event: Event): void {
    if (!(event instanceof KeyboardEvent)) return;
    if (event.target !== event.currentTarget) return;
    if (event.key === ' ') event.preventDefault();
    this.openViewModal(item);
  }

  closeViewModal(): void {
    this.isViewModalOpen.set(false);
    this.selectedSchedule.set(null);
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

  getSelectableSchedulesForDay(dayKey: string): ScheduleItem[] {
    return (this.schedulesMap()[dayKey] || []).filter((item) => !!item.id);
  }

  getSelectableSchedules(): ScheduleItem[] {
    return Object.values(this.schedulesMap())
      .flat()
      .filter((item) => !!item.id);
  }

  areDaySchedulesChecked(dayKey: string): boolean {
    const schedules = this.getSelectableSchedulesForDay(dayKey);
    return schedules.length > 0 && schedules.every((item) => this.isChecked(item));
  }

  areSomeDaySchedulesChecked(dayKey: string): boolean {
    const schedules = this.getSelectableSchedulesForDay(dayKey);
    const checkedCount = schedules.filter((item) => this.isChecked(item)).length;
    return checkedCount > 0 && checkedCount < schedules.length;
  }

  areAllSchedulesChecked(): boolean {
    const schedules = this.getSelectableSchedules();
    return schedules.length > 0 && schedules.every((item) => this.isChecked(item));
  }

  areSomeSchedulesChecked(): boolean {
    const schedules = this.getSelectableSchedules();
    const checkedCount = schedules.filter((item) => this.isChecked(item)).length;
    return checkedCount > 0 && checkedCount < schedules.length;
  }

  toggleDaySchedules(dayKey: string, checked: boolean): void {
    if (!this.isAdmin) return;
    this.setSchedulesChecked(this.getSelectableSchedulesForDay(dayKey), checked);
  }

  toggleAllSchedules(checked: boolean): void {
    if (!this.isAdmin) return;
    this.setSchedulesChecked(this.getSelectableSchedules(), checked);
  }

  private setSchedulesChecked(schedules: ScheduleItem[], checked: boolean): void {
    if (!this.isAdmin) return;
    const scheduleIds = new Set(
      schedules.map((item) => item.id).filter((id): id is string => !!id),
    );
    const current = this.checkedSchedules().filter((item) => !item.id || !scheduleIds.has(item.id));
    this.checkedSchedules.set(checked ? [...current, ...schedules] : current);
  }

  // --- Eliminación ---

  openDeleteModal(item: ScheduleItem): void {
    if (!this.isAdmin) return;
    this.schedulesToDelete.set([item]);
    this.isDeleteModalOpen.set(true);
  }

  openDeleteCheckedModal(): void {
    if (!this.isAdmin) return;
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
