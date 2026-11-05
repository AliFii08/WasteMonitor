import {
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
  signal,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  SchedulesService,
  CitizenScheduleItem,
} from '../../../../@core/services/schedules.service';

@Component({
  selector: 'app-create-citizen-schedule',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-citizen-schedule.html',
  styleUrl: './create-citizen-schedule.scss',
})
export class CreateCitizenScheduleComponent implements OnChanges {
  private fb = inject(FormBuilder);
  private schedulesService = inject(SchedulesService);

  @Input() set isOpen(value: boolean) {
    this.isVisible.set(value);
    if (value) {
      this.populateForm();
    }
  }
  @Input() schedule: CitizenScheduleItem | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() scheduleCreated = new EventEmitter<void>();

  readonly isVisible = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly weekDays = [
    { label: 'Lunes', value: 'lunes' },
    { label: 'Martes', value: 'martes' },
    { label: 'Miércoles', value: 'miercoles' },
    { label: 'Jueves', value: 'jueves' },
    { label: 'Viernes', value: 'viernes' },
    { label: 'Sábado', value: 'sabado' },
    { label: 'Domingo', value: 'domingo' },
  ];

  readonly turnoSelect = [
    { label: 'Turno Matutino', value: 'diurno' },
    { label: 'Turno Nocturno', value: 'nocturno' },
  ];

  readonly availableSectors = [
    'Urb. San Jacinto',
    'Urb. La Trinidad',
    'Sector Ziruma',
    'Sector El Naranjal',
    'Sector La Piedra',
  ];

  citizenForm: FormGroup = this.fb.group({
    dia: ['', Validators.required],
    turno: ['', Validators.required],
    sectores: this.fb.array([], this.minSelectedCheckboxes(1)),
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['schedule'] && this.isVisible()) {
      this.populateForm();
    }
  }

  private populateForm(): void {
    const formArray = this.citizenForm.get('sectores') as FormArray;
    formArray.clear();

    const currentSectors = this.schedule?.sectores || [];
    this.availableSectors.forEach((sec) => {
      const isChecked = currentSectors.includes(sec);
      formArray.push(this.fb.control(isChecked));
    });

    if (this.schedule) {
      this.citizenForm.patchValue({
        dia: this.schedule.dia?.toLowerCase().trim() || '',
        turno: this.schedule.turno?.toLowerCase().trim() || '',
      });
    } else {
      this.citizenForm.reset();
      // Reiniciar checkboxes en falso
      this.availableSectors.forEach(() => {
        formArray.push(this.fb.control(false));
      });
    }
  }

  get sectoresFormArray(): FormArray {
    return this.citizenForm.get('sectores') as FormArray;
  }

  private minSelectedCheckboxes(min = 1) {
    return (formArray: any) => {
      const totalSelected = formArray.controls
        .map((control: any) => control.value)
        .reduce((prev: number, next: boolean) => (next ? prev + 1 : prev), 0);
      return totalSelected >= min ? null : { required: true };
    };
  }

  closeModal(): void {
    this.citizenForm.reset();
    this.errorMessage.set(null);
    this.close.emit();
  }

  async onSubmit(): Promise<void> {
    if (this.citizenForm.invalid) {
      this.citizenForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const val = this.citizenForm.value;
      const sectores: string[] = [];
      val.sectores.forEach((checked: boolean, index: number) => {
        if (checked) {
          sectores.push(this.availableSectors[index]);
        }
      });

      if (this.schedule && this.schedule.id) {
        await this.schedulesService.updateCitizenSchedule(this.schedule.id, {
          dia: val.dia,
          turno: val.turno,
          sectores,
        });
      } else {
        await this.schedulesService.createCitizenSchedule({
          dia: val.dia,
          turno: val.turno,
          sectores,
        });
      }

      this.isLoading.set(false);
      this.scheduleCreated.emit();
      this.closeModal();
    } catch (err: any) {
      this.isLoading.set(false);
      this.errorMessage.set(err?.message || 'Error al guardar el horario ciudadano.');
    }
  }
}
