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
import { TripulacionTabla } from '../../../../@core/services/tripulacion.service';

interface UsuarioGrupoOption {
  uid: string;
  nombreCompleto: string;
  email: string;
  rol: 'supervisor' | 'conductor' | 'crew';
  camionId?: string;
}

export interface CamionOption {
  idKey: string;
  placa?: string;
  tipo?: string;
}

@Component({
  selector: 'app-update-crew',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './update-crew.html',
  styleUrl: './update-crew.scss',
})
export class UpdateCrew implements OnChanges {
  private db = inject(Database);
  private cdr = inject(ChangeDetectorRef);

  @Input() visible = false;
  @Input() driverData: TripulacionTabla | null = null;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() updated = new EventEmitter<void>();

  saving = false;
  loadingData = false;
  errorMsg = '';

  supervisoresDisponibles: UsuarioGrupoOption[] = [];
  conductoresDisponibles: UsuarioGrupoOption[] = [];
  crewDisponibles: UsuarioGrupoOption[] = [];
  camionesDisponibles: CamionOption[] = [];
  grupoActualUids: string[] = [];

  form = {
    supervisorUid: '',
    conductorUid: '',
    crewUids: [] as string[],
    idCamion: '',
  };

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['visible']?.currentValue === true && this.driverData) {
      await this.cargarDatos();
    }
  }

  async cargarDatos(): Promise<void> {
    if (!this.driverData) return;
    this.loadingData = true;
    this.errorMsg = '';
    const camionActual = this.driverData.camionAsignado !== 'Sin asignar' ? this.driverData.camionAsignado : '';
    this.form = { supervisorUid: '', conductorUid: '', crewUids: [], idCamion: camionActual };
    this.cdr.detectChanges();

    try {
      const [usersSnap, camionesSnap] = await Promise.all([
        get(ref(this.db, 'usuarios')),
        get(ref(this.db, 'camiones')),
      ]);

      const usuarios: UsuarioGrupoOption[] = [];
      const usersData = usersSnap.exists() ? usersSnap.val() : {};
      Object.entries<any>(usersData).forEach(([uid, user]) => {
        if (!user || !['supervisor', 'conductor', 'crew'].includes(user.rol)) return;
        if (user.camionId && user.camionId !== camionActual) return;
        usuarios.push({
          uid,
          nombreCompleto: `${user.name || ''} ${user.lastName || ''}`.trim() || 'Sin Nombre',
          email: user.email || 'Sin email',
          rol: user.rol,
          camionId: user.camionId,
        });
      });

      this.grupoActualUids = Object.entries<any>(usersData)
        .filter(([, user]) => user?.camionId === camionActual)
        .map(([uid]) => uid);
      const supervisorActual = usuarios.find((user) => user.rol === 'supervisor' && user.camionId === camionActual);
      const conductorActual = usuarios.find((user) => user.rol === 'conductor' && user.camionId === camionActual);
      this.form.supervisorUid = supervisorActual?.uid || '';
      this.form.conductorUid = conductorActual?.uid || '';
      this.form.crewUids = usuarios
        .filter((user) => user.rol === 'crew' && user.camionId === camionActual)
        .map((user) => user.uid);
      this.supervisoresDisponibles = usuarios.filter((user) => user.rol === 'supervisor');
      this.conductoresDisponibles = usuarios.filter((user) => user.rol === 'conductor');
      this.crewDisponibles = usuarios.filter((user) => user.rol === 'crew');

      const tempCamiones: CamionOption[] = [];

      if (camionesSnap.exists()) {
        const data = camionesSnap.val();
        Object.entries<any>(data).forEach(([idKey, c]) => {
          const esElMismoAsignado = idKey === camionActual;
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
      this.loadingData = false;
      this.cdr.detectChanges();
    }
  }

  async onSubmit(): Promise<void> {
    if (!this.driverData?.uid || !this.form.supervisorUid || !this.form.idCamion || this.form.crewUids.length > 4) {
      this.errorMsg = 'Debes asignar un supervisor y como máximo 4 personas de crew.';
      return;
    }

    this.saving = true;
    this.errorMsg = '';

    try {
      const selectedRoles = new Map<string, string>([[this.form.supervisorUid, 'supervisor']]);
      if (this.form.conductorUid) selectedRoles.set(this.form.conductorUid, 'conductor');
      this.form.crewUids.forEach((uid) => selectedRoles.set(uid, 'crew'));

      const updates: Record<string, string | null> = {};
      this.grupoActualUids.forEach((uid) => {
        if (!selectedRoles.has(uid)) {
          updates[`usuarios/${uid}/rol`] = 'user';
          updates[`usuarios/${uid}/camionId`] = null;
        }
      });
      selectedRoles.forEach((rol, uid) => {
        updates[`usuarios/${uid}/rol`] = rol;
        updates[`usuarios/${uid}/camionId`] = this.form.idCamion;
      });

      await update(ref(this.db), updates);

      this.updated.emit();
      this.cerrarModal();
    } catch (err: any) {
      this.errorMsg = 'Error al actualizar el conductor: ' + (err.message || err);
    } finally {
      this.saving = false;
      this.cdr.detectChanges();
    }
  }

  toggleCrew(uid: string, selected: boolean): void {
    if (selected) {
      if (this.form.crewUids.length < 4 && !this.form.crewUids.includes(uid)) {
        this.form.crewUids = [...this.form.crewUids, uid];
      }
      return;
    }

    this.form.crewUids = this.form.crewUids.filter((crewUid) => crewUid !== uid);
  }


  cerrarModal(): void {
    this.visible = false;
    this.visibleChange.emit(this.visible);
  }
}
