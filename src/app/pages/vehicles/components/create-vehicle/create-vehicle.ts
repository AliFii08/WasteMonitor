import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { Vehicle, VEHICLE_TYPES, VehicleType } from '../../../../@core/interfaces/vehicle.model';

export interface RouteOption {
  id: string;
  nombreRuta?: string;
}

@Component({
  selector: 'app-create-vehicle',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DialogModule, ButtonModule, InputTextModule],
  templateUrl: './create-vehicle.html',
  styleUrl: './create-vehicle.scss',
})
export class CreateVehicleComponent implements OnChanges {
  private fb = inject(FormBuilder);

  @Input() visible = false;
  @Input() existingPlates: string[] = [];
  @Input() routes: RouteOption[] = []; // Lista de rutas para el select

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() saveVehicle = new EventEmitter<Omit<Vehicle, 'id'>>();

  vehicleTypes = [...VEHICLE_TYPES];
  formError = '';

  vehicleForm = this.fb.group({
    type: new FormControl<VehicleType | ''>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    weight: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1)],
    }),
    plate: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(15)],
    }),
    route: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']) {
      this.resetFormState();
    }
  }

  get title(): string {
    return 'Registrar vehículo';
  }

  get typeControl() {
    return this.vehicleForm.controls.type;
  }

  get weightControl() {
    return this.vehicleForm.controls.weight;
  }

  get plateControl() {
    return this.vehicleForm.controls.plate;
  }

  get routeControl() {
    return this.vehicleForm.controls.route;
  }

  onCancel(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    this.formError = '';
  }

  onSave(): void {
    this.formError = '';
    if (this.vehicleForm.invalid) {
      this.vehicleForm.markAllAsTouched();
      return;
    }

    const plate = this.plateControl.value.trim().toUpperCase();
    const type = this.typeControl.value as VehicleType;
    const weight = Number(this.weightControl.value);
    const route = this.routeControl.value;

    if (this.isDuplicatedPlate(plate)) {
      this.formError = 'La placa ya se encuentra registrada.';
      return;
    }

    this.saveVehicle.emit({
      type,
      weight,
      plate,
      route,
    } as Omit<Vehicle, 'id'>);

    this.onCancel();
  }

  private isDuplicatedPlate(plate: string): boolean {
    return this.existingPlates.some(
      (existingPlate) => existingPlate.toLowerCase() === plate.toLowerCase(),
    );
  }

  private resetFormState(): void {
    this.formError = '';

    this.vehicleForm.reset({
      type: '',
      weight: null,
      plate: '',
      route: '',
    });
  }
}
