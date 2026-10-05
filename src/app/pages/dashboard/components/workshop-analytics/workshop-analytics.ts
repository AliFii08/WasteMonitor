import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Camion, TallerRegistro, TallerService } from '../../../../@core/services/taller.service';

interface FallasResumen {
  nombre: string;
  cantidad: number;
}

@Component({
  selector: 'app-dashboard-workshop-analytics',
  standalone: true,
  templateUrl: './workshop-analytics.html',
  styleUrl: './workshop-analytics.scss',
})
export class WorkshopAnalytics implements OnInit, OnDestroy {
  private tallerService = inject(TallerService);
  private changeDetector = inject(ChangeDetectorRef);
  private detenerEscucha?: () => void;

  cargando = true;
  error = '';
  totalVehiculos = 0;
  vehiculosEnTaller = 0;
  reparados = 0;
  enReparacion = 0;
  enEspera = 0;
  fallas: FallasResumen[] = [];

  ngOnInit(): void {
    this.detenerEscucha = this.tallerService.escucharResumenEnVivo(
      (registros, camiones) => this.actualizarResumen(registros, camiones),
      (error) => {
        console.error('Error al escuchar los datos de taller:', error);
        this.error = 'No se pudieron actualizar los datos del taller.';
        this.cargando = false;
        this.changeDetector.detectChanges();
      },
    );
  }

  ngOnDestroy(): void {
    this.detenerEscucha?.();
  }

  private actualizarResumen(registros: TallerRegistro[], camiones: Camion[]): void {
    const flotaActiva = camiones.filter((camion) => camion.activo !== false);
    this.totalVehiculos = flotaActiva.length;
    this.vehiculosEnTaller = flotaActiva.filter((camion) => camion.enTaller === true).length;
    this.reparados = 0;
    this.enReparacion = 0;
    this.enEspera = 0;

    const porFalla = new Map<string, number>();
    registros.forEach((registro) => {
      const estado = String(registro.estado || '').toLowerCase();
      if (estado === 'listo') this.reparados += 1;
      else if (estado === 'en_reparacion') this.enReparacion += 1;
      else this.enEspera += 1;

      const razon = String(registro.razon || '').trim() || 'Sin especificar';
      porFalla.set(razon, (porFalla.get(razon) || 0) + 1);
    });

    this.fallas = [...porFalla.entries()]
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);
    this.error = '';
    this.cargando = false;
    this.changeDetector.detectChanges();
  }

  get porcentajeEnTaller(): number {
    return this.totalVehiculos ? Math.round((this.vehiculosEnTaller / this.totalVehiculos) * 100) : 0;
  }

  get totalRegistrosTaller(): number {
    return this.reparados + this.enReparacion + this.enEspera;
  }

  get maxFallas(): number {
    return Math.max(...this.fallas.map((falla) => falla.cantidad), 1);
  }

  get porcentajeFlotaStyle(): string {
    const grados = (this.porcentajeEnTaller / 100) * 360;
    return `conic-gradient(#17627a 0deg ${grados}deg, #dcebe4 ${grados}deg 360deg)`;
  }

  get distribucionEstadoStyle(): string {
    const total = this.totalRegistrosTaller;
    if (!total) return 'conic-gradient(#dcebe4 0deg 360deg)';

    const reparadosFin = (this.reparados / total) * 360;
    const reparacionFin = reparadosFin + (this.enReparacion / total) * 360;
    return `conic-gradient(#68a357 0deg ${reparadosFin}deg, #17627a ${reparadosFin}deg ${reparacionFin}deg, #d49b25 ${reparacionFin}deg 360deg)`;
  }
}
