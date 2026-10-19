import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SchedulesService } from '../../../../@core/services/schedules.service';
import { VehiculoService } from '../../../../@core/services/vehiculos.service';
import { Vehicle } from '../../../../@core/interfaces/vehicle.model';

@Component({
  selector: 'app-create-schesules-component',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-schesules-component.html',
  styleUrl: './create-schesules-component.scss',
})
export class CreateSchesulesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private schedulesService = inject(SchedulesService);
  private vehiculoService = inject(VehiculoService);

  @Input() set isOpen(value: boolean) {
    this.isVisible.set(value);
  }
  @Output() close = new EventEmitter<void>();
  @Output() scheduleCreated = new EventEmitter<void>();

  readonly isVisible = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly isLoadingVehicles = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly vehicles = signal<Vehicle[]>([]);

  readonly weekDays = [
    { label: 'Lunes', value: 'monday' },
    { label: 'Martes', value: 'tuesday' },
    { label: 'Miércoles', value: 'wednesday' },
    { label: 'Jueves', value: 'thursday' },
    { label: 'Viernes', value: 'friday' },
    { label: 'Sábado', value: 'saturday' },
    { label: 'Domingo', value: 'sunday' },
  ];

  readonly sectorSelect = [
    { label: 'Urb. San Jacinto', value: 'Urb. San Jacinto' },
    { label: 'Urb. La Trinidad', value: 'Urb. La Trinidad' },
    { label: 'Sector Ziruma', value: 'Sector Ziruma' },
    { label: 'Sector El Naranjal', value: 'Sector El Naranjal' },
    { label: 'Sector La Piedra', value: 'Sector La Piedra' },
  ];

  readonly turnoSelect = [
    { label: 'Diurno (6am - 2pm)', value: 'diurno' },
    { label: 'Nocturno (7pm - 5am)', value: 'nocturno' },
  ];

  scheduleForm: FormGroup = this.fb.group({
    day: ['', Validators.required],
    sector: ['', Validators.required],
    truck: ['', Validators.required],
    turno: ['', Validators.required],
    description: [''],
  });

  async ngOnInit(): Promise<void> {
    try {
      this.isLoadingVehicles.set(true);
      const data = await this.vehiculoService.getVehicles();
      this.vehicles.set(data.filter((v) => v.activo !== false));
    } catch (err) {
      console.error('Error al obtener vehículos:', err);
    } finally {
      this.isLoadingVehicles.set(false);
    }
  }

  closeModal(): void {
    this.scheduleForm.reset();
    this.errorMessage.set(null);
    this.close.emit();
  }

  async onSubmit(): Promise<void> {
    if (this.scheduleForm.invalid) {
      this.scheduleForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const formData = this.scheduleForm.value;
      const selectedVehicle = this.vehicles().find((v) => v.id === formData.truck);

      await this.schedulesService.createSchedule({
        camion: formData.truck,
        dia: formData.day,
        turno: formData.turno,
        ruta: selectedVehicle?.route || 'Ruta General',
        sector: formData.sector,
      });

      this.isLoading.set(false);
      this.scheduleCreated.emit();
      this.closeModal();
    } catch (err: any) {
      this.isLoading.set(false);
      this.errorMessage.set(err?.message || 'Ocurrió un error al guardar el horario.');
    }
  }
}
