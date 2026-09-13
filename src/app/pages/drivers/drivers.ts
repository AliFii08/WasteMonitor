import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConductoresService, ConductorTabla } from '../../@core/services/conductores.service';
import { CreateDriver } from './components/create-driver/create-driver';
import { UpdateDriver } from './components/update-driver/update-driver';
import { VehiculoService } from '../../@core/services/vehiculos.service';

@Component({
  selector: 'app-drivers',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    CreateDriver,
    // UpdateDriver,
  ],
  templateUrl: './drivers.html',
  styleUrl: './drivers.scss',
})
export class Drivers implements OnInit {
  private conductoresService = inject(ConductoresService);
  private cdr = inject(ChangeDetectorRef);


  driversList: ConductorTabla[] = [];
  driverSearchTerm = '';
  selectedDriverRows: boolean[] = [];
  driverRowVisible: boolean[] = [];
  allDriversSelected = false;
  camionesList: string[] = [];

  isCreateModalOpen = false;

  ngOnInit(): void {
    this.loadDrivers();
  }



  async loadDrivers(): Promise<void> {
    this.cdr.detectChanges();
    this.driversList = await this.conductoresService.getConductores();
    
    // Mantenemos el estado de selección e visibilidad idéntico al código de tu equipo
    this.selectedDriverRows = new Array(this.driversList.length).fill(false);
    this.driverRowVisible = new Array(this.driversList.length).fill(true);
    
    this.cdr.detectChanges();
  }

  get hasSelectedDrivers(): boolean {
    return this.selectedDriverRows.some((isSelected) => isSelected);
  }

  openCreateModal(): void {
    this.isCreateModalOpen = true;
  }

  onDriverSearchChange(): void {
    const term = this.driverSearchTerm.trim().toLowerCase();

    this.driverRowVisible = this.driversList.map((driver) => {
      const searchIndex = `${driver.driverId} ${driver.nombreCompleto} ${driver.cargo} ${driver.camionAsignado} ${driver.rutaAsignada}`.toLowerCase();
      return searchIndex.includes(term);
    });

    this.selectedDriverRows = this.selectedDriverRows.map((isSelected, index) =>
      this.driverRowVisible[index] ? isSelected : false,
    );

    this.syncDriversSelection();
  }

  toggleDriverRow(index: number, checked: boolean): void {
    this.selectedDriverRows[index] = checked;
    this.syncDriversSelection();
  }

  toggleSelectAllDrivers(checked: boolean): void {
    this.selectedDriverRows = this.selectedDriverRows.map((_, index) =>
      this.driverRowVisible[index] ? checked : false,
    );
    this.syncDriversSelection();
  }

  deleteSelectedDrivers(): void {
    if (!this.hasSelectedDrivers) return;

    const canDelete = window.confirm('Se eliminarán los conductores seleccionados.');
    if (!canDelete) return;

    this.selectedDriverRows = this.selectedDriverRows.map(() => false);
    this.syncDriversSelection();
  }

  createDriver(): void {
    alert('Botón Crear conductor');
  }

  private syncDriversSelection(): void {
    const visibleIndexes = this.driverRowVisible
      .map((isVisible, index) => (isVisible ? index : -1))
      .filter((index) => index >= 0);

    this.allDriversSelected =
      visibleIndexes.length > 0 && visibleIndexes.every((index) => this.selectedDriverRows[index]);
  }
}