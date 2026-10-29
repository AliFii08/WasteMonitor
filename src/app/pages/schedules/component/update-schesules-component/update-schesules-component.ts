import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SchedulesService, ScheduleItem } from '../../../../@core/services/schedules.service';
import { VehiculoService } from '../../../../@core/services/vehiculos.service';
import { Vehicle } from '../../../../@core/interfaces/vehicle.model';

@Component({
  selector: 'app-update-schesules-component',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './update-schesules-component.html',
  styleUrl: './update-schesules-component.scss',
})
export class UpdateSchesulesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private schedulesService = inject(SchedulesService);
  private vehiculoService = inject(VehiculoService);

  @Input() set isOpen(value: boolean) {
    this.isVisible.set(value);
    // Al abrir, precarga el formulario con los datos guardados del horario
    if (value && this._schedule) {
      this.patchForm();
    }
  }

  private _schedule: ScheduleItem | null = null;

  // Setter además de property: según el orden en que Angular aplique los
  // inputs, puede llegar isOpen antes que schedule. Cualquiera de los dos
  // que llegue último dispara el relleno del formulario.
  @Input() set schedule(value: ScheduleItem | null) {
    this._schedule = value;
    if (this.isVisible() && value) {
      this.patchForm();
    }
  }

  get schedule(): ScheduleItem | null {
    return this._schedule;
  }

  @Output() close = new EventEmitter<void>();
  @Output() scheduleUpdated = new EventEmitter<void>();

  readonly isVisible = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly isLoadingVehicles = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly vehicles = signal<Vehicle[]>([]);

  readonly weekDays = [
    { label: 'Lunes', value: 'lunes' },
    { label: 'Martes', value: 'martes' },
    { label: 'Miércoles', value: 'miercoles' },
    { label: 'Jueves', value: 'jueves' },
    { label: 'Viernes', value: 'viernes' },
    { label: 'Sábado', value: 'sabado' },
    { label: 'Domingo', value: 'domingo' },
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
  });

  async ngOnInit(): Promise<void> {
    try {
      this.isLoadingVehicles.set(true);
      const data = await this.vehiculoService.getVehicles();
      // Se incluyen también inactivos: si el horario guardado apunta a un
      // vehículo dado de baja, el select debe poder mostrarlo seleccionado.
      this.vehicles.set(data);
    } catch (err) {
      console.error('Error al obtener vehículos:', err);
    } finally {
      this.isLoadingVehicles.set(false);
    }
  }

  /**
   * Rellena los selects con los datos actuales del horario seleccionado.
   * Tolera variaciones de mayúsculas/minúsculas y valores guardados como
   * etiqueta (datos viejos) o como value.
   */
  private patchForm(): void {
    if (!this.schedule) return;

    const dia = String(this.schedule.dia || '')
      .toLowerCase()
      .trim();
    const sector = String(this.schedule.sector || '').trim();
    const camion = String(this.schedule.camion || '').trim();
    const turnoRaw = String(this.schedule.turno || '')
      .toLowerCase()
      .trim();

    const diaMatch = this.weekDays.find((d) => d.value === dia);
    const sectorMatch = this.sectorSelect.find(
      (s) => s.value === sector || s.value.toLowerCase() === sector.toLowerCase(),
    );
    const turnoMatch = this.turnoSelect.find(
      (t) => t.value === turnoRaw || turnoRaw.includes(t.value),
    );

    this.scheduleForm.patchValue({
      day: diaMatch ? diaMatch.value : dia,
      sector: sectorMatch ? sectorMatch.value : sector,
      truck: camion,
      turno: turnoMatch ? turnoMatch.value : turnoRaw,
    });
    this.errorMessage.set(null);
  }

  closeModal(): void {
    this.errorMessage.set(null);
    this.close.emit();
  }

  async onSubmit(): Promise<void> {
    if (this.scheduleForm.invalid) {
      this.scheduleForm.markAllAsTouched();
      return;
    }

    if (!this.schedule?.id) {
      this.errorMessage.set('No se identificó el horario a actualizar.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const formData = this.scheduleForm.value;
      const selectedVehicle = this.vehicles().find((v) => v.id === formData.truck);

      await this.schedulesService.updateSchedule(this.schedule.id, {
        camion: formData.truck,
        dia: formData.day,
        turno: formData.turno,
        ruta: selectedVehicle?.route || this.schedule.ruta || 'Ruta General',
        sector: formData.sector,
      });

      this.isLoading.set(false);
      this.scheduleUpdated.emit();
      this.closeModal();
    } catch (err: any) {
      this.isLoading.set(false);
      this.errorMessage.set(err?.message || 'Ocurrió un error al actualizar el horario.');
    }
  }
}
