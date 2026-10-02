import { DecimalPipe } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import {
  InformeService,
  ResumenJornadaAdministrativa,
} from '../../../../@core/services/informe.service';

@Component({
  selector: 'app-dashboard-waste-trends',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './waste-trends.html',
  styleUrl: './waste-trends.scss',
})
export class WasteTrends implements OnInit, OnDestroy {
  private informeService = inject(InformeService);
  private changeDetector = inject(ChangeDetectorRef);
  private refreshTimer?: ReturnType<typeof setInterval>;

  resumen: ResumenJornadaAdministrativa | null = null;
  loading = true;
  fecha = this.obtenerFechaActual();

  async ngOnInit(): Promise<void> {
    await this.cargarDatos();
    this.refreshTimer = setInterval(() => void this.cargarDatos(), 300000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  async cargarDatos(): Promise<void> {
    try {
      this.resumen = await this.informeService.obtenerResumenJornadaAdministrativa(
        new Date(`${this.fecha}T12:00:00`),
      );
    } finally {
      this.loading = false;
      this.changeDetector.detectChanges();
    }
  }

  obtenerFechaActual(): string {
    const fecha = new Date();
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
  }

  get maxToneladas(): number {
    return Math.max(...(this.resumen?.rutas.map((ruta) => ruta.toneladas) || [1]), 1);
  }

  get rutasDelDia() {
    return this.resumen?.rutas || [];
  }
}
