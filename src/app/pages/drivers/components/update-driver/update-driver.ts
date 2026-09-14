import {
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
  OnChanges,
  SimpleChanges,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Database, ref, get, update } from '@angular/fire/database';
import { ConductorTabla } from '../../../../@core/services/conductores.service';

export interface CamionOption {
  idKey: string;
  placa?: string;
  tipo?: string;
}

@Component({
  selector: 'app-update-driver',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './update-driver.html',
  styleUrl: './update-driver.scss',
})
export class UpdateDriver implements OnChanges {
  private db = inject(Database);
  private cdr = inject(ChangeDetectorRef);

  @Input() visible = false;
  @Input() driverData: ConductorTabla | null = null;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() updated = new EventEmitter<void>();

  saving = false;
  loadingCamiones = false;
  errorMsg = '';

  camionesDisponibles: CamionOption[] = [];

  form = {
    rol: 'crew',
    idCamion: '',
  };

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['visible']?.currentValue === true && this.driverData) {
      this.initForm();
      await this.cargarCamionesDisponibles();
    }
  }

  private initForm(): void {
    if (!this.driverData) return;
    this.form = {
      rol: this.driverData.cargo || 'crew',
      idCamion: this.driverData.camionAsignado !== 'Sin asignar' ? this.driverData.camionAsignado : '',
    };
  }

  async cargarCamionesDisponibles(): Promise<void> {
    this.loadingCamiones = true;
    this.errorMsg = '';
    this.cdr.detectChanges();

    try {
      const camionesSnap = await get(ref(this.db, 'camiones'));
      const tempCamiones: CamionOption[] = [];

      if (camionesSnap.exists()) {
        const data = camionesSnap.val();
        Object.entries<any>(data).forEach(([idKey, c]) => {
          // Permitir el camión que ya tiene asignado actualmente O los que estén disponibles sin taller
          const esElMismoAsignado = idKey === this.driverData?.camionAsignado;
          const estaDisponible = c && c.activo !== false && !c.enTaller && c.estado === 'disponible';

          if (estaDisponible || esElMismoAsignado) {
            tempCamiones.push({
              idKey,
              placa: c.placa,
              tipo: c.tipo,
            });
          }
        });
      }

      this.camionesDisponibles = tempCamiones;
    } catch (err: any) {
      this.errorMsg = 'Error al cargar los vehículos: ' + (err.message || err);
    } finally {
      this.loadingCamiones = false;
      this.cdr.detectChanges();
    }
  }

  async onSubmit(): Promise<void> {
    if (!this.driverData?.uid || !this.form.rol || !this.form.idCamion) return;

    this.saving = true;
    this.errorMsg = '';

    try {
      // Actualizar rol y vehículo del usuario en Firebase Realtime Database
      await update(ref(this.db, `usuarios/${this.driverData.uid}`), {
        rol: this.form.rol,
        camionId: this.form.idCamion,
      });

      this.updated.emit();
      this.cerrarModal();
    } catch (err: any) {
      this.errorMsg = 'Error al actualizar el conductor: ' + (err.message || err);
    } finally {
      this.saving = false;
      this.cdr.detectChanges();
    }
  }


  cerrarModal(): void {
    this.visible = false;
    this.visibleChange.emit(this.visible);
  }
}