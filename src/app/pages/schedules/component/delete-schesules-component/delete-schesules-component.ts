import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SchedulesService, ScheduleItem } from '../../../../@core/services/schedules.service';

@Component({
  selector: 'app-delete-schesules-component',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './delete-schesules-component.html',
  styleUrl: './delete-schesules-component.scss',
})
export class DeleteSchesulesComponent {
  private schedulesService = inject(SchedulesService);

  @Input() set isOpen(value: boolean) {
    this.isVisible.set(value);
  }

  // Horario u horarios a eliminar (acepta uno o varios para el borrado múltiple)
  @Input() schedules: ScheduleItem[] = [];

  @Output() close = new EventEmitter<void>();
  @Output() schedulesDeleted = new EventEmitter<void>();

  readonly isVisible = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  get isMultiple(): boolean {
    return this.schedules.length > 1;
  }

  closeModal(): void {
    if (this.isLoading()) return;
    this.errorMessage.set(null);
    this.close.emit();
  }

  async confirmDelete(): Promise<void> {
    const ids = this.schedules.map((s) => s.id).filter((id): id is string => !!id);

    if (ids.length === 0) {
      this.errorMessage.set('No se identificaron los horarios a eliminar.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      await this.schedulesService.deleteSchedules(ids);

      this.isLoading.set(false);
      this.schedulesDeleted.emit();
      this.closeModal();
    } catch (err: any) {
      this.isLoading.set(false);
      this.errorMessage.set(err?.message || 'Ocurrió un error al eliminar los horarios.');
    }
  }
}
