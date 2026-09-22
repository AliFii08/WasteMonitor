import { Component, EventEmitter, Output, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  TallerService,
  Camion,
  TallerEstado,
  TallerPrioridad,
} from '../../../../@core/services/taller.service';
import { DashboardService } from '../../../../@core/services/dashboard.service';
import { UserService } from '../../../../@core/services/user.service';

export const RAZONES_INGRESO = [
  'Mantenimiento preventivo',
  'Falla de motor',
  'Sistema de frenos',
  'Cambio de neumáticos',
  'Sistema eléctrico / Batería',
  'Fuga de fluido / Aceite',
  'Falla en sistema hidráulico (Compactador)',
  'Accidente / Colisión',
  'Revisión periódica / ITV',
  'Otro',
] as const;

@Component({
  selector: 'app-create-vehicle-taller',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-vehicle-taller.html',
  styleUrl: './create-vehicle-taller.scss',
})
export class CreateVehicleTaller {
  private tallerService = inject(TallerService);
  private cdr = inject(ChangeDetectorRef);
  private dashboardService = inject(DashboardService);
  private userService = inject(UserService);

  @Output() created = new EventEmitter<void>();

  visible = false;
  saving = false;
  loadingCamiones = false;
  errorMsg = '';
  camiones: Camion[] = [];
  razonesOpciones = [...RAZONES_INGRESO];
  razonPersonalizada = '';

  form: {
    idCamion: string;
    razon: string;
    descripcion: string;
    estado: TallerEstado;
    prioridad: TallerPrioridad;
  } = this.emptyForm();

  async open(): Promise<void> {
    this.errorMsg = '';
    this.visible = true;
    this.loadingCamiones = true;
    this.form = this.emptyForm();
    this.razonPersonalizada = '';
    this.cdr.detectChanges();

    try {
      const allCamiones = await this.tallerService.getCamiones();
      // Filtrar solo camiones que no estén actualmente en taller
      this.camiones = allCamiones.filter((c) => !c.enTaller && c.activo !== false);
    } catch (err: any) {
      this.errorMsg = 'No se pudieron cargar los vehículos: ' + (err.message || err);
    } finally {
      this.loadingCamiones = false;
      this.cdr.detectChanges();
    }
  }

  close(): void {
    this.visible = false;
    this.errorMsg = '';
    this.saving = false;
  }

  async onSubmit(): Promise<void> {
    const razonFinal =
      this.form.razon === 'Otro' ? this.razonPersonalizada.trim() : this.form.razon;

    if (!this.form.idCamion || !razonFinal) return;

    this.saving = true;
    this.errorMsg = '';

    try {
      const camion = this.camiones.find((c) => c.idKey === this.form.idCamion);

      // 1) Crear registro en /taller
      await this.tallerService.crearRegistro({
        idCamion: this.form.idCamion,
        placa: camion?.placa,
        tipo: camion?.tipo,
        ruta: camion?.ruta,
        razon: razonFinal,
        descripcion: this.form.descripcion.trim(),
        estado: this.form.estado,
        prioridad: this.form.prioridad,
        activo: true,
      });

      // 2) Actualizar la marca en /camiones
      await this.tallerService.marcarCamionEnTaller(this.form.idCamion, true);

      // 3) Obtener usuario y rol dinámicamente
      const currentUser = this.userService.currentUserSignal();
      const usuarioNombre = currentUser
        ? `${currentUser.name || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email
        : 'Usuario Anónimo';
      const usuarioRol = currentUser?.rol || 'Sin Rol';

      // 4) Registrar en el historial del Dashboard con datos reales
      await this.dashboardService.registrarOperacion({
        usuario: usuarioNombre,
        rol: usuarioRol,
        accion: 'crear',
        modulo: 'Vehículos',
        detalle: `Vehículo ${this.form.idCamion} ingresado al taller (${razonFinal})`,
        fechaHora: new Date().toLocaleString(),
      });

      this.created.emit();
      this.close();
    } catch (err: any) {
      this.errorMsg = err?.message ?? 'Error al guardar el registro.';
    } finally {
      this.saving = false;
      this.cdr.detectChanges();
    }
  }

  private emptyForm() {
    return {
      idCamion: '',
      razon: '',
      descripcion: '',
      estado: 'en_reparacion' as TallerEstado,
      prioridad: 'media' as TallerPrioridad,
    };
  }
}
