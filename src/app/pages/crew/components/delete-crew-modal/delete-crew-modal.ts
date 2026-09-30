import { Component, EventEmitter, inject, Input, Output, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Database, ref, update } from '@angular/fire/database';
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
   * Recibe la lista de UIDs de los usuarios que volverán al rol 'user'
   */
  @Input() targetUids: string[] = [];
  /**
   * Nombre o descripción corta para mostrar en el mensaje de confirmación
   */
  @Input() driverName: string = '';

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() deleted = new EventEmitter<void>();

  deleting = false;
  errorMsg = '';

  async confirmDelete(): Promise<void> {
    if (!this.targetUids || this.targetUids.length === 0) return;

    this.deleting = true;
    this.errorMsg = '';

    try {
      // Crear un objeto con múltiples actualizaciones atómicas en Firebase Realtime Database
      const updates: Record<string, any> = {};

      this.targetUids.forEach((uid) => {
        updates[`usuarios/${uid}/rol`] = 'user';
        updates[`usuarios/${uid}/camionId`] = null; // Opcional: remover el camión asignado
      });

      await update(ref(this.db), updates);

      this.messageService.add({
        severity: 'success',
        summary: 'Eliminado correctamente',
        detail: this.targetUids.length === 1 ? 'El integrante fue removido del grupo.' : 'Los integrantes fueron removidos del grupo.',
      });
      this.deleted.emit();
      this.cerrarModal();
    } catch (err: any) {
      this.errorMsg = 'Error al remover el rol de conductor: ' + (err.message || err);
    } finally {
      this.deleting = false;
      this.cdr.detectChanges();
    }
  }

  cerrarModal(): void {
    this.visible = false;
    this.visibleChange.emit(this.visible);
  }
}
