import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InformeService } from '../../../../@core/services/informe.service';


@Component({
  selector: 'app-create-journey-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-journey-report.html',
  styleUrl: './create-journey-report.scss',
})
export class CreateJourneyReport {
  private informeService = inject(InformeService);

  @Input() visible: boolean = false;
  @Input() numeroViaje: number = 1;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() reportCreated = new EventEmitter<void>();

  // Manejo de modal de error
  showErrorModal: boolean = false;
  errorMessage: string = '';

  formData = {
    tonRecogidas: null as number | null,
    direccionLlenado: '',
    observaciones: '',
  };

  onSubmit(): void {
    this.informeService.crearInforme(this.formData, this.numeroViaje).subscribe({
      next: () => {
        console.log('Informe de viaje registrado con éxito');
        this.closeModal();
        this.resetForm();
        this.reportCreated.emit();
      },
      error: (err) => {
        // Capturamos el mensaje lanzado por el servicio
        this.errorMessage = err.message || 'Ocurrió un error inesperado al guardar.';
        this.showErrorModal = true;
      },
    });
  }

  closeErrorModal(): void {
    this.showErrorModal = false;
    this.errorMessage = '';
  }

  closeModal(): void {
    this.visible = false;
    this.visibleChange.emit(this.visible);
  }

  private resetForm(): void {
    this.formData = {
      tonRecogidas: null,
      direccionLlenado: '',
      observaciones: '',
    };
  }
}
