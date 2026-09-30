import { Component, EventEmitter, inject, Input, Output, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Database, ref, get, update } from '@angular/fire/database';

export interface UsuarioOption {
  uid: string;
  nombreCompleto: string;
  email: string;
}

export interface RolOption {
  id: string;
  nombre: string;
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

  usuariosDisponibles: UsuarioOption[] = [];
  
  // Lista fija de roles solicitados
  rolesDisponibles: RolOption[] = [
    { id: 'mecanico', nombre: 'Mecánico' },
    { id: 'crew', nombre: 'Crew' },
    { id: 'conductor', nombre: 'Conductor' },
    { id: 'supervisor', nombre: 'Supervisor' },
  ];
  
  camionesDisponibles: CamionOption[] = [];

  form = {
    uidUsuario: '',
    rol: '',
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
    this.form = { uidUsuario: '', rol: '', idCamion: '' };
    this.cdr.detectChanges();

    try {
      // 1. Obtener usuarios y filtrar por rol === 'user'
      const usersSnap = await get(ref(this.db, 'usuarios'));
      const usuariosTemp: UsuarioOption[] = [];
      if (usersSnap.exists()) {
        const usersData = usersSnap.val();
        Object.entries<any>(usersData).forEach(([uid, user]) => {
          if (user && user.rol === 'user') {
            const nombre = `${user.name || ''} ${user.lastName || ''}`.trim() || 'Sin Nombre';
            usuariosTemp.push({
              uid,
              nombreCompleto: nombre,
              email: user.email || 'Sin email',
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

      this.usuariosDisponibles = usuariosTemp;
      this.camionesDisponibles = camionesTemp;
    } catch (err: any) {
      this.errorMsg = 'Error al cargar los datos necesarios: ' + (err.message || err);
    } finally {
      this.loadingData = false;
      this.cdr.detectChanges();
    }
  }

  async onSubmit(): Promise<void> {
    if (!this.form.uidUsuario || !this.form.rol || !this.form.idCamion) return;

    this.saving = true;
    this.errorMsg = '';

    try {
      // Actualizar el rol seleccionado y asignar el camión elegido al usuario
      await update(ref(this.db, `usuarios/${this.form.uidUsuario}`), {
        rol: this.form.rol,
        camionId: this.form.idCamion,
      });

      this.created.emit();
      this.cerrarModal();
    } catch (err: any) {
      this.errorMsg = 'Error al guardar la asignación: ' + (err.message || err);
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