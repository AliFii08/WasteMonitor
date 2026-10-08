import { ChangeDetectorRef, Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatosViajeInput, InformeService } from '../../../../@core/services/informe.service';
import { SessionTimeoutService } from '../../../../@core/services/session-timeout.service';
import { AuthService } from '../../../../@core/services/auth.service';
import { LocationService } from '../../../../@core/services/location.service';

@Component({
  selector: 'app-create-journey-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-journey-report.html',
  styleUrl: './create-journey-report.scss',
})
export class CreateJourneyReport implements OnChanges {
  private informeService = inject(InformeService);
  private sessionTimeoutService = inject(SessionTimeoutService);
  private authService = inject(AuthService);
  private changeDetector = inject(ChangeDetectorRef);
  private locationService = inject(LocationService);

  @Input() visible: boolean = false;
  @Input() numeroViaje: number = 1;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() informeCreado = new EventEmitter<void>();

  isClosing = false;
  loading: boolean = false;
  assignmentLoading: boolean = false;
  assignedVehicle: string = '';
  assignedRoute: string = '';
  showErrorModal: boolean = false;
  errorMessage: string = '';

  formData: DatosViajeInput = {
    tonRecogidas: null,
    direccionLlenado: '',
    observaciones: '',
  };

  get puedeCrear(): boolean {
    return Boolean(this.assignedVehicle && this.assignedRoute);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue === true) {
      this.cargarAsignacion();
    }
  }

  private async cargarAsignacion(): Promise<void> {
    const uid = this.authService.getCurrentUserId();
    this.assignedVehicle = '';
    this.assignedRoute = '';
    if (!uid) {
      this.assignmentLoading = false;
      this.changeDetector.detectChanges();
      return;
    }

    this.assignmentLoading = true;
    this.changeDetector.detectChanges();
    try {
      const asignacion = await this.informeService.obtenerAsignacionActual(uid);
      this.assignedVehicle = asignacion.camion;
      this.assignedRoute = asignacion.ruta;
    } catch (error) {
      console.error('Error al consultar la asignación actual:', error);
      this.assignedVehicle = '';
      this.assignedRoute = '';
    } finally {
      this.assignmentLoading = false;
      this.changeDetector.detectChanges();
    }
  }

  closeModal(): void {
    if (this.isClosing) return;
    this.isClosing = true;
    setTimeout(() => {
      this.isClosing = false;
      this.visible = false;
      this.visibleChange.emit(false);
    }, 180);
  }

  closeErrorModal(): void {
    this.showErrorModal = false;
  }

  onSubmit(): void {
    this.loading = true;

    this.informeService.crearInforme(this.formData, this.numeroViaje).subscribe({
      next: (informeId) => {
        this.loading = false;

        if (this.authService.hasRole(['supervisor'])) {
          this.sessionTimeoutService.setJourneyActive(true);

          const userId = this.authService.getCurrentUserId();

          if (userId) {
            // Inicia el rastreo con el ID de usuario supervisor e informeId
            this.locationService.startSupervisorTracking(userId, informeId);
          }
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
