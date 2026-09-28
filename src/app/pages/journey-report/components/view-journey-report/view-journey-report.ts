import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  OnDestroy,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Database, ref, get, onValue, Unsubscribe } from '@angular/fire/database';

export interface ViajeItem {
  id: string;
  key: string;
  numero: number;
  descripcion: string;
  direccionDelLlenado: string;
  tonRecogidas: number;
}

@Component({
  selector: 'app-view-journey-report',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './view-journey-report.html',
  styleUrl: './view-journey-report.scss',
})
export class ViewJourneyReport implements OnChanges, OnDestroy {
  @Input() visible: boolean = false;
  @Input() reporte: any = null;
  @Output() visibleChange = new EventEmitter<boolean>();

  private cdr = inject(ChangeDetectorRef);
  private db = inject(Database);

  nombreUsuarioFirma: string = '';
  activeTab: string = 'general';
  viajesList: ViajeItem[] = [];
  isLoading: boolean = false;

  private viajesUnsubscribe: Unsubscribe | null = null;

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if ((changes['reporte'] || changes['visible']) && this.visible && this.reporte?.id) {
      this.escucharViajesEnTiempoReal();
      await this.cargarNombreFirmante();
    } else if (!this.visible) {
      this.limpiarSuscripcion();
    }
  }

  ngOnDestroy(): void {
    this.limpiarSuscripcion();
  }

  escucharViajesEnTiempoReal(): void {
    const targetInformeId = String(this.reporte?.id || '');
    if (!targetInformeId) return;

    this.limpiarSuscripcion();
    this.isLoading = true;

    // Escuchamos directamente la colección /viajes para evitar fallos por falta de índices (.indexOn)
    const viajesRef = ref(this.db, 'viajes');

    this.viajesUnsubscribe = onValue(
      viajesRef,
      (snapshot) => {
        const nuevosViajes: ViajeItem[] = [];

        if (snapshot.exists()) {
          const data = snapshot.val();
          let index = 1;

          Object.keys(data).forEach((viajeKey) => {
            const v = data[viajeKey];

            // Filtrado manual estricto en memoria comparando los IDs
            if (String(v.informeId || '') === targetInformeId) {
              nuevosViajes.push({
                id: viajeKey,
                key: `viaje${index}`,
                numero: index,
                descripcion: String(v.descripcion || ''),
                direccionDelLlenado: String(v.direccionDelLlenado || v.direccionDeLlenado || ''),
                tonRecogidas: Number(v.tonRecogidas) || 0,
              });
              index++;
            }
          });
        }

        this.viajesList = nuevosViajes;

        // Si la pestaña activa era de un viaje que fue borrado, volver a la pestaña general
        if (
          this.activeTab !== 'general' &&
          !this.viajesList.some((v) => v.key === this.activeTab)
        ) {
          this.activeTab = 'general';
        }

        this.isLoading = false;
        this.cdr.detectChanges();
      },
      (error) => {
        console.error('Error al escuchar cambios en tiempo real:', error);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    );
  }

  async cargarNombreFirmante(): Promise<void> {
    const firmanteId = this.reporte?.firmadoPor;

    if (!firmanteId) {
      this.nombreUsuarioFirma = '';
      return;
    }

    try {
      const userSnapshot = await get(ref(this.db, `usuarios/${firmanteId}`));
      if (userSnapshot.exists()) {
        const u = userSnapshot.val();
        const nombreCompleto = `${u.name || ''} ${u.lastName || ''}`.trim();
        this.nombreUsuarioFirma = nombreCompleto || u.nombreUsuario || firmanteId;
      } else {
        this.nombreUsuarioFirma = firmanteId;
      }
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error al cargar nombre del firmante:', error);
      this.nombreUsuarioFirma = '';
    }
  }

  get totalToneladas(): number {
    if (this.viajesList.length > 0) {
      return this.viajesList.reduce((acc, v) => acc + (Number(v.tonRecogidas) || 0), 0);
    }
    return Number(this.reporte?.tonRecogidas) || 0;
  }

  selectTab(tabKey: string): void {
    this.activeTab = tabKey;
  }

  closeModal(): void {
    this.limpiarSuscripcion();
    this.activeTab = 'general';
    this.visible = false;
    this.visibleChange.emit(this.visible);
  }

  private limpiarSuscripcion(): void {
    if (this.viajesUnsubscribe) {
      this.viajesUnsubscribe();
      this.viajesUnsubscribe = null;
    }
  }
}
