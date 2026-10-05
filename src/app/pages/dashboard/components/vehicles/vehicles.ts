import { DecimalPipe } from '@angular/common';
import { afterNextRender, ChangeDetectorRef, Component, inject, OnDestroy } from '@angular/core';
import {
  DashboardService,
  EstadisticasDashboard,
} from '../../../../@core/services/dashboard.service';

interface VehicleChartItem {
  label: string;
  count: number;
  percentage: number;
}

@Component({
  selector: 'app-dashboard-vehicles',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './vehicles.html',
  styleUrl: './vehicles.scss',
})
export class Vehicles implements OnDestroy {
  private dashboardService = inject(DashboardService);
  private changeDetector = inject(ChangeDetectorRef);
  private detenerEstadisticas?: () => void;
  private startBrowserListener = afterNextRender(() => {
    this.detenerEstadisticas = this.dashboardService.escucharEstadisticas(
      (stats) => {
        this.setChartData(stats);
        this.error = '';
        this.loading = false;
        this.changeDetector.detectChanges();
      },
      (error) => {
        console.error('Error al escuchar las estadísticas de vehículos:', error);
        this.error = 'No se pudieron cargar los datos de vehículos.';
        this.loading = false;
        this.changeDetector.detectChanges();
      },
    );
  });

  items: VehicleChartItem[] = [];
  total = 0;
  loading = true;
  error = '';

  ngOnDestroy(): void {
    this.detenerEstadisticas?.();
  }

  private setChartData(stats: EstadisticasDashboard | null): void {
    const types = [
      ['Retroexcavadora', 'retroexcavadora'],
      ['Volteo', 'volteo'],
      ['Minimati', 'minimati'],
      ['Compactadores', 'compactadores'],
      ['Gándolas', 'gandolas'],
      ['Anacondas', 'anacondas'],
    ] as const;
    const counts = stats?.vehiculos.porTipo ?? {};
    const normalizedCounts = Object.entries(counts).reduce<Record<string, number>>(
      (result, [type, count]) => {
        const key = type
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        result[key] = (result[key] ?? 0) + count;
        return result;
      },
      {},
    );

    this.total = types.reduce((sum, [, key]) => sum + (normalizedCounts[key] ?? 0), 0);
    this.items = types.map(([label, key]) => {
      const count = normalizedCounts[key] ?? 0;
      return { label, count, percentage: this.total ? (count / this.total) * 100 : 0 };
    });
  }
}
