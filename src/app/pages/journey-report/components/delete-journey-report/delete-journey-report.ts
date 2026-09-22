import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Database, ref, update } from '@angular/fire/database';

@Component({
  selector: 'app-delete-journey-report',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './delete-journey-report.html',
  styleUrl: './delete-journey-report.scss',
})
export class DeleteJourneyReport {
  @Input() visible: boolean = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  @Input() reporte: any = null;
  @Input() reportesSeleccionados: any[] = []; // Soporte para eliminación múltiple

  isDeleting: boolean = false;

  constructor(private db: Database) {}

  closeModal(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  async confirmDelete(): Promise<void> {
    this.isDeleting = true;

    try {
      const updates: { [key: string]: any } = {};

      // Si se pasa una lista de eliminados múltiples
      if (this.reportesSeleccionados && this.reportesSeleccionados.length > 0) {
        this.reportesSeleccionados.forEach((rep) => {
          if (rep?.id) {
            updates[`/informe_de_viaje/${rep.id}/activo`] = false;
          }
        });
      } else if (this.reporte?.id) {
        // Eliminación de un solo reporte
        updates[`/informe_de_viaje/${this.reporte.id}/activo`] = false;
      }

      if (Object.keys(updates).length > 0) {
        await update(ref(this.db), updates);
      }

      this.closeModal();
    } catch (error) {
      console.error('Error al deshabilitar el informe:', error);
    } finally {
      this.isDeleting = false;
    }
  }
}
