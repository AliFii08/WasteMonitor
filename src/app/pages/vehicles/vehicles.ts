import { Component, OnInit, inject } from '@angular/core';
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
    } catch (error) {
      console.error('Error al obtener rutas:', error);
    }
  }

  async loadVehicles(): Promise<void> {
    this.loading = true;
    try {
      this.vehicles = await this.vehiculoService.getVehicles();
    } catch (error) {
      console.error('Error al cargar vehículos desde Firebase:', error);
    } finally {
      this.loading = false;
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

  async onDeleteVehicle(vehicle: Vehicle): Promise<void> {
    try {
      await this.vehiculoService.deleteVehicle(vehicle.id);
      await this.loadVehicles();
      this.selectedVehicles = this.selectedVehicles.filter((v) => v.id !== vehicle.id);
    } catch (error) {
      console.error('Error al eliminar vehículo:', error);
    }
  }

  async onDeleteSelectedVehicles(): Promise<void> {
    try {
      for (const vehicle of this.selectedVehicles) {
        await this.vehiculoService.deleteVehicle(vehicle.id);
      }
      await this.loadVehicles();
      this.selectedVehicles = [];
      this.allVehiclesSelected = false;
    } catch (error) {
      console.error('Error al eliminar vehículos seleccionados:', error);
    }
  }

  // --- MÉTODOS DE MODALES ---

  async handleSaveVehicle(newVehicleData: Omit<Vehicle, 'id'>): Promise<void> {
    try {
      await this.vehiculoService.createVehicle(newVehicleData);
      await this.loadVehicles();
      this.isCreateModalOpen = false;
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
    } catch (error) {
      console.error('Error al actualizar vehículo:', error);
    }
  }
}
