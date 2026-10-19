import { Component, inject, signal } from '@angular/core';
import { SchedulesService } from '../../@core/services/schedules.service';
import { CreateSchesulesComponent } from './component/create-schesules-component/create-schesules-component';

@Component({
  selector: 'app-schedules',
  standalone: true,
  imports: [CreateSchesulesComponent],
  templateUrl: './schedules.html',
  styleUrl: './schedules.scss',
})
export class Schedules {
  private schedulesService = inject(SchedulesService);

  readonly isCreateModalOpen = signal<boolean>(false);

  readonly weekDays = [
    { number: '01', name: 'Lunes', key: 'monday' },
    { number: '02', name: 'Martes', key: 'tuesday' },
    { number: '03', name: 'Miércoles', key: 'wednesday' },
    { number: '04', name: 'Jueves', key: 'thursday' },
    { number: '05', name: 'Viernes', key: 'friday' },
    { number: '06', name: 'Sábado', key: 'saturday' },
    { number: '07', name: 'Domingo', key: 'sunday' },
  ];

  openCreateModal(): void {
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  onScheduleCreated(): void {
    // Lógica para recargar la lista/grid de horarios
  }
}
