import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { InformeAdministrativo, InformeService } from '../../../../@core/services/informe.service';

@Component({
  selector: 'app-delete-admin-report',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './delete-admin-report.html',
  styleUrl: './delete-admin-report.scss',
})
export class DeleteAdminReport {
  private informeService = inject(InformeService);
  @Input() visible = false;
  @Input() informe: InformeAdministrativo | null = null;
  @Input() informesSeleccionados: InformeAdministrativo[] = [];
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() deleted = new EventEmitter<void>();
  deleting = false;
  isClosing = false;
  error = '';

  get cantidadAEliminar(): number {
    return this.informesSeleccionados.length || (this.informe ? 1 : 0);
  }

  close(force = false): void {
    if ((this.deleting && !force) || this.isClosing) return;
    this.isClosing = true;
    setTimeout(() => {
      this.isClosing = false;
      this.visible = false;
      this.visibleChange.emit(false);
    }, 180);
  }

  async confirm(): Promise<void> {
    const informesAEliminar = this.informesSeleccionados.length
      ? this.informesSeleccionados
      : this.informe
        ? [this.informe]
        : [];
    if (!informesAEliminar.length || this.deleting) return;
    this.deleting = true;
    this.error = '';
    try {
      await Promise.all(
        informesAEliminar.map((informe) =>
          this.informeService.eliminarInformeAdministrativo(informe.id),
        ),
      );
      this.deleted.emit();
      this.close(true);
    } catch (error) {
      console.error('Error al eliminar el informe administrativo:', error);
      this.error = 'No se pudo eliminar el informe.';
    } finally {
      this.deleting = false;
    }
  }
}
