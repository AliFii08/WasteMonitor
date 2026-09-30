import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { getDatabase, ref, update } from 'firebase/database';
import { MessageService } from 'primeng/api';

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
  private messageService = inject(MessageService);

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
    if (this.isDeleting) return;
    this.visible = false;
    this.visibleChange.emit(false);
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
        // En la BD Realtime, la clave del objeto es 'id' o 'key' (ej: -P1eqtP73yoDIxGmkMuO)
        const id = item.id || item.key;
        if (id) {
          updatesPayload[`informe_de_viaje/${id}/activo`] = false;
        }
      });

      console.log('💾 Payload enviado a Firebase:', updatesPayload);

      await update(ref(this.db), updatesPayload);

      this.isDeleting = false;
      this.messageService.add({
        severity: 'success',
        summary: 'Eliminado correctamente',
        detail: lista.length === 1 ? 'El informe fue ocultado correctamente.' : 'Los informes fueron ocultados correctamente.',
      });
      this.reportesEliminados.emit();
      this.closeModal();
    } catch (error) {
      console.error('❌ Error al ocultar los informes:', error);
      this.isDeleting = false;
    }
  }
}
