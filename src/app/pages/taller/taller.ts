import { Component, OnInit, inject, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TallerService, TallerRegistro } from '../../@core/services/taller.service';
import { CreateVehicleTaller } from './components/create-vehicle-taller/create-vehicle-taller';
import { UpdateVehicleTaller } from './components/update-vehicle-taller/update-vehicle-taller';
import { DashboardService } from '../../@core/services/dashboard.service';
import { UserService } from '../../@core/services/user.service';

@Component({
  selector: 'app-taller',
  standalone: true,
  imports: [CommonModule, FormsModule, CreateVehicleTaller, UpdateVehicleTaller],
  templateUrl: './taller.html',
  styleUrl: './taller.scss',
})
export class Taller implements OnInit {
  private tallerService = inject(TallerService);
  private cdr = inject(ChangeDetectorRef);
  private dashboardService = inject(DashboardService);
  private userService = inject(UserService);

  @ViewChild(CreateVehicleTaller) createModal!: CreateVehicleTaller;
  @ViewChild(UpdateVehicleTaller) updateModal!: UpdateVehicleTaller;

  tallerList: TallerRegistro[] = [];
  tallerRowVisible: boolean[] = [];
  selectedTallerRows: boolean[] = [];

  tallerSearchTerm = '';
  allTallerSelected = false;
  loading = false;
  desplegableListosAbierto = false;

  // Estado del modal de confirmación de eliminación
  showConfirmModal = false;
  deleting = false;
  deleteMode: 'single' | 'bulk' = 'single';
  itemToDeleteKey?: string;

  async ngOnInit(): Promise<void> {
    await this.loadTaller();
  }

  async loadTaller(): Promise<void> {
    this.loading = true;
    this.cdr.detectChanges();

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
      this.cdr.detectChanges();
    }
  }

  get registrosActivos(): TallerRegistro[] {
    return this.tallerList.filter((item) => item.estado !== 'listo');
  }

  get registrosListos(): TallerRegistro[] {
    return this.tallerList.filter((item) => item.estado === 'listo');
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

  get selectedCount(): number {
    return this.selectedTallerRows.filter(Boolean).length;
  }

  // Muestra modal para eliminación individual
  confirmDeleteSingle(idKey?: string): void {
    if (!idKey) return;
    this.itemToDeleteKey = idKey;
    this.deleteMode = 'single';
    this.showConfirmModal = true;
  }

  // Muestra modal para eliminación masiva
  confirmDeleteSelected(): void {
    if (!this.hasSelectedItems) return;
    this.deleteMode = 'bulk';
    this.showConfirmModal = true;
  }

  closeConfirmModal(): void {
    if (this.deleting) return;
    this.showConfirmModal = false;
    this.itemToDeleteKey = undefined;
  }

  async processDelete(): Promise<void> {
    this.deleting = true;

    const currentUser = this.userService.currentUserSignal();
    const usuarioNombre = currentUser
      ? `${currentUser.name || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email
      : 'Usuario Anónimo';
    const usuarioRol = currentUser?.rol || 'Sin Rol';

    try {
      if (this.deleteMode === 'single' && this.itemToDeleteKey) {
        const item = this.tallerList.find((r) => r.idKey === this.itemToDeleteKey);
        await this.tallerService.eliminarRegistro(this.itemToDeleteKey, item?.idCamion);

        // Registrar eliminación individual
        await this.dashboardService.registrarOperacion({
          usuario: usuarioNombre,
          rol: usuarioRol,
          accion: 'eliminar',
          modulo: 'Vehículos',
          detalle: `Registro de taller para el vehículo ${item?.idCamion || this.itemToDeleteKey} eliminado/liberado`,
          fechaHora: new Date().toLocaleString(),
        });
      } else if (this.deleteMode === 'bulk') {
        const keysToDelete = this.tallerList
          .filter((_, i) => this.selectedTallerRows[i] && this.tallerList[i].idKey)
          .map((item) => item.idKey as string);

        if (keysToDelete.length > 0) {
          await this.tallerService.eliminarMultiples(keysToDelete);

          await this.dashboardService.registrarOperacion({
            usuario: usuarioNombre,
            rol: usuarioRol,
            accion: 'eliminar',
            modulo: 'Vehículos',
            detalle: `Se retiraron ${keysToDelete.length} vehículos del taller`,
            fechaHora: new Date().toLocaleString(),
          });
        }
      }
      this.showConfirmModal = false;
      await this.loadTaller();
    } catch (error) {
      console.error('Error al eliminar registro(s):', error);
    } finally {
      this.deleting = false;
      this.itemToDeleteKey = undefined;
      this.cdr.detectChanges();
    }
  }

  createRegistro(): void {
    this.createModal?.open?.();
  }

  editRegistro(item: TallerRegistro): void {
    this.updateModal?.open?.(item);
  }

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

  getRealIndex(item: TallerRegistro): number {
    return this.tallerList.findIndex((r) => r.idKey === item.idKey);
  }
}
