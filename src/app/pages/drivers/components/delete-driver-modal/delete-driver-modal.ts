import { Component, EventEmitter, inject, Input, Output, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Database, ref, update } from '@angular/fire/database';

@Component({
  selector: 'app-delete-driver-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './delete-driver-modal.html',
  styleUrl: './delete-driver-modal.scss',
})
export class DeleteDriverModal {
  private db = inject(Database);
  private cdr = inject(ChangeDetectorRef);

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