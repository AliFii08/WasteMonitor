import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { Vehicle, VEHICLE_TYPES } from '../../@core/interfaces/vehicle.model';
import { CreateVehicleComponent } from './components/create-vehicle/create-vehicle';
import { UpdateVehicleComponent } from './components/update-vehicle/update-vehicle';

@Component({
  selector: 'app-vehicles',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    CreateVehicleComponent,
    UpdateVehicleComponent,
  ],
  templateUrl: './vehicles.html',
  styleUrl: './vehicles.scss',
})
export class Vehicles {
  vehicles: Vehicle[] = [
    { id: 'VEH-001', type: 'retroexcavadora', weight: 5, plate: 'A01BC2D' },
    { id: 'VEH-002', type: 'volteo', weight: 10, plate: 'B15DE3F' },
    { id: 'VEH-003', type: 'compactadores', weight: 20, plate: 'C21GH4I' },
  ];

  selectedVehicleType = '';
  isCreateModalOpen = false;
  isUpdateModalOpen = false;
  editingVehicle: Vehicle | null = null;
  vehicleTypes = [...VEHICLE_TYPES];

  get existingIds(): string[] {
    return this.vehicles.map(vehicle => vehicle.id);
  }

  get existingPlates(): string[] {
    return this.vehicles.map(vehicle => vehicle.plate);
  }

  openCreateModal(): void {
    this.isCreateModalOpen = true;
  }

  openEditModal(vehicle: Vehicle): void {
    this.editingVehicle = { ...vehicle };
    this.isUpdateModalOpen = true;
  }

  onCreateModalVisibleChange(isVisible: boolean): void {
    this.isCreateModalOpen = isVisible;
  }

  onUpdateModalVisibleChange(isVisible: boolean): void {
    this.isUpdateModalOpen = isVisible;
    if (!isVisible) {
      this.editingVehicle = null;
    }
  }

  onCreateVehicle(vehicleData: Omit<Vehicle, 'id'>): void {
    const nextVehicle: Vehicle = {
      ...vehicleData,
      id: this.generateNextVehicleId(),
    };

    this.vehicles = [nextVehicle, ...this.vehicles];
  }

  onUpdateVehicle(vehicle: Vehicle): void {
    this.vehicles = this.vehicles.map(currentVehicle =>
      currentVehicle.id === vehicle.id ? vehicle : currentVehicle,
    );
  }

  onDeleteVehicle(vehicle: Vehicle): void {
    const canDelete = window.confirm(
      `Se eliminará el vehículo ${vehicle.id}. Esta acción no se puede deshacer.`,
    );

    if (!canDelete) {
      return;
    }

    this.vehicles = this.vehicles.filter(currentVehicle => currentVehicle.id !== vehicle.id);
  }

  private generateNextVehicleId(): string {
    const currentMax = this.existingIds.reduce((max, id) => {
      const match = /^VEH-(\d+)$/.exec(id.trim().toUpperCase());
      if (!match) {
        return max;
      }

      const value = Number(match[1]);
      return Number.isFinite(value) ? Math.max(max, value) : max;
    }, 0);

    const nextValue = currentMax + 1;
    return `VEH-${String(nextValue).padStart(3, '0')}`;
  }

}
