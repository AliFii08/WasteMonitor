import { DecimalPipe } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
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
  imports: [DecimalPipe],
  templateUrl: './vehicles.html',
  styleUrl: './vehicles.scss',
})
export class Vehicles implements OnInit, OnDestroy {
  private dashboardService = inject(DashboardService);
  private changeDetector = inject(ChangeDetectorRef);
  private refreshTimer?: ReturnType<typeof setInterval>;

  items: VehicleChartItem[] = [];
  total = 0;
  loading = true;

  async ngOnInit(): Promise<void> {
    await this.refreshData();
    this.refreshTimer = setInterval(() => void this.refreshData(), 30000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  private async refreshData(): Promise<void> {
    const stats = await this.dashboardService.obtenerEstadisticas();
    this.setChartData(stats);
    this.loading = false;
    this.changeDetector.detectChanges();
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
