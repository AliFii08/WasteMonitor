import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { getDatabase, ref, update } from 'firebase/database';
import { MessageService } from 'primeng/api';
import { LocationService } from '../../../../@core/services/location.service';

@Component({
  selector: 'app-delete-journey-report',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './delete-journey-report.html',
  styleUrl: './delete-journey-report.scss',
})
export class DeleteJourneyReport {
  @Input() visible: boolean = false;
  @Input() reporte: any = null;
  @Input() reportesSeleccionados: any[] = [];

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() reportesEliminados = new EventEmitter<void>();

  isDeleting: boolean = false;
  isClosing = false;

  private messageService = inject(MessageService);
  private locationService = inject(LocationService);

  private get db() {
    return getDatabase();
  }

  get listaAEliminar(): any[] {
    if (this.reportesSeleccionados && this.reportesSeleccionados.length > 0) {
      return this.reportesSeleccionados;
    }
    if (this.reporte) {
      return [this.reporte];
    }
    return [];
  }

  closeModal(): void {
    if (this.isDeleting || this.isClosing) return;
    this.isClosing = true;
    setTimeout(() => {
      this.isClosing = false;
      this.visible = false;
      this.visibleChange.emit(false);
    }, 180);
  }

  async confirmDelete(): Promise<void> {
    const lista = this.listaAEliminar;

    if (lista.length === 0) {
      console.warn('⚠️ No se encontraron elementos seleccionados para eliminar.');
      return;
    }

    this.isDeleting = true;

    try {
      const updatesPayload: Record<string, any> = {};

      lista.forEach((item) => {
        const id = item.id || item.key;
        if (id) {
          updatesPayload[`informe_de_viaje/${id}/activo`] = false;
        }

        // Obtener el ID del supervisor asociado al informe
        const userId = item.usuario || item.usuarioId || item.idUsuario || item.uidUsuario;
        if (userId) {
          // Apaga la transmisión GPS nativa y marca /tracking/{userId}/current como inactivo
          this.locationService.stopSupervisorTracking(String(userId));
        }
      });

      console.log('💾 Payload enviado a Firebase:', updatesPayload);

      await update(ref(this.db), updatesPayload);

      this.isDeleting = false;
      this.messageService.add({
        severity: 'success',
        summary: 'Eliminado correctamente',
        detail:
          lista.length === 1
            ? 'El informe fue ocultado correctamente.'
            : 'Los informes fueron ocultados correctamente.',
      });
      this.reportesEliminados.emit();
      this.closeModal();
    } catch (error) {
      console.error('❌ Error al ocultar los informes:', error);
      this.isDeleting = false;
    }
  }
}