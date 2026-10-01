import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatosViajeInput, InformeService } from '../../../../@core/services/informe.service';
import { SessionTimeoutService } from '../../../../@core/services/session-timeout.service';
import { AuthService } from '../../../../@core/services/auth.service';


@Component({
  selector: 'app-create-journey-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-journey-report.html',
  styleUrl: './create-journey-report.scss',
})
export class CreateJourneyReport {
  private informeService = inject(InformeService);
  private sessionTimeoutService = inject(SessionTimeoutService);
  private authService = inject(AuthService);

  @Input() visible: boolean = false;
  @Input() numeroViaje: number = 1;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() informeCreado = new EventEmitter<void>();

  loading: boolean = false;
  showErrorModal: boolean = false;
  errorMessage: string = '';

  formData: DatosViajeInput = {
    tonRecogidas: null,
    direccionLlenado: '',
    observaciones: '',
  };

  closeModal(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  closeErrorModal(): void {
    this.showErrorModal = false;
  }

  onSubmit(): void {
    this.loading = true;

    this.informeService.crearInforme(this.formData, this.numeroViaje).subscribe({
      next: () => {
        this.loading = false;
        if (this.authService.hasRole(['supervisor'])) {
          this.sessionTimeoutService.setJourneyActive(true);
        }
        this.informeCreado.emit();
        this.closeModal();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.message || 'Ocurrió un error al intentar crear el informe.';
        this.showErrorModal = true;
      },
    });
  }
}
