import { Component, EventEmitter, Output, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  TallerService,
  TallerRegistro,
  TallerEstado,
  TallerPrioridad,
} from '../../../../@core/services/taller.service';
import { RAZONES_INGRESO } from '../create-vehicle-taller/create-vehicle-taller';
import { DashboardService } from '../../../../@core/services/dashboard.service';

@Component({
  selector: 'app-update-vehicle-taller',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './update-vehicle-taller.html',
  styleUrl: './update-vehicle-taller.scss',
})
export class UpdateVehicleTaller {
  private tallerService = inject(TallerService);
  private cdr = inject(ChangeDetectorRef);
  private dashboardService = inject(DashboardService);

  @Output() updated = new EventEmitter<void>();

  visible = false;
  saving = false;
  errorMsg = '';
  razonesOpciones = [...RAZONES_INGRESO];
  razonPersonalizada = '';

  registroOriginal?: TallerRegistro;

  form: {
    idKey: string;
    idCamion: string;
    placa: string;
    tipo: string;
    ruta: string;
    razon: string;
    descripcion: string;
    estado: TallerEstado;
    prioridad: TallerPrioridad;
  } = this.emptyForm();

  open(registro: TallerRegistro): void {
    this.registroOriginal = { ...registro };
    this.errorMsg = '';
    this.visible = true;

    const esRazonPredeterminada = (this.razonesOpciones as readonly string[]).includes(
      registro.razon,
    );

    this.form = {
      idKey: registro.idKey || '',
      idCamion: registro.idCamion || '',
      placa: registro.placa || 'N/A',
      tipo: registro.tipo || 'N/A',
      ruta: registro.ruta || 'Sin asignar',
      razon: esRazonPredeterminada ? registro.razon : 'Otro',
      descripcion: registro.descripcion || '',
      estado: registro.estado || 'en_reparacion',
      prioridad: registro.prioridad || 'media',
    };

    this.razonPersonalizada = esRazonPredeterminada ? '' : registro.razon;
    this.cdr.detectChanges();
  }

  close(): void {
    this.visible = false;
    this.errorMsg = '';
    this.saving = false;
  }

  async onSubmit(): Promise<void> {
    if (!this.form.idKey || !this.form.idCamion) return;

    const razonFinal =
      this.form.razon === 'Otro' ? this.razonPersonalizada.trim() : this.form.razon;

    if (!razonFinal) return;

    this.saving = true;
    this.errorMsg = '';

    try {
      // 1) Actualizar el registro en /taller
      await this.tallerService.actualizarRegistro(this.form.idKey, {
        razon: razonFinal,
        descripcion: this.form.descripcion.trim(),
        estado: this.form.estado,
        prioridad: this.form.prioridad,
      });

      // 2) Sincronizar estado del camión si cambió a "listo" o volvió a reparación/espera
      const estaListo = this.form.estado === 'listo';
      await this.tallerService.marcarCamionEnTaller(this.form.idCamion, !estaListo);

      // 3) Registrar en el historial del Dashboard
      await this.dashboardService.registrarOperacion({
        usuario: 'Usuario Actual',
        rol: 'Administrador',
        accion: 'actualizar',
        modulo: 'Vehículos',
        detalle: `Mantenimiento del vehículo ${this.form.idCamion} actualizado a estado '${this.form.estado}'`,
        fechaHora: new Date().toLocaleString(),
      });

      this.updated.emit();
      this.close();
    } catch (err: any) {
      this.errorMsg = err?.message ?? 'Error al actualizar el registro.';
    } finally {
      this.saving = false;
      this.cdr.detectChanges();
    }
  }

  private emptyForm() {
    return {
      idKey: '',
      idCamion: '',
      placa: '',
      tipo: '',
      ruta: '',
      razon: '',
      descripcion: '',
      estado: 'en_reparacion' as TallerEstado,
      prioridad: 'media' as TallerPrioridad,
    };
  }
}
