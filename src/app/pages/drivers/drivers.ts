import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

const DRIVER_SEARCH_INDEX = [
  'DRV-001 carlos mendoza supervisor veh-001 ruta norte',
  'DRV-002 jose villalobos crew veh-001 ruta norte',
  'DRV-003 mariana gutierrez crew veh-002 ruta centro',
  'DRV-004 luis herrera supervisor veh-003 ruta sur',
  'DRV-005 angela rivas crew veh-003 ruta sur',
];

@Component({
  selector: 'app-drivers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './drivers.html',
  styleUrl: './drivers.scss',
})
export class Drivers {
  driverSearchTerm = '';
  selectedDriverRows = [false, false, false, false, false];
  driverRowVisible = [true, true, true, true, true];
  allDriversSelected = false;

  get hasSelectedDrivers(): boolean {
    return this.selectedDriverRows.some((isSelected) => isSelected);
  }

  onDriverSearchChange(): void {
    const term = this.driverSearchTerm.trim().toLowerCase();
    this.driverRowVisible = DRIVER_SEARCH_INDEX.map((row) => row.includes(term));

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

    const canDelete = window.confirm('Se eliminarán los conductores seleccionados en esta vista estática.');
    if (!canDelete) return;

    this.selectedDriverRows = this.selectedDriverRows.map(() => false);
    this.syncDriversSelection();
  }

  createDriver(): void {
    alert('Botón Crear conductor en modo estático. Luego lo conectamos al backend.');
  }

  private syncDriversSelection(): void {
    const visibleIndexes = this.driverRowVisible
      .map((isVisible, index) => (isVisible ? index : -1))
      .filter((index) => index >= 0);

    this.allDriversSelected =
      visibleIndexes.length > 0 && visibleIndexes.every((index) => this.selectedDriverRows[index]);
  }
}
