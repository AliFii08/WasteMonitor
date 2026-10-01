import { Component, EventEmitter, inject, Input, Output, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Database, ref, get, update } from '@angular/fire/database';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-delete-crew-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './delete-crew-modal.html',
  styleUrl: './delete-crew-modal.scss',
})
export class DeleteCrewModal {
  private db = inject(Database);
  private cdr = inject(ChangeDetectorRef);
  private messageService = inject(MessageService);

  @Input() visible = false;
  /**
   * Lista de UIDs/Keys del nodo 'grupoTripulacion' que se van a eliminar
   */
  @Input() targetUids: string[] = [];
  /**
   * Nombre o descripción corta para mostrar en el mensaje de confirmación
   */
  @Input() driverName: string = '';

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() deleted = new EventEmitter<void>();

  deleting = false;
  isClosing = false;
  errorMsg = '';

  async confirmDelete(): Promise<void> {
    if (!this.targetUids || this.targetUids.length === 0) return;

    this.deleting = true;
    this.errorMsg = '';

    try {
      const updates: Record<string, any> = {};

      // 1. Obtener la información de los grupos a eliminar para limpiar las referencias de los usuarios
      const gruposSnap = await get(ref(this.db, 'grupoTripulacion'));
      const gruposData = gruposSnap.exists() ? gruposSnap.val() : {};

      this.targetUids.forEach((grupoUid) => {
        const grupo = gruposData[grupoUid];

        if (grupo) {
          // Remover camionId del supervisor
          if (grupo.supervisor) {
            updates[`usuarios/${grupo.supervisor}/camionId`] = null;
          }

          // Remover camionId del conductor
          if (grupo.conductor) {
            updates[`usuarios/${grupo.conductor}/camionId`] = null;
          }

          // Remover camionId de los integrantes del crew
          if (grupo.crew && typeof grupo.crew === 'object') {
            Object.values<string>(grupo.crew).forEach((crewUid) => {
              if (crewUid) {
                updates[`usuarios/${crewUid}/camionId`] = null;
              }
            });
          }
        }

        // 2. Eliminar la entrada del grupo en 'grupoTripulacion' asignándolo a null
        updates[`grupoTripulacion/${grupoUid}`] = null;
      });

      // Ejecutar la actualización atómica en la base de datos
      await update(ref(this.db), updates);

      this.messageService.add({
        severity: 'success',
        summary: 'Equipo eliminado',
        detail: this.targetUids.length === 1 ? 'El equipo de tripulación fue eliminado.' : 'Los equipos seleccionados fueron eliminados.',
      });

      this.deleted.emit();
      this.cerrarModal();
    } catch (err: any) {
      this.errorMsg = 'Error al eliminar el equipo de tripulación: ' + (err.message || err);
    } finally {
      this.deleting = false;
      this.cdr.detectChanges();
    }
  }

  cerrarModal(): void {
    if (this.deleting || this.isClosing) return;
    this.isClosing = true;
    setTimeout(() => {
      this.isClosing = false;
      this.visible = false;
      this.visibleChange.emit(this.visible);
    }, 180);
  }
}