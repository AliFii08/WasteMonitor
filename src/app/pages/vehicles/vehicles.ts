import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { Vehicle, VEHICLE_TYPES, VehicleType } from '../../@core/interfaces/vehicle.model';
import { CreateVehicleComponent, RouteOption } from './components/create-vehicle/create-vehicle';
import { UpdateVehicleComponent } from './components/update-vehicle/update-vehicle';
import { RoutesService } from '../../@core/services/routes.service';
import { VehiculoService } from '../../@core/services/vehiculos.service';

@Component({
  selector: 'app-vehicles',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    CreateVehicleComponent,
    UpdateVehicleComponent,
  ],
  templateUrl: './vehicles.html',
  styleUrls: ['./vehicles.scss'],
})
export class Vehicles implements OnInit {
  private vehiculoService = inject(VehiculoService);
  private routesService = inject(RoutesService);
  private cdr = inject(ChangeDetectorRef); // Inyección del ChangeDetectorRef

  vehicles: Vehicle[] = [];
  selectedVehicles: Vehicle[] = [];
  isCreateModalOpen = false;
  isUpdateModalOpen = false;
  editingVehicle: Vehicle | null = null;
  loading = false;

  vehicleTypes = [...VEHICLE_TYPES];
  selectedVehicleType: VehicleType | '' = '';
  allVehiclesSelected = false;

  availableRoutes: RouteOption[] = [];

  isDeleteModalOpen = false;
  vehiclesToDelete: Vehicle[] = [];

  get existingPlates(): string[] {
    return this.vehicles.map((v) => v.plate);
  }

  async ngOnInit(): Promise<void> {
    await this.loadVehicles();
    await this.loadRoutes();
  }

  async loadRoutes(): Promise<void> {
    try {
      const routesData = await this.routesService.getRoutes();
      this.availableRoutes = routesData.map((r) => ({
        id: r.id,
        nombreRuta: r.nombreRuta || r.id,
      }));
      this.cdr.detectChanges(); // Notifica cambios
    } catch (error) {
      console.error('Error al obtener rutas:', error);
    }
  }

  async loadVehicles(): Promise<void> {
    this.loading = true;
    this.cdr.detectChanges(); // Fuerza el loader visual inmediatamente
    try {
      const allVehicles = await this.vehiculoService.getVehicles();
      this.vehicles = allVehicles.filter((v) => v.activo !== false);
    } catch (error) {
      console.error('Error al cargar vehículos desde Firebase:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges(); // Fuerza a Angular a pintar la tabla cuando se quita el spinner
    }
  }

  openCreateModal(): void {
    this.isCreateModalOpen = true;
  }

  openEditModal(vehicle: Vehicle): void {
    this.editingVehicle = { ...vehicle };
    this.isUpdateModalOpen = true;
  }

  // --- MÉTODOS DE LA TABLA Y SELECCIÓN ---

  onVehiclesSelectionChange(table: Table): void {
    const currentList = table.filteredValue || this.vehicles;
    const totalRecords = currentList.length;

    this.allVehiclesSelected = totalRecords > 0 && this.selectedVehicles.length === totalRecords;
  }

  toggleSelectAllVehicles(table: Table, checked: boolean): void {
    const currentList = table.filteredValue || this.vehicles;
    this.selectedVehicles = checked ? [...currentList] : [];
    this.allVehiclesSelected = checked;
  }

  // --- MODAL DE BORRADO LÓGICO ---

  openDeleteModalForSingle(vehicle: Vehicle): void {
    this.vehiclesToDelete = [vehicle];
    this.isDeleteModalOpen = true;
  }

  onDeleteSelectedVehicles(): void {
    if (this.selectedVehicles.length === 0) return;
    this.vehiclesToDelete = [...this.selectedVehicles];
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen = false;
    this.vehiclesToDelete = [];
  }

  async confirmDelete(): Promise<void> {
    try {
      for (const vehicle of this.vehiclesToDelete) {
        await this.vehiculoService.updateVehicle({
          ...vehicle,
          activo: false,
        });
      }
      await this.loadVehicles();
      this.selectedVehicles = [];
      this.allVehiclesSelected = false;
      this.closeDeleteModal();
    } catch (error) {
      console.error('Error al desactivar vehículos:', error);
    }
  }

  // --- MÉTODOS DE CREACIÓN Y EDICIÓN ---

  async handleSaveVehicle(newVehicleData: Omit<Vehicle, 'id'>): Promise<void> {
    try {
      await this.vehiculoService.createVehicle({
        ...newVehicleData,
        activo: true,
      });
      await this.loadVehicles();
      this.isCreateModalOpen = false;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error al guardar vehículo:', error);
    }
  }

  onUpdateModalVisibleChange(visible: boolean): void {
    this.isUpdateModalOpen = visible;
    if (!visible) {
      this.editingVehicle = null;
    }
  }

  async onUpdateVehicle(updatedVehicle: Vehicle): Promise<void> {
    try {
      await this.vehiculoService.updateVehicle(updatedVehicle);
      await this.loadVehicles();
      this.isUpdateModalOpen = false;
      this.editingVehicle = null;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error al actualizar vehículo:', error);
    }
  }
}
