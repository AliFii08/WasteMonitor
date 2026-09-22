import { Component, EventEmitter, inject, Input, Output, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Database, ref, get, update } from '@angular/fire/database';

export interface UsuarioOption {
  uid: string;
  nombreCompleto: string;
  email: string;
}

export interface CamionOption {
  idKey: string;
  placa?: string;
  tipo?: string;
}

@Component({
  selector: 'app-create-driver',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-driver.html',
  styleUrl: './create-driver.scss',
})
export class CreateDriver implements OnChanges {
  private db = inject(Database);
  private cdr = inject(ChangeDetectorRef);

  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() created = new EventEmitter<void>();

  saving = false;
  loadingData = false;
  errorMsg = '';

  usuariosDisponibles: UsuarioOption[] = [];
  camionesDisponibles: CamionOption[] = [];

  form = {
    uidUsuario: '',
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
    this.form = { uidUsuario: '', idCamion: '' };
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

      // 2. Obtener vehículos y filtrar disponibles (activo !== false && !enTaller)
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
    if (!this.form.uidUsuario || !this.form.idCamion) return;

    this.saving = true;
    this.errorMsg = '';

    try {
      // Promover el rol del usuario a 'crew' y asignar el camión elegido
      await update(ref(this.db, `usuarios/${this.form.uidUsuario}`), {
        rol: 'crew',
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