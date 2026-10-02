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
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() deleted = new EventEmitter<void>();
  deleting = false;
  error = '';

  close(): void {
    if (this.deleting) return;
    this.visible = false;
    this.visibleChange.emit(false);
  }

  async confirm(): Promise<void> {
    if (!this.informe || this.deleting) return;
    this.deleting = true;
    this.error = '';
    try {
      await this.informeService.eliminarInformeAdministrativo(this.informe.id);
      this.deleted.emit();
      this.close();
    } catch (error) {
      console.error('Error al eliminar el informe administrativo:', error);
      this.error = 'No se pudo eliminar el informe.';
    } finally {
      this.deleting = false;
    }
  }
}
