import { Component, OnInit, inject, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TallerService, TallerRegistro } from '../../@core/services/taller.service';
import { CreateVehicleTaller } from './components/create-vehicle-taller/create-vehicle-taller';
import { UpdateVehicleTaller } from './components/update-vehicle-taller/update-vehicle-taller';

@Component({
  selector: 'app-taller',
  standalone: true,
  imports: [CommonModule, FormsModule, CreateVehicleTaller, UpdateVehicleTaller],
  templateUrl: './taller.html',
  styleUrl: './taller.scss',
})
export class Taller implements OnInit {
  private tallerService = inject(TallerService);
  private cdr = inject(ChangeDetectorRef); // Inyección directa del ChangeDetectorRef

  @ViewChild(CreateVehicleTaller) createModal!: CreateVehicleTaller;
  @ViewChild(UpdateVehicleTaller) updateModal!: UpdateVehicleTaller;

  tallerList: TallerRegistro[] = [];
  tallerRowVisible: boolean[] = [];
  selectedTallerRows: boolean[] = [];

  tallerSearchTerm = '';
  allTallerSelected = false;
  loading = false;

  async ngOnInit(): Promise<void> {
    await this.loadTaller();
  }

  async loadTaller(): Promise<void> {
    this.loading = true;
    this.cdr.detectChanges(); // Fuerza visualización de estado de carga

    try {
      this.tallerList = await this.tallerService.getRegistrosTaller();
      this.tallerRowVisible = new Array(this.tallerList.length).fill(true);
      this.selectedTallerRows = new Array(this.tallerList.length).fill(false);
      this.allTallerSelected = false;
      this.onTallerSearchChange();
    } catch (error) {
      console.error('Error al cargar la lista del taller:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges(); // Fuerza el refresco completo de la vista
    }
  }

  onTallerSearchChange(): void {
    const term = this.tallerSearchTerm.toLowerCase().trim();
    if (!term) {
      this.tallerRowVisible = new Array(this.tallerList.length).fill(true);
      return;
    }

    this.tallerRowVisible = this.tallerList.map((item) => {
      return (
        (item.idCamion?.toLowerCase() ?? '').includes(term) ||
        (item.razon?.toLowerCase() ?? '').includes(term) ||
        (item.estado?.toLowerCase() ?? '').includes(term)
      );
    });
  }

  toggleSelectAll(checked: boolean): void {
    this.allTallerSelected = checked;
    this.selectedTallerRows = this.selectedTallerRows.map((_, i) =>
      this.tallerRowVisible[i] ? checked : false,
    );
  }

  toggleRow(index: number, checked: boolean): void {
    this.selectedTallerRows[index] = checked;
    this.allTallerSelected = this.selectedTallerRows.every((val) => val);
  }

  get hasSelectedItems(): boolean {
    return this.selectedTallerRows.some((selected) => selected);
  }

  async deleteSelectedItems(): Promise<void> {
    const keysToDelete = this.tallerList
      .filter((_, i) => this.selectedTallerRows[i] && this.tallerList[i].idKey)
      .map((item) => item.idKey as string);

    if (keysToDelete.length > 0) {
      await this.tallerService.eliminarMultiples(keysToDelete);
      await this.loadTaller();
    }
  }

  async deleteSingleItem(idKey?: string): Promise<void> {
    if (idKey) {
      const item = this.tallerList.find((r) => r.idKey === idKey);
      await this.tallerService.eliminarRegistro(idKey, item?.idCamion);
      await this.loadTaller();
    }
  }

  createRegistro(): void {
    this.createModal?.open?.();
  }

  editRegistro(item: TallerRegistro): void {
    this.updateModal?.open?.(item);
  }

  /** Se invoca al emitir el evento (created) del modal de creación */
  async handleCreated(): Promise<void> {
    await this.loadTaller();
  }

  async handleUpdated(): Promise<void> {
    await this.loadTaller();
  }

  formatEstado(estado: string): string {
    if (!estado) return '';
    return estado.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }
}
