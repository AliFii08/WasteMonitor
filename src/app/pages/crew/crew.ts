import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TripulacionService, TripulacionTabla } from '../../@core/services/tripulacion.service';
import { CreateCrew } from './components/create-crew/create-crew';
import { UpdateCrew } from './components/update-crew/update-crew';
import { DeleteCrewModal } from './components/delete-crew-modal/delete-crew-modal';
import { TablePagination } from '../../@core/components/table-pagination/table-pagination';

@Component({
  selector: 'app-crew',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CreateCrew,
    UpdateCrew,
    DeleteCrewModal,
    TablePagination,
  ],
  templateUrl: './crew.html',
  styleUrl: './crew.scss',
})
export class Crew implements OnInit {
  private tripulacionService = inject(TripulacionService);
  private cdr = inject(ChangeDetectorRef);

  driversList: TripulacionTabla[] = [];
  driverSearchTerm = '';
  driverPage = 0;
  readonly driverPageSize = 10;
  selectedDriverRows: boolean[] = [];
  driverRowVisible: boolean[] = [];
  allDriversSelected = false;

  isCreateModalOpen = false;
  isDeleteModalOpen = false;
  uidsToDelete: string[] = [];
  deleteDriverName = '';

  selectedDriverForUpdate: TripulacionTabla | null = null;
  isUpdateModalOpen = false;
  selectedCrew: TripulacionTabla | null = null;
  isDetailsModalOpen = false;
  isDetailsModalClosing = false;

  ngOnInit(): void {
    this.loadDrivers();
  }

  async loadDrivers(): Promise<void> {
    this.driversList = await this.tripulacionService.getTripulacion();

    this.selectedDriverRows = new Array(this.driversList.length).fill(false);
    this.driverRowVisible = new Array(this.driversList.length).fill(true);

    if (this.driverSearchTerm.trim()) {
      this.onDriverSearchChange();
    } else {
      this.cdr.detectChanges();
    }
  }

  get hasSelectedDrivers(): boolean {
    return this.selectedDriverRows.some((isSelected) => isSelected);
  }

  get visibleDriverCount(): number {
    return this.driverRowVisible.filter(Boolean).length;
  }

  get paginatedDrivers(): { driver: TripulacionTabla; index: number }[] {
    return this.driversList
      .map((driver, index) => ({ driver, index }))
      .filter((row) => this.driverRowVisible[row.index])
      .slice(this.driverPage * this.driverPageSize, (this.driverPage + 1) * this.driverPageSize);
  }

  openCreateModal(): void {
    this.isCreateModalOpen = true;
  }

  onDriverSearchChange(): void {
    const term = this.driverSearchTerm.trim().toLowerCase();
    this.driverPage = 0;

    this.driverRowVisible = this.driversList.map((driver) => {
      const searchIndex = `${driver.driverId} ${driver.encargado} ${driver.camionAsignado} ${driver.rutaAsignada} ${driver.conductor}`.toLowerCase();
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

  openSingleDeleteModal(driver: TripulacionTabla): void {
    this.uidsToDelete = [driver.uid];
    this.deleteDriverName = driver.encargado;
    this.isDeleteModalOpen = true;
  }

  deleteSelectedDrivers(): void {
    if (!this.hasSelectedDrivers) return;

    this.uidsToDelete = this.driversList
      .filter((_, index) => this.selectedDriverRows[index] && this.driverRowVisible[index])
      .map((driver) => driver.uid);

    this.deleteDriverName = '';
    this.isDeleteModalOpen = true;
  }

  async onDriversChanged(): Promise<void> {
    await this.loadDrivers();
    this.allDriversSelected = false;
  }

  private syncDriversSelection(): void {
    const visibleIndexes = this.driverRowVisible
      .map((isVisible, index) => (isVisible ? index : -1))
      .filter((index) => index >= 0);

    this.allDriversSelected =
      visibleIndexes.length > 0 && visibleIndexes.every((index) => this.selectedDriverRows[index]);
  }

  openDetailsModal(driver: TripulacionTabla): void {
    this.selectedCrew = driver;
    this.isDetailsModalOpen = true;
  }

  closeDetailsModal(): void {
    if (this.isDetailsModalClosing) return;
    this.isDetailsModalClosing = true;
    setTimeout(() => {
      this.isDetailsModalClosing = false;
      this.isDetailsModalOpen = false;
      this.selectedCrew = null;
    }, 180);
  }

  openUpdateModal(driver: TripulacionTabla): void {
    this.selectedDriverForUpdate = driver;
    this.isUpdateModalOpen = true;
  }
}
