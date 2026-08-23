import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { Vehicle, VEHICLE_TYPES, VehicleType } from '../../../../@core/interfaces/vehicle.model';
import { VehicleForm } from '../../../../@core/interfaces/forms/form_vehicle';

@Component({
  selector: 'app-update-vehicle',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DialogModule, ButtonModule, InputTextModule],
  templateUrl: './update-vehicle.html',
  styleUrl: './update-vehicle.scss',
})
export class UpdateVehicleComponent implements OnChanges {
  private fb = inject(FormBuilder);

  @Input() visible = false;
  @Input() vehicle: Vehicle | null = null;
  @Input() existingPlates: string[] = [];

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() updateVehicle = new EventEmitter<Vehicle>();

  vehicleTypes = [...VEHICLE_TYPES];
  formError = '';

  vehicleForm: FormGroup<VehicleForm> = this.fb.group({
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
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['vehicle'] || changes['visible']) {
      this.resetFormState();
    }
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

  onCancel(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    this.formError = '';
  }

  onUpdate(): void {
    this.formError = '';
    if (!this.vehicle) {
      return;
    }

    if (this.vehicleForm.invalid) {
      this.vehicleForm.markAllAsTouched();
      return;
    }

    const plate = this.plateControl.value.trim().toUpperCase();
    const type = this.typeControl.value as VehicleType;
    const weight = Number(this.weightControl.value);

    if (this.isDuplicatedPlate(plate)) {
      this.formError = 'La placa ya se encuentra registrada.';
      return;
    }

    this.updateVehicle.emit({
      id: this.vehicle.id,
      type,
      weight,
      plate,
    });

    this.onCancel();
  }

  private isDuplicatedPlate(plate: string): boolean {
    if (this.vehicle?.plate.toLowerCase() === plate.toLowerCase()) {
      return false;
    }

    return this.existingPlates.some(existingPlate => existingPlate.toLowerCase() === plate.toLowerCase());
  }

  private resetFormState(): void {
    this.formError = '';

    if (!this.vehicle) {
      this.vehicleForm.reset({
        type: '',
        weight: null,
        plate: '',
      });
      return;
    }

    this.vehicleForm.reset({
      type: this.vehicle.type,
      weight: this.vehicle.weight,
      plate: this.vehicle.plate,
    });
  }
}
