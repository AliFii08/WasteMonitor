import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Database,
  ref,
  push,
  get,
  query,
  orderByChild,
  equalTo,
  set,
  remove,
  update,
} from '@angular/fire/database';
import { AuthService } from '../../../../@core/services/auth.service';

import { InformeService } from '../../../../@core/services/informe.service';
import { Auth } from '@angular/fire/auth';

export interface ViajeItem {
  id: string;
  key: string;
  numero: number;
  descripcion: string;
  direccionDelLlenado: string;
  tonRecogidas: number;
}

@Component({
  selector: 'app-update-journey-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './update-journey-report.html',
  styleUrl: './update-journey-report.scss',
})
export class UpdateJourneyReport implements OnChanges {
  @Input() visible: boolean = false;
  @Input() reporte: any = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);

  activeTab: string = 'general';
  viajesList: ViajeItem[] = [];

  camion: string = '';
  ruta: string = '';

  isLoading: boolean = false;
  isSubmitting: boolean = false;

  get isAdmin(): boolean {
    return this.authService.hasRole(['admin']);
  }

  // --- MINI MODAL NUEVO VIAJE ---
  showAddTripModal: boolean = false;
  isSavingTrip: boolean = false;
  nuevoViaje = {
    descripcion: '',
    direccionDelLlenado: '',
    tonRecogidas: 0,
  };

  showErrorModal: boolean = false;
  errorMessage: string = '';
  nombreUsuario: string = '';

  // Inyección de dependencias correcta para resolver TS2564
  constructor(
    private db: Database,
    private auth: Auth,
    private informe: InformeService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['reporte'] && this.reporte) {
      // 1. Asignar los campos base del informe (vehículo y ruta)
      this.camion = this.reporte.camionId || this.reporte.camion || '';
      this.ruta = this.reporte.rutaId || this.reporte.ruta || '';

      // 2. Asignar nombre previo si ya viene cargado en el objeto principal
      if (this.reporte.nombreUsuario) {
        this.nombreUsuario = this.reporte.nombreUsuario;
      }

      // 3. Obtener el ID del usuario creador
      const userId = this.reporte.usuario || this.reporte.usuarioId;
      if (userId) {
        this.cargarNombreUsuario(userId);
      }

      // 4. CARGAR LOS VIAJES ASOCIADOS AL INFORME
      this.cargarViajes();
    }
  }

  async cargarNombreUsuario(uid: string): Promise<void> {
    try {
      const userRef = ref(this.db, `usuarios/${uid}`);
      const snapshot = await get(userRef);

      if (snapshot.exists()) {
        const userData = snapshot.val();
        // Construir nombre completo
        const nombre = userData.name || userData.nombre || '';
        const apellido = userData.lastName || userData.apellido || '';

        this.nombreUsuario = `${nombre} ${apellido}`.trim() || 'Usuario sin nombre';
      } else {
        this.nombreUsuario = uid; // Fallback al ID si el nodo no existe
      }
    } catch (error) {
      console.error('Error al cargar nombre del usuario:', error);
      this.nombreUsuario = uid;
    } finally {
      this.cdr.detectChanges();
    }
  }

  async cargarViajes(): Promise<void> {
    if (!this.reporte?.id) return;
    this.isLoading = true;

    try {
      const viajesQuery = query(
        ref(this.db, 'viajes'),
        orderByChild('informeId'),
        equalTo(this.reporte.id),
      );

      const snapshot = await get(viajesQuery);
      this.viajesList = [];

      if (snapshot.exists()) {
        const data = snapshot.val();
        let index = 1;

        Object.keys(data).forEach((viajeKey) => {
          const v = data[viajeKey];
          this.viajesList.push({
            id: viajeKey,
            key: `viaje${index}`,
            numero: index,
            descripcion: String(v.descripcion || ''),
            direccionDelLlenado: String(v.direccionDelLlenado || v.direccionDeLlenado || ''),
            tonRecogidas: Number(v.tonRecogidas) || 0,
          });
          index++;
        });
      }

      this.activeTab = 'general';
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error al cargar viajes:', error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  // --- CONTROL DEL MINI MODAL ---
  abrirModalNuevoViaje(): void {
    this.nuevoViaje = { descripcion: '', direccionDelLlenado: '', tonRecogidas: 0 };
    this.showAddTripModal = true;
  }

  cerrarModalNuevoViaje(): void {
    this.showAddTripModal = false;
  }

  async guardarNuevoViaje(): Promise<void> {
    const targetInformeId = this.reporte?.id;
    if (!targetInformeId) return;

    this.isSavingTrip = true;

    try {
      const newTripRef = push(ref(this.db, 'viajes'));

      const payload = {
        informeId: String(targetInformeId),
        descripcion: String(this.nuevoViaje.descripcion || ''),
        direccionDelLlenado: String(this.nuevoViaje.direccionDelLlenado || ''),
        tonRecogidas: Number(this.nuevoViaje.tonRecogidas) || 0,
      };

      await set(newTripRef, payload);

      this.cerrarModalNuevoViaje();
      await this.cargarViajes();
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error al agregar viaje:', error);
      this.errorMessage = 'No se pudo crear el nuevo viaje.';
      this.showErrorModal = true;
    } finally {
      this.isSavingTrip = false;
    }
  }

  get viajeActivo(): ViajeItem | undefined {
    return this.viajesList.find((v) => v.key === this.activeTab);
  }

  // Guarda únicamente el viaje de la pestaña abierta
  async actualizarViajeActivo(): Promise<void> {
    const viaje = this.viajeActivo;

    if (!viaje || !viaje.id) {
      this.errorMessage = 'No se encontró el viaje seleccionado para actualizar.';
      this.showErrorModal = true;
      return;
    }

    this.isSubmitting = true;

    try {
      // Llamada directa al servicio pasando solo el objeto plano del viaje
      await this.informe.updateViajeIndividual(viaje.id, {
        descripcion: String(viaje.descripcion || ''),
        direccionDelLlenado: String(viaje.direccionDelLlenado || ''),
        tonRecogidas: Number(viaje.tonRecogidas) || 0,
      });

      await this.cargarViajes(); // Recarga para sincronizar los cambios
    } catch (error) {
      console.error('Error al actualizar viaje:', error);
      this.errorMessage = 'Ocurrió un error al actualizar el viaje.';
      this.showErrorModal = true;
    } finally {
      this.isSubmitting = false;
      this.cdr.detectChanges();
    }
  }
  // Método que delega la actualización al servicio para resolver TS2339
  async updateInforme(
    informeId: string,
    camion: string,
    ruta: string,
    viajes: ViajeItem[],
  ): Promise<void> {
    return this.informe.updateInforme(informeId, camion, ruta, viajes);
  }

  // --- GUARDAR EDICIONES DEL INFORME Y SUS VIAJES EXISTENTES ---
  async onSubmit(): Promise<void> {
    if (!this.reporte?.id) return;
    this.isSubmitting = true;

    try {
      await this.updateInforme(this.reporte.id, this.camion, this.ruta, this.viajesList);

      this.closeModal();
    } catch (error) {
      console.error('Error al actualizar informe:', error);
      this.errorMessage = 'Ocurrió un error al actualizar los datos.';
      this.showErrorModal = true;
    } finally {
      this.isSubmitting = false;
    }
  }

  get totalToneladas(): number {
    return this.viajesList.reduce((acc, v) => acc + (Number(v.tonRecogidas) || 0), 0);
  }

  selectTab(tabKey: string): void {
    this.activeTab = tabKey;
  }

  closeModal(): void {
    this.visible = false;
    this.visibleChange.emit(this.visible);
  }

  closeErrorModal(): void {
    this.showErrorModal = false;
  }

  agregarNuevoViaje(): void {
    this.abrirModalNuevoViaje();
  }

  async firmarInforme(): Promise<void> {
    if (!this.reporte?.id) return;

    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      this.errorMessage = 'No hay una sesión de usuario activa para firmar.';
      this.showErrorModal = true;
      return;
    }

    this.isSubmitting = true;

    try {
      const informeRef = ref(this.db, `informe_de_viaje/${this.reporte.id}`);

      const payloadActualizacion = {
        estado: 'firmado',
        firmadoEl: new Date().toISOString(),
        firmadoPor: currentUser.uid, // Guardamos el UID del usuario que firma
      };

      // Actualizar en Realtime Database
      await update(informeRef, payloadActualizacion);

      // Actualizar estado local para la vista
      this.reporte.estado = 'firmado';
      this.reporte.firmadoEl = payloadActualizacion.firmadoEl;
      this.reporte.firmadoPor = payloadActualizacion.firmadoPor;

      this.closeModal();
    } catch (error) {
      console.error('Error al firmar el informe:', error);
      this.errorMessage = 'No se pudo registrar la firma del informe.';
      this.showErrorModal = true;
    } finally {
      this.isSubmitting = false;
      this.cdr.detectChanges();
    }
  }

  async eliminarViaje(index: number, event: Event): Promise<void> {
    event.stopPropagation();

    const viajeAEliminar = this.viajesList[index];
    if (!viajeAEliminar) return;

    if (confirm(`¿Deseas eliminar el Viaje ${viajeAEliminar.numero}?`)) {
      if (viajeAEliminar.id) {
        await this.eliminarViajeDeFirebase(viajeAEliminar.id);
      } else {
        this.viajesList.splice(index, 1);
        this.reordenarViajes();
      }
    }
  }

  private async eliminarViajeDeFirebase(viajeId: string): Promise<void> {
    this.isLoading = true;
    try {
      await remove(ref(this.db, `viajes/${viajeId}`));
      await this.cargarViajes();
    } catch (error) {
      console.error('Error al eliminar viaje:', error);
      this.errorMessage = 'No se pudo eliminar el viaje.';
      this.showErrorModal = true;
    } finally {
      this.isLoading = false;
    }
  }

  private reordenarViajes(): void {
    this.viajesList.forEach((v, i) => {
      v.numero = i + 1;
      v.key = `viaje${i + 1}`;
    });

    if (!this.viajesList.some((v) => v.key === this.activeTab)) {
      this.activeTab = 'general';
    }
  }
}
