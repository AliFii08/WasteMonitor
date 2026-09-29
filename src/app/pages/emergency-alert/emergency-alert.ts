import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../@core/services/auth.service';
import { EmergencyAlert, EmergencyEvent, EmergencyKind, EmergencyService } from '../../@core/services/emergency.service';
import { UserService } from '../../@core/services/user.service';

@Component({
  selector: 'app-emergency-alert',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './emergency-alert.html',
  styleUrl: './emergency-alert.scss',
})
export class EmergencyAlertComponent implements OnInit, OnDestroy {
  private emergencyService = inject(EmergencyService);
  private authService = inject(AuthService);
  private userService = inject(UserService);

  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  alerts: EmergencyAlert[] = [];
  vehicle = '';
  kind: EmergencyKind = 'delay';
  description = '';
  saving = false;
  errorMessage = '';

  private stopListening: (() => void) | null = null;

  get role(): string {
    return this.authService.getCurrentRole();
  }

  get canReport(): boolean {
    return ['supervisor', 'crew', 'conductor'].includes(this.role);
  }

  get canManage(): boolean {
    return this.role === 'admin';
  }

  get canRespondAsMechanic(): boolean {
    return this.role === 'mecanico';
  }

  get displayedAlerts(): EmergencyAlert[] {
    return this.canReport ? this.alerts : this.alerts.filter((alert) => this.isActive(alert));
  }

  ngOnInit(): void {
    this.stopListening = this.emergencyService.listen((alerts) => {
      this.alerts = alerts;
    });
  }

  close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  async report(): Promise<void> {
    const vehicle = this.vehicle.trim();
    const description = this.description.trim();
    if (!vehicle || !description || this.saving) return;

    this.saving = true;
    this.errorMessage = '';
    const createdBy = this.currentUserName;
    const createdAt = Date.now();

    try {
      await this.emergencyService.report({
        vehicle,
        kind: this.kind,
        description,
        status: 'reportada',
        createdAt,
        createdBy,
        createdRole: this.role,
      }, {
        message: `Emergencia reportada: ${this.kindLabel(this.kind)}. ${description}`,
        author: createdBy,
        role: this.role,
        timestamp: createdAt,
      });
      this.vehicle = '';
      this.description = '';
    } catch {
      this.errorMessage = 'No se pudo enviar el reporte. Inténtalo de nuevo.';
    } finally {
      this.saving = false;
    }
  }

  async updateAlert(alert: EmergencyAlert, status: string, message: string): Promise<void> {
    const event: EmergencyEvent = {
      message,
      author: this.currentUserName,
      role: this.role,
      timestamp: Date.now(),
    };

    try {
      await this.emergencyService.addUpdate(alert.id, status, event);
    } catch {
      this.errorMessage = 'No se pudo actualizar la emergencia. Inténtalo de nuevo.';
    }
  }

  kindLabel(kind: EmergencyKind): string {
    return {
      delay: 'retraso que podemos resolver',
      mechanic: 'requiere mecánico',
      tow: 'requiere grúa',
    }[kind];
  }

  statusLabel(status: string): string {
    return {
      reportada: 'Reportada',
      'ayuda-en-camino': 'Ayuda en camino',
      'mecanico-solicitado': 'Mecánico solicitado',
      'mecanico-en-camino': 'Mecánico en camino',
      'en-sitio': 'Mecánico en el sitio',
      'grua-en-camino': 'Grúa en camino',
      resuelta: 'Resuelta',
    }[status] ?? status;
  }

  isActive(alert: EmergencyAlert): boolean {
    return alert.status !== 'resuelta';
  }

  private get currentUserName(): string {
    const user = this.userService.currentUserSignal();
    return [user?.name, user?.lastName].filter(Boolean).join(' ') || 'Usuario';
  }

  ngOnDestroy(): void {
    this.stopListening?.();
  }
}
