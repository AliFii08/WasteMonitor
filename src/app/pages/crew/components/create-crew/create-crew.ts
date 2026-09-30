import { Component, EventEmitter, inject, Input, Output, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../../environments/environment';

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
  private cdr = inject(ChangeDetectorRef);
  private databaseUrl = environment.firebaseConfig.databaseURL;

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
      // 1. Obtener usuarios mediante FETCH
      const resUsers = await fetch(`${this.databaseUrl}/usuarios.json`);
      if (!resUsers.ok) throw new Error('No se pudo obtener la lista de usuarios.');
      const usersData = await resUsers.json();

      const supervisoresTemp: UsuarioOption[] = [];
      const conductoresTemp: UsuarioOption[] = [];
      const crewTemp: UsuarioOption[] = [];

      if (usersData) {
        Object.entries<any>(usersData).forEach(([uid, user]) => {
          // Omitir registros incompletos o de prueba sin identificador de nombre
          if (!user || (!user.name && !user.nombreUsuario)) return;

          const nombre = `${user.name || user.nombreUsuario || ''} ${user.lastName || ''}`.trim();
          const email = user.email || user.correo || 'Sin email';
          const userRol = user.rol;

          // Clasificar según el rol asignado
          if (userRol === 'supervisor') {
            supervisoresTemp.push({ uid, nombreCompleto: nombre, email, rol: 'supervisor' });
          } else if (userRol === 'conductor') {
            conductoresTemp.push({ uid, nombreCompleto: nombre, email, rol: 'conductor' });
          } else if (userRol === 'crew') {
            crewTemp.push({ uid, nombreCompleto: nombre, email, rol: 'crew' });
          }
        });
      }

      // 2. Obtener camiones disponibles
      const resCamiones = await fetch(`${this.databaseUrl}/camiones.json`);
      if (!resCamiones.ok) throw new Error('No se pudo obtener la lista de camiones.');
      const camionesData = await resCamiones.json();

      const camionesTemp: CamionOption[] = [];
      if (camionesData) {
        Object.entries<any>(camionesData).forEach(([idKey, camion]) => {
          if (camion && camion.activo !== false && !camion.enTaller) {
            camionesTemp.push({
              idKey,
              placa: camion.placa,
              tipo: camion.tipo,
            });
          }
        });
      }

      this.supervisoresDisponibles = supervisoresTemp;
      this.conductoresDisponibles = conductoresTemp;
      this.crewDisponibles = crewTemp;
      this.camionesDisponibles = camionesTemp;
    } catch (err: any) {
      this.errorMsg = 'Error al cargar los datos: ' + (err.message || err);
    } finally {
      this.loadingData = false;
      this.cdr.detectChanges();
    }
  }

  async onSubmit(): Promise<void> {
    if (!this.form.supervisorUid || !this.form.idCamion || this.form.crewUids.length > 4) {
      this.errorMsg = 'Debes asignar un supervisor, un vehículo y como máximo 4 personas de crew.';
      return;
    }

    this.saving = true;
    this.errorMsg = '';

    try {
      const crewMap: Record<string, string> = {};
      this.form.crewUids.forEach((uid, index) => {
        crewMap[`crew${index + 1}`] = uid;
      });

      const nuevoGrupo = {
        camion: this.form.idCamion,
        supervisor: this.form.supervisorUid,
        conductor: this.form.conductorUid || '',
        crew: crewMap,
      };

      const resGrupo = await fetch(`${this.databaseUrl}/grupoTripulacion.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoGrupo),
      });

      if (!resGrupo.ok) throw new Error('Error al registrar el grupo de tripulación.');

      const updatesUsuarios: Record<string, any> = {};

      updatesUsuarios[`/usuarios/${this.form.supervisorUid}/camionId`] = this.form.idCamion;

      if (this.form.conductorUid) {
        updatesUsuarios[`/usuarios/${this.form.conductorUid}/camionId`] = this.form.idCamion;
      }

      this.form.crewUids.forEach((uid) => {
        updatesUsuarios[`/usuarios/${uid}/camionId`] = this.form.idCamion;
      });

      const resUpdates = await fetch(`${this.databaseUrl}/.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatesUsuarios),
      });

      if (!resUpdates.ok) throw new Error('Error al asignar el camión a los usuarios.');

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