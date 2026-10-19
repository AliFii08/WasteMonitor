import { ChangeDetectorRef, Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatosViajeInput, InformeService } from '../../../../@core/services/informe.service';
import { SessionTimeoutService } from '../../../../@core/services/session-timeout.service';
import { AuthService } from '../../../../@core/services/auth.service';
import { LocationService } from '../../../../@core/services/location.service';
import {
  JourneyNotificationPermission,
  JourneyTrackingNotificationService,
} from '../../../../@core/services/journey-tracking-notification.service';
import { NotificationService } from '../../../../@core/services/notification.service';

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
  private trackingNotification = inject(JourneyTrackingNotificationService);
  private notificationService = inject(NotificationService);

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

  async onSubmit(): Promise<void> {
    this.loading = true;
    const isSupervisor = this.authService.hasRole(['supervisor']);
    let notificationPermission: JourneyNotificationPermission = 'unsupported';

    if (isSupervisor) {
      try {
        notificationPermission = await this.trackingNotification.requestPermission();
      } catch (error) {
        console.error('No se pudo solicitar permiso para las notificaciones:', error);
        notificationPermission = 'error';
      }
    }

    this.informeService.crearInforme(this.formData, this.numeroViaje).subscribe({
      next: async (informeId) => {
        this.loading = false;
        let adminNotificationFailed = false;

        if (isSupervisor) {
          this.sessionTimeoutService.setJourneyActive(true);

          const userId = this.authService.getCurrentUserId();

          try {
            await this.notificationService.crearNotificacion(
              'Nueva jornada iniciada',
              'Un supervisor inició una jornada de recolección.',
              'info',
              'admin',
            );
          } catch (error) {
            console.error('No se pudo notificar a la administración sobre la jornada:', error);
            adminNotificationFailed = true;
          }

          if (userId) {
            // Inicia el rastreo con el ID de usuario supervisor e informeId
            this.locationService.startSupervisorTracking(userId, informeId);
          }

          if (notificationPermission === 'granted') {
            try {
              await this.trackingNotification.showActive(informeId);
            } catch (error) {
              console.error('No se pudo mostrar la notificación de seguimiento activo:', error);
              this.errorMessage =
                'La jornada se creó, pero no se pudo mostrar la notificación de seguimiento.';
            }
          } else {
            this.errorMessage =
              'La jornada se creó, pero no se pudo mostrar la notificación. Revisa los permisos del navegador.';
          }

          if (adminNotificationFailed) {
            this.errorMessage = this.errorMessage
              ? `${this.errorMessage} No se pudo registrar el aviso para la administración.`
              : 'No se pudo registrar el aviso para la administración.';
          }
          if (this.errorMessage) {
            this.showNotificationWarning(this.errorMessage);
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

  private showNotificationWarning(message: string): void {
    this.errorMessage = message;
    setTimeout(() => {
      this.showErrorModal = true;
      this.changeDetector.detectChanges();
    }, 200);
  }
}
