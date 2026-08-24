import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Table, TableModule } from 'primeng/table';
import { Vehicle, VEHICLE_TYPES } from '../../@core/interfaces/vehicle.model';
import { VehiculoService } from '../../@core/services/vehiculos.service';
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
export class Vehicles implements OnInit {
  private vehiculoService = inject(VehiculoService);
  private cdr = inject(ChangeDetectorRef);

  vehicles: Vehicle[] = [];
  loading: boolean = false;

  selectedVehicleType = '';
  selectedVehicles: Vehicle[] = [];
  allVehiclesSelected = false;
  isCreateModalOpen = false;
  isUpdateModalOpen = false;
  editingVehicle: Vehicle | null = null;
  vehicleTypes = [...VEHICLE_TYPES];

  ngOnInit(): void {
    this.loadVehicles();
  }

  async loadVehicles(): Promise<void> {
    this.loading = true;
    try {
      this.vehicles = await this.vehiculoService.getVehicles();
    } catch (error) {
      console.error('Error al cargar vehículos:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

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

  private getVisibleVehicles(table: Table): Vehicle[] {
    return (table.filteredValue as Vehicle[] | null) ?? this.vehicles;
  }

  onVehiclesSelectionChange(table: Table): void {
    const visibleVehicles = this.getVisibleVehicles(table);
    this.allVehiclesSelected =
      visibleVehicles.length > 0 &&
      visibleVehicles.every((vehicle) => this.selectedVehicles.some((selected) => selected.id === vehicle.id));
  }

  toggleSelectAllVehicles(table: Table, checked: boolean): void {
    const visibleVehicles = this.getVisibleVehicles(table);
    const selectedIds = new Set(this.selectedVehicles.map((vehicle) => vehicle.id));

    if (checked) {
      this.selectedVehicles = [
        ...this.selectedVehicles,
        ...visibleVehicles.filter((vehicle) => !selectedIds.has(vehicle.id)),
      ];
    } else {
      const visibleIds = new Set(visibleVehicles.map((vehicle) => vehicle.id));
      this.selectedVehicles = this.selectedVehicles.filter((vehicle) => !visibleIds.has(vehicle.id));
    }

    this.allVehiclesSelected = checked;
  }

  async onDeleteSelectedVehicles(): Promise<void> {
    if (!this.selectedVehicles.length) return;

    const canDelete = window.confirm(
      `Se eliminarán ${this.selectedVehicles.length} vehículo(s). Esta acción no se puede deshacer.`,
    );

    if (!canDelete) return;

    try {
      await Promise.all(
        this.selectedVehicles.map((vehicle) => this.vehiculoService.deleteVehicle(vehicle.id)),
      );
      this.selectedVehicles = [];
      this.allVehiclesSelected = false;
      await this.loadVehicles();
    } catch (error) {
      console.error('Error al eliminar vehículos seleccionados:', error);
    }
  }

  async onCreateVehicle(vehicleData: Omit<Vehicle, 'id'>): Promise<void> {
    try {
      await this.vehiculoService.createVehicle(vehicleData);
      await this.loadVehicles();
    } catch (error) {
      console.error('Error al guardar vehículo:', error);
    }
  }

  async onUpdateVehicle(vehicle: Vehicle): Promise<void> {
    try {
      await this.vehiculoService.updateVehicle(vehicle);
      await this.loadVehicles();
    } catch (error) {
      console.error('Error al actualizar vehículo:', error);
    }
  }

  async onDeleteVehicle(vehicle: Vehicle): Promise<void> {
    const canDelete = window.confirm(
      `Se eliminará el vehículo ${vehicle.id}. Esta acción no se puede deshacer.`,
    );

    if (!canDelete) return;

    try {
      await this.vehiculoService.deleteVehicle(vehicle.id);
      await this.loadVehicles();
    } catch (error) {
      console.error('Error al eliminar vehículo:', error);
    }
  }
}
