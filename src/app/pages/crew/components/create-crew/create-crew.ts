import { Component, EventEmitter, inject, Input, Output, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Database, ref, get, update } from '@angular/fire/database';

export interface UsuarioOption {
  uid: string;
  nombreCompleto: string;
  email: string;
  rol: 'supervisor' | 'conductor' | 'crew';
}

export interface CamionOption {
  idKey: string;
  placa?: string;
  tipo?: string;
}

@Component({
  selector: 'app-create-crew',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-crew.html',
  styleUrl: './create-crew.scss',
})
export class CreateCrew implements OnChanges {
  private db = inject(Database);
  private cdr = inject(ChangeDetectorRef);

  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() created = new EventEmitter<void>();

  saving = false;
  loadingData = false;
  errorMsg = '';

  supervisoresDisponibles: UsuarioOption[] = [];
  conductoresDisponibles: UsuarioOption[] = [];
  crewDisponibles: UsuarioOption[] = [];
  camionesDisponibles: CamionOption[] = [];

  form = {
    supervisorUid: '',
    conductorUid: '',
    crewUids: [] as string[],
    idCamion: '',
  };

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['visible']?.currentValue === true) {
      await this.cargarDatos();
    }
  }

  async cargarDatos(): Promise<void> {
    this.loadingData = true;
    this.errorMsg = '';
    this.form = { supervisorUid: '', conductorUid: '', crewUids: [], idCamion: '' };
    this.cdr.detectChanges();

    try {
      // Solo se ofrecen personas sin camionId: ya pertenecen a otro grupo si tienen uno.
      const usersSnap = await get(ref(this.db, 'usuarios'));
      const usuariosTemp: UsuarioOption[] = [];
      if (usersSnap.exists()) {
        const usersData = usersSnap.val();
        Object.entries<any>(usersData).forEach(([uid, user]) => {
          if (user && ['supervisor', 'conductor', 'crew'].includes(user.rol) && !user.camionId) {
            const nombre = `${user.name || ''} ${user.lastName || ''}`.trim() || 'Sin Nombre';
            usuariosTemp.push({
              uid,
              nombreCompleto: nombre,
              email: user.email || 'Sin email',
              rol: user.rol,
            });
          }
        });
      }

      // 2. Obtener vehículos disponibles (activo !== false && !enTaller)
      const camionesSnap = await get(ref(this.db, 'camiones'));
      const camionesTemp: CamionOption[] = [];
      if (camionesSnap.exists()) {
        const camionesData = camionesSnap.val();
        Object.entries<any>(camionesData).forEach(([idKey, camion]) => {
          if (camion && camion.activo !== false && !camion.enTaller && camion.estado === 'disponible') {
            camionesTemp.push({
              idKey,
              placa: camion.placa,
              tipo: camion.tipo,
            });
          }
        });
      }

      this.supervisoresDisponibles = usuariosTemp.filter((user) => user.rol === 'supervisor');
      this.conductoresDisponibles = usuariosTemp.filter((user) => user.rol === 'conductor');
      this.crewDisponibles = usuariosTemp.filter((user) => user.rol === 'crew');
      this.camionesDisponibles = camionesTemp;
    } catch (err: any) {
      this.errorMsg = 'Error al cargar los datos necesarios: ' + (err.message || err);
    } finally {
      this.loadingData = false;
      this.cdr.detectChanges();
    }
  }

  async onSubmit(): Promise<void> {
    if (!this.form.supervisorUid || !this.form.idCamion || this.form.crewUids.length > 4) {
      this.errorMsg = 'Debes asignar un supervisor y como máximo 4 personas de crew.';
      return;
    }

    this.saving = true;
    this.errorMsg = '';

    try {
      const updates: Record<string, string> = {
        [`usuarios/${this.form.supervisorUid}/rol`]: 'supervisor',
        [`usuarios/${this.form.supervisorUid}/camionId`]: this.form.idCamion,
      };

      if (this.form.conductorUid) {
        updates[`usuarios/${this.form.conductorUid}/rol`] = 'conductor';
        updates[`usuarios/${this.form.conductorUid}/camionId`] = this.form.idCamion;
      }

      this.form.crewUids.forEach((uid) => {
        updates[`usuarios/${uid}/rol`] = 'crew';
        updates[`usuarios/${uid}/camionId`] = this.form.idCamion;
      });

      await update(ref(this.db), updates);

      this.created.emit();
      this.cerrarModal();
    } catch (err: any) {
      this.errorMsg = 'Error al guardar la asignación: ' + (err.message || err);
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
