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
  asignado: boolean; // Indica si pertenece a OTRO equipo
}

export interface CamionOption {
  idKey: string;
  placa?: string;
  tipo?: string;
  asignado: boolean; // Indica si pertenece a OTRO equipo
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
  isClosing = false;

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

    const grupoKey = this.driverData.uid;

    try {
      const [usersSnap, camionesSnap, gruposSnap] = await Promise.all([
        get(ref(this.db, 'usuarios')),
        get(ref(this.db, 'camiones')),
        get(ref(this.db, 'grupoTripulacion')),
      ]);

      const usersData = usersSnap.exists() ? usersSnap.val() : {};
      const camionesData = camionesSnap.exists() ? camionesSnap.val() : {};
      const gruposData = gruposSnap.exists() ? gruposSnap.val() : {};

      const grupoActual = gruposData[grupoKey] || {};

      // 1. Identificar UIDs de usuarios y Camión que pertenecen a OTROS equipos
      const usuariosOcupadosEnOtros = new Set<string>();
      const camionesOcupadosEnOtros = new Set<string>();

      Object.entries<any>(gruposData).forEach(([k, g]) => {
        if (!g || typeof g !== 'object' || k === grupoKey) return;
        if (g.camion === 'idcamion' || g.supervisor === 'idusuario') return;

        if (g.supervisor) usuariosOcupadosEnOtros.add(g.supervisor);
        if (g.conductor) usuariosOcupadosEnOtros.add(g.conductor);
        if (g.camion) camionesOcupadosEnOtros.add(g.camion);

        if (g.crew && typeof g.crew === 'object') {
          Object.values<string>(g.crew).forEach((uid) => {
            if (uid) usuariosOcupadosEnOtros.add(uid);
          });
        }
      });

      // 2. Cargar los seleccionados actualmente en este grupo
      this.form.supervisorUid = grupoActual.supervisor || '';
      this.form.conductorUid = grupoActual.conductor || '';
      this.form.idCamion = grupoActual.camion || '';
      this.form.crewUids = grupoActual.crew ? Object.values<string>(grupoActual.crew) : [];

      // Guardar lista previa para desasignar si sufren cambios
      this.grupoActualUids = [
        this.form.supervisorUid,
        this.form.conductorUid,
        ...this.form.crewUids,
      ].filter(Boolean);

      // 3. Procesar Usuarios con la bandera de asignado a OTRO equipo
      const usuariosTemp: UsuarioGrupoOption[] = [];
      Object.entries<any>(usersData).forEach(([uid, user]) => {
        if (!user || (!user.name && !user.nombreUsuario)) return;

        const rol = user.rol;
        if (!['supervisor', 'conductor', 'crew'].includes(rol)) return;

        const estaAsignadoEnOtro = usuariosOcupadosEnOtros.has(uid);

        usuariosTemp.push({
          uid,
          nombreCompleto: `${user.name || user.nombreUsuario || ''} ${user.lastName || ''}`.trim() || 'Sin Nombre',
          email: user.email || user.correo || 'Sin email',
          rol,
          camionId: user.camionId,
          asignado: estaAsignadoEnOtro,
        });
      });

      this.supervisoresDisponibles = usuariosTemp.filter((u) => u.rol === 'supervisor');
      this.conductoresDisponibles = usuariosTemp.filter((u) => u.rol === 'conductor');
      this.crewDisponibles = usuariosTemp.filter((u) => u.rol === 'crew');

      // 4. Procesar Camiones con la bandera de asignado a OTRO equipo
      const tempCamiones: CamionOption[] = [];
      Object.entries<any>(camionesData).forEach(([idKey, c]) => {
        if (c && c.activo !== false && !c.enTaller) {
          tempCamiones.push({
            idKey,
            placa: c.placa,
            tipo: c.tipo,
            asignado: camionesOcupadosEnOtros.has(idKey),
          });
        }
      });

      this.camionesDisponibles = tempCamiones;
    } catch (err: any) {
      this.errorMsg = 'Error al cargar los datos del grupo: ' + (err.message || err);
    } finally {
      this.loadingData = false;
      this.cdr.detectChanges();
    }
  }

  async onSubmit(): Promise<void> {
    if (!this.driverData?.uid || !this.form.supervisorUid || !this.form.idCamion || this.form.crewUids.length > 4) {
      this.errorMsg = 'Debes asignar un supervisor, un vehículo y como máximo 4 personas de crew.';
      return;
    }

    this.saving = true;
    this.errorMsg = '';

    try {
      const grupoKey = this.driverData.uid;

      // Armar el mapa del crew para grupoTripulacion
      const crewMap: Record<string, string> = {};
      this.form.crewUids.forEach((uid, index) => {
        crewMap[`crew${index + 1}`] = uid;
      });

      const updates: Record<string, any> = {};

      // 1. Actualizar el nodo del grupo de tripulación
      updates[`grupoTripulacion/${grupoKey}`] = {
        camion: this.form.idCamion,
        supervisor: this.form.supervisorUid,
        conductor: this.form.conductorUid || '',
        crew: crewMap,
      };

      // 2. Limpiar camionId a los usuarios que salieron del grupo
      const nuevosIntegrantes = new Set([
        this.form.supervisorUid,
        this.form.conductorUid,
        ...this.form.crewUids,
      ]);

      this.grupoActualUids.forEach((uid) => {
        if (!nuevosIntegrantes.has(uid)) {
          updates[`usuarios/${uid}/camionId`] = null;
        }
      });

      // 3. Asignar camionId a los nuevos/mantenidos miembros
      nuevosIntegrantes.forEach((uid) => {
        if (uid) {
          updates[`usuarios/${uid}/camionId`] = this.form.idCamion;
        }
      });

      await update(ref(this.db), updates);

      this.updated.emit();
      this.cerrarModal();
    } catch (err: any) {
      this.errorMsg = 'Error al actualizar el grupo: ' + (err.message || err);
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
    if (this.isClosing) return;
    this.isClosing = true;
    setTimeout(() => {
      this.isClosing = false;
      this.visible = false;
      this.visibleChange.emit(this.visible);
    }, 180);
  }
}