import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Database,
  ref,
  push,
  get,
  query,
  orderByChild,
  equalTo,
  set,
  remove,
} from '@angular/fire/database';

import { InformeService } from '../../../../@core/services/informe.service';

export interface ViajeItem {
  id: string;
  key: string;
  numero: number;
  descripcion: string;
  direccionDelLlenado: string;
  tonRecogidas: number;
}

@Component({
  selector: 'app-update-journey-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './update-journey-report.html',
  styleUrl: './update-journey-report.scss',
})
export class UpdateJourneyReport implements OnChanges {
  @Input() visible: boolean = false;
  @Input() reporte: any = null;
  @Output() visibleChange = new EventEmitter<boolean>();

  activeTab: string = 'general';
  viajesList: ViajeItem[] = [];

  camion: string = '';
  ruta: string = '';

  isLoading: boolean = false;
  isSubmitting: boolean = false;

  // --- MINI MODAL NUEVO VIAJE ---
  showAddTripModal: boolean = false;
  isSavingTrip: boolean = false;
  nuevoViaje = {
    descripcion: '',
    direccionDelLlenado: '',
    tonRecogidas: 0,
  };

  showErrorModal: boolean = false;
  errorMessage: string = '';

  // Inyección de dependencias correcta para resolver TS2564
  constructor(
    private db: Database,
    private informe: InformeService,
  ) {}

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['reporte'] && this.reporte?.id) {
      this.camion = this.reporte.camion || '';
      this.ruta = this.reporte.ruta || '';
      await this.cargarViajes();
    }
  }

  async cargarViajes(): Promise<void> {
    if (!this.reporte?.id) return;
    this.isLoading = true;

    try {
      const viajesQuery = query(
        ref(this.db, 'viajes'),
        orderByChild('informeId'),
        equalTo(this.reporte.id),
      );

      const snapshot = await get(viajesQuery);
      this.viajesList = [];

      if (snapshot.exists()) {
        const data = snapshot.val();
        let index = 1;

        Object.keys(data).forEach((viajeKey) => {
          const v = data[viajeKey];
          this.viajesList.push({
            id: viajeKey,
            key: `viaje${index}`,
            numero: index,
            descripcion: String(v.descripcion || ''),
            direccionDelLlenado: String(v.direccionDelLlenado || v.direccionDeLlenado || ''),
            tonRecogidas: Number(v.tonRecogidas) || 0,
          });
          index++;
        });
      }

      this.activeTab = 'general';
    } catch (error) {
      console.error('Error al cargar viajes:', error);
    } finally {
      this.isLoading = false;
    }
  }

  // --- CONTROL DEL MINI MODAL ---
  abrirModalNuevoViaje(): void {
    this.nuevoViaje = { descripcion: '', direccionDelLlenado: '', tonRecogidas: 0 };
    this.showAddTripModal = true;
  }

  cerrarModalNuevoViaje(): void {
    this.showAddTripModal = false;
  }

  async guardarNuevoViaje(): Promise<void> {
    const targetInformeId = this.reporte?.id;
    if (!targetInformeId) return;

    this.isSavingTrip = true;

    try {
      const newTripRef = push(ref(this.db, 'viajes'));

      const payload = {
        informeId: String(targetInformeId),
        descripcion: String(this.nuevoViaje.descripcion || ''),
        direccionDelLlenado: String(this.nuevoViaje.direccionDelLlenado || ''),
        tonRecogidas: Number(this.nuevoViaje.tonRecogidas) || 0,
      };

      await set(newTripRef, payload);

      this.cerrarModalNuevoViaje();
      await this.cargarViajes();
    } catch (error) {
      console.error('Error al agregar viaje:', error);
      this.errorMessage = 'No se pudo crear el nuevo viaje.';
      this.showErrorModal = true;
    } finally {
      this.isSavingTrip = false;
    }
  }

  get viajeActivo(): ViajeItem | undefined {
    return this.viajesList.find((v) => v.key === this.activeTab);
  }

  // Guarda únicamente el viaje de la pestaña abierta
  async actualizarViajeActivo(): Promise<void> {
    const viaje = this.viajeActivo;

    if (!viaje || !viaje.id) {
      this.errorMessage = 'No se encontró el viaje seleccionado para actualizar.';
      this.showErrorModal = true;
      return;
    }

    this.isSubmitting = true;

    try {
      // Llamada directa al servicio pasando solo el objeto plano del viaje
      await this.informe.updateViajeIndividual(viaje.id, {
        descripcion: String(viaje.descripcion || ''),
        direccionDelLlenado: String(viaje.direccionDelLlenado || ''),
        tonRecogidas: Number(viaje.tonRecogidas) || 0,
      });

      await this.cargarViajes(); // Recarga para sincronizar los cambios
    } catch (error) {
      console.error('Error al actualizar viaje:', error);
      this.errorMessage = 'Ocurrió un error al actualizar el viaje.';
      this.showErrorModal = true;
    } finally {
      this.isSubmitting = false;
    }
  }
  // Método que delega la actualización al servicio para resolver TS2339
  async updateInforme(
    informeId: string,
    camion: string,
    ruta: string,
    viajes: ViajeItem[],
  ): Promise<void> {
    return this.informe.updateInforme(informeId, camion, ruta, viajes);
  }

  // --- GUARDAR EDICIONES DEL INFORME Y SUS VIAJES EXISTENTES ---
  async onSubmit(): Promise<void> {
    if (!this.reporte?.id) return;
    this.isSubmitting = true;

    try {
      await this.updateInforme(this.reporte.id, this.camion, this.ruta, this.viajesList);

      this.closeModal();
    } catch (error) {
      console.error('Error al actualizar informe:', error);
      this.errorMessage = 'Ocurrió un error al actualizar los datos.';
      this.showErrorModal = true;
    } finally {
      this.isSubmitting = false;
    }
  }

  get totalToneladas(): number {
    return this.viajesList.reduce((acc, v) => acc + (Number(v.tonRecogidas) || 0), 0);
  }

  selectTab(tabKey: string): void {
    this.activeTab = tabKey;
  }

  closeModal(): void {
    this.visible = false;
    this.visibleChange.emit(this.visible);
  }

  closeErrorModal(): void {
    this.showErrorModal = false;
  }

  agregarNuevoViaje(): void {
    this.abrirModalNuevoViaje();
  }

  async eliminarViaje(index: number, event: Event): Promise<void> {
    event.stopPropagation();

    const viajeAEliminar = this.viajesList[index];
    if (!viajeAEliminar) return;

    if (confirm(`¿Deseas eliminar el Viaje ${viajeAEliminar.numero}?`)) {
      if (viajeAEliminar.id) {
        await this.eliminarViajeDeFirebase(viajeAEliminar.id);
      } else {
        this.viajesList.splice(index, 1);
        this.reordenarViajes();
      }
    }
  }

  private async eliminarViajeDeFirebase(viajeId: string): Promise<void> {
    this.isLoading = true;
    try {
      await remove(ref(this.db, `viajes/${viajeId}`));
      await this.cargarViajes();
    } catch (error) {
      console.error('Error al eliminar viaje:', error);
      this.errorMessage = 'No se pudo eliminar el viaje.';
      this.showErrorModal = true;
    } finally {
      this.isLoading = false;
    }
  }

  private reordenarViajes(): void {
    this.viajesList.forEach((v, i) => {
      v.numero = i + 1;
      v.key = `viaje${i + 1}`;
    });

    if (!this.viajesList.some((v) => v.key === this.activeTab)) {
      this.activeTab = 'general';
    }
  }
}
