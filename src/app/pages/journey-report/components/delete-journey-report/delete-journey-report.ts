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
      // ownerId -> ids de informes de ese dueño, para el kill switch de tracking
      const informesPorOwner = new Map<string, string[]>();

      lista.forEach((item) => {
        const id = item.id || item.key;
        if (!id) return;

        updatesPayload[`informe_de_viaje/${id}/activo`] = false;

        // Dueño del informe, para poder apagar su tracking desde AQUÍ
        const ownerId = item.uidUsuario || item.usuario || item.usuarioId || '';
        if (ownerId) {
          informesPorOwner.set(ownerId, [...(informesPorOwner.get(ownerId) || []), id]);
        }
      });

      // Salvaguarda: si ningún item tenía id, no se envía nada y Firebase
      // resolvería un update({}) sin efecto alguno (borrado fingido).
      if (Object.keys(updatesPayload).length === 0) {
        console.warn('⚠️ No se encontraron IDs válidos para ocultar los informes.');
        this.isDeleting = false;
        this.messageService.add({
          severity: 'warn',
          summary: 'No se pudo eliminar',
          detail: 'Los informes seleccionados no tienen un identificador válido.',
        });
        return;
      }

      // Al ejecutarse esta actualización en RTDB, el teléfono del supervisor
      // recibirá la notificación en su 'onValue' y apagará 'watchPosition' inmediatamente.
      await update(ref(this.db), updatesPayload);

      // Kill switch remoto: el listener de LocationService vive en el teléfono
      // del supervisor. Si él tiene la app cerrada, ese listener nunca se
      // dispara y su nodo /tracking/{uid}/current quedaría con active:true
      // (marcador fantasma en el mapa). Apaga solo si el tracking en curso
      // apunta a uno de estos informes, y limpia el historial residual.
      for (const [ownerId, informeIds] of informesPorOwner) {
        await this.locationService.apagarTrackingDeInformes(ownerId, informeIds);
      }

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
      this.messageService.add({
        severity: 'error',
        summary: 'Error al eliminar',
        detail: 'No se pudieron ocultar los informes. Intenta de nuevo.',
      });
    }
  }
}