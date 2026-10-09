import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Database,
  ref,
  push,
  get,
  set,
  remove,
  update,
} from '@angular/fire/database';
import { AuthService } from '../../../../@core/services/auth.service';
import { SessionTimeoutService } from '../../../../@core/services/session-timeout.service';

import { InformeService } from '../../../../@core/services/informe.service';
import { Auth } from '@angular/fire/auth';
import { LocationService } from '../../../../@core/services/location.service';

export interface ViajeItem {
  id: string;
  key: string;
  numero: number;
  descripcion: string;
  direccionDelLlenado: string;
  tonRecogidas: number | null;
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
  private sessionTimeoutService = inject(SessionTimeoutService);
  private locationService = inject(LocationService);

  activeTab: string = 'general';
  viajesList: ViajeItem[] = [];

  camion: string = '';
  ruta: string = '';

  isLoading: boolean = false;
  isSubmitting: boolean = false;
  isClosing = false;

  get isAdmin(): boolean {
    return this.authService.hasRole(['admin']);
  }

  get isSupervisor(): boolean {
    return this.authService.hasRole(['supervisor']);
  }

  get puedeFinalizar(): boolean {
    const estado = String(this.reporte?.estado || '').toLowerCase();
    return this.isSupervisor && this.puedeEditarInforme && estado !== 'finalizado' && estado !== 'firmado';
  }

  get puedeEditarInforme(): boolean {
    const currentUserId = this.auth.currentUser?.uid;
    const creatorId =
      this.reporte?.uidUsuario ||
      this.reporte?.idUsuario ||
      this.reporte?.usuario ||
      this.reporte?.usuarioId ||
      this.reporte?.userId;
    const estado = String(this.reporte?.estado ?? '').toLowerCase();
    return !!currentUserId && creatorId === currentUserId &&
      estado !== 'finalizado' && estado !== 'firmado' && this.reporte?.estado !== true;
  }

  get estaFirmado(): boolean {
    return String(this.reporte?.estado || '').toLowerCase() === 'firmado';
  }

  // --- MINI MODAL NUEVO VIAJE ---
  showAddTripModal: boolean = false;
  isSavingTrip: boolean = false;
  nuevoViaje = {
    descripcion: '',
    direccionDelLlenado: '',
    tonRecogidas: null as number | null,
  };

  showErrorModal: boolean = false;
  errorMessage: string = '';
  nombreUsuario: string = '';

  constructor(
    private db: Database,
    private auth: Auth,
    private informe: InformeService,
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['reporte'] && this.reporte) {
      this.camion = this.reporte.camionId || this.reporte.camion || '';
      this.ruta = this.reporte.rutaId || this.reporte.ruta || '';

      if (this.reporte.nombreUsuario) {
        this.nombreUsuario = this.reporte.nombreUsuario;
      }

      const userId = this.reporte.usuario || this.reporte.usuarioId;
      if (userId) {
        this.cargarNombreUsuario(userId);
        this.completarAsignacionSiHaceFalta(userId);
      }

      this.cargarViajes();
    }
  }

  private async completarAsignacionSiHaceFalta(uid: string): Promise<void> {
    if (this.camion && this.ruta) return;

    try {
      const asignacion = await this.informe.obtenerAsignacionActual(uid);
      this.camion = this.camion || asignacion.camion;
      this.ruta = this.ruta || asignacion.ruta;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error al cargar la asignación del supervisor:', error);
    }
  }

  async cargarNombreUsuario(uid: string): Promise<void> {
    try {
      const userRef = ref(this.db, `usuarios/${uid}`);
      const snapshot = await get(userRef);

      if (snapshot.exists()) {
        const userData = snapshot.val();
        const nombre = userData.name || userData.nombre || '';
        const apellido = userData.lastName || userData.apellido || '';

        this.nombreUsuario = `${nombre} ${apellido}`.trim() || 'Usuario sin nombre';
      } else {
        this.nombreUsuario = uid;
      }
    } catch (error) {
      console.error('Error al cargar nombre del usuario:', error);
      this.nombreUsuario = uid;
    } finally {
      this.cdr.detectChanges();
    }
  }

  async cargarViajes(): Promise<void> {
    const informeId = String(this.reporte?.id ?? '');
    if (!informeId) return;
    this.isLoading = true;

    try {
      const snapshot = await get(ref(this.db, 'viajes'));
      this.viajesList = [];

      if (snapshot.exists()) {
        const data = snapshot.val() as Record<string, any>;
        let index = 1;

        Object.entries(data).forEach(([viajeKey, v]) => {
          if (String(v?.informeId ?? '') !== informeId) return;
          this.viajesList.push({
            id: viajeKey,
            key: `viaje${index}`,
            numero: index,
            descripcion: String(v.descripcion || ''),
            direccionDelLlenado: String(v.direccionDelLlenado || v.direccionDeLlenado || ''),
            tonRecogidas: v.tonRecogidas === '' || v.tonRecogidas == null
              ? null
              : Number(v.tonRecogidas),
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
    if (!this.puedeEditarInforme) return;
    this.nuevoViaje = { descripcion: '', direccionDelLlenado: '', tonRecogidas: null };
    this.showAddTripModal = true;
  }

  cerrarModalNuevoViaje(): void {
    this.showAddTripModal = false;
  }

  async guardarNuevoViaje(): Promise<void> {
    if (!this.puedeEditarInforme) return;
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

  async actualizarViajeActivo(): Promise<void> {
    if (!this.puedeEditarInforme) return;
    const viaje = this.viajeActivo;

    if (!viaje || !viaje.id) {
      this.errorMessage = 'No se encontró el viaje seleccionado para actualizar.';
      this.showErrorModal = true;
      return;
    }

    this.isSubmitting = true;

    try {
      await this.informe.updateViajeIndividual(viaje.id, {
        descripcion: String(viaje.descripcion || ''),
        direccionDelLlenado: String(viaje.direccionDelLlenado || ''),
        tonRecogidas: Number(viaje.tonRecogidas) || 0,
      });

      await this.cargarViajes();
    } catch (error) {
      console.error('Error al actualizar viaje:', error);
      this.errorMessage = 'Ocurrió un error al actualizar el viaje.';
      this.showErrorModal = true;
    } finally {
      this.isSubmitting = false;
      this.cdr.detectChanges();
    }
  }

  async onSubmit(): Promise<void> {
    if (!this.reporte?.id || !this.puedeEditarInforme) return;
    this.isSubmitting = true;

    try {
      await this.informe.updateInforme(this.reporte.id, this.camion, this.ruta, this.viajesList);
      this.closeModal();
    } catch (error) {
      console.error('Error al actualizar informe:', error);
      this.errorMessage = 'Ocurrió un error al actualizar los datos.';
      this.showErrorModal = true;
    } finally {
      this.isSubmitting = false;
    }
  }

  async finalizarInforme(): Promise<void> {
    if (!this.reporte?.id || !this.puedeFinalizar) return;

    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      this.errorMessage = 'No hay una sesión de usuario activa para finalizar la jornada.';
      this.showErrorModal = true;
      return;
    }

    if (!confirm('¿Confirmas que todos los viajes de esta jornada están registrados?')) return;

    this.isSubmitting = true;

    try {
      await this.informe.finalizarInforme(this.reporte.id, currentUser.uid);
      this.reporte.estado = 'finalizado';
      this.reporte.finalizadoEl = new Date().toISOString();
      this.reporte.finalizadoPor = currentUser.uid;
      this.sessionTimeoutService.setJourneyActive(false);
      this.closeModal();
    } catch (error) {
      console.error('Error al finalizar el informe:', error);
      this.errorMessage = 'No se pudo finalizar la jornada.';
      this.showErrorModal = true;
    } finally {
      this.isSubmitting = false;
      this.cdr.detectChanges();
    }
  }

  get totalToneladas(): number {
    return this.viajesList.reduce((acc, v) => acc + (Number(v.tonRecogidas) || 0), 0);
  }

  limpiarToneladasSiEsCero(viaje: ViajeItem): void {
    if (viaje.tonRecogidas === 0) viaje.tonRecogidas = null;
  }

  limpiarNuevasToneladasSiEsCero(): void {
    if (this.nuevoViaje.tonRecogidas === 0) this.nuevoViaje.tonRecogidas = null;
  }

  selectTab(tabKey: string): void {
    this.activeTab = tabKey;
  }

  closeModal(): void {
    if (this.isClosing) return;
    this.isClosing = true;
    setTimeout(() => {
      this.isClosing = false;
      this.visible = false;
      this.visibleChange.emit(this.visible);
    }, 180);
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
        firmadoPor: currentUser.uid,
      };

      await update(informeRef, payloadActualizacion);

      this.reporte.estado = 'firmado';
      this.reporte.firmadoEl = payloadActualizacion.firmadoEl;
      this.reporte.firmadoPor = payloadActualizacion.firmadoPor;

      if (this.authService.hasRole(['supervisor'])) {
        this.sessionTimeoutService.setJourneyActive(false);
      }

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

    if (!this.puedeEditarInforme) return;

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
    if (!this.puedeEditarInforme) return;
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