import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
    CreateVehicleComponent,
    UpdateVehicleComponent,
  ],
  templateUrl: './vehicles.html',
  styleUrls: ['./vehicles.scss'],
})
export class Vehicles implements OnInit {
  private vehiculoService = inject(VehiculoService);
  private routesService = inject(RoutesService);
  private cdr = inject(ChangeDetectorRef);

  vehicles: Vehicle[] = [];
  selectedVehicles: Vehicle[] = [];
  isCreateModalOpen = false;
  isUpdateModalOpen = false;
  editingVehicle: Vehicle | null = null;
  loading = false;

  vehicleTypes = [...VEHICLE_TYPES];
  selectedVehicleType: VehicleType | '' = '';
  searchTerm: string = '';
  allVehiclesSelected = false;

  availableRoutes: RouteOption[] = [];

  isDeleteModalOpen = false;
  vehiclesToDelete: Vehicle[] = [];

  get existingPlates(): string[] {
    return this.vehicles.map((v) => v.plate);
  }

  // Filtrado dinámico en tiempo real
  get filteredVehicles(): Vehicle[] {
    return this.vehicles.filter((v) => {
      const matchType = !this.selectedVehicleType || v.type === this.selectedVehicleType;
      const term = this.searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        (v.id && v.id.toLowerCase().includes(term)) ||
        (v.plate && v.plate.toLowerCase().includes(term)) ||
        (v.route && v.route.toLowerCase().includes(term));

      return matchType && matchSearch;
    });
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
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error al obtener rutas:', error);
    }
  }

  async loadVehicles(): Promise<void> {
    this.loading = true;
    this.cdr.detectChanges();
    try {
      const allVehicles = await this.vehiculoService.getVehicles();
      this.vehicles = allVehicles.filter((v) => v.activo !== false);
    } catch (error) {
      console.error('Error al cargar vehículos desde Firebase:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  openCreateModal(): void {
    this.isCreateModalOpen = true;
  }

  openEditModal(vehicle: Vehicle): void {
    this.editingVehicle = { ...vehicle };
    this.isUpdateModalOpen = true;
  }

  // --- SELECCIÓN MANUAL DE FILAS ---

  isVehicleSelected(vehicle: Vehicle): boolean {
    return this.selectedVehicles.some((v) => v.id === vehicle.id);
  }

  toggleVehicleSelection(vehicle: Vehicle, checked: boolean): void {
    if (checked) {
      this.selectedVehicles.push(vehicle);
    } else {
      this.selectedVehicles = this.selectedVehicles.filter((v) => v.id !== vehicle.id);
    }
    this.allVehiclesSelected =
      this.filteredVehicles.length > 0 &&
      this.selectedVehicles.length === this.filteredVehicles.length;
  }

  toggleSelectAllVehicles(checked: boolean): void {
    this.allVehiclesSelected = checked;
    this.selectedVehicles = checked ? [...this.filteredVehicles] : [];
  }

  // --- MODAL DE BORRADO ---

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
        await this.vehiculoService.deactivateVehicle(vehicle);
      }
      await this.loadVehicles();
      this.selectedVehicles = [];
      this.allVehiclesSelected = false;
      this.closeDeleteModal();
    } catch (error) {
      console.error('Error al desactivar vehículos:', error);
    }
  }

  // --- CREACIÓN Y EDICIÓN ---

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