import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { ScheduleItem } from '../../../../@core/services/schedules.service';

@Component({
  selector: 'app-view-schedule-modal',
  standalone: true,
  templateUrl: './view-schedule-modal.html',
  styleUrl: './view-schedule-modal.scss',
})
export class ViewScheduleModal {
  @Input() set isOpen(value: boolean) {
    this.isVisible.set(value);
  }

  @Input() schedule: ScheduleItem | null = null;
  @Input() isCitizen = false;
  @Output() close = new EventEmitter<void>();

  readonly isVisible = signal(false);

  get description(): string {
    return this.schedule?.description?.trim() || '';
  }

  get shiftLabel(): string {
    const shift = this.schedule?.turno?.toLowerCase() || '';
    return `Turno ${shift.includes('nocturno') ? 'nocturno' : 'diurno'}`;
  }

  get shiftIcon(): string {
    return this.schedule?.turno?.toLowerCase().includes('nocturno') ? 'pi-moon' : 'pi-sun';
  }

  closeModal(): void {
    this.close.emit();
  }
}
