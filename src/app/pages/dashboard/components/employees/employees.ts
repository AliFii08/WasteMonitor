import { DecimalPipe } from '@angular/common';
import { afterNextRender, ChangeDetectorRef, Component, inject, OnDestroy } from '@angular/core';
import {
  DashboardService,
  EstadisticasDashboard,
} from '../../../../@core/services/dashboard.service';

interface EmployeeChartItem {
  label: string;
  role: string;
  count: number;
  percentage: number;
}

@Component({
  selector: 'app-dashboard-employees',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './employees.html',
  styleUrl: './employees.scss',
})
export class Employees implements OnDestroy {
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
        console.error('Error al escuchar las estadísticas de empleados:', error);
        this.error = 'No se pudieron cargar los datos de empleados.';
        this.loading = false;
        this.changeDetector.detectChanges();
      },
    );
  });

  items: EmployeeChartItem[] = [];
  total = 0;
  loading = true;
  error = '';

  ngOnDestroy(): void {
    this.detenerEstadisticas?.();
  }

  private setChartData(stats: EstadisticasDashboard | null): void {
    const employees = stats?.empleados;
    const categories: Array<[string, string, number]> = [
      ['Administradores', 'admin', employees?.administradores ?? 0],
      ['Supervisores', 'supervisor', employees?.supervisores ?? 0],
      ['Crew', 'crew', employees?.crew ?? 0],
      ['Conductores', 'conductor', employees?.conductores ?? 0],
      ['Mecánicos', 'mecanico', employees?.mecanicos ?? 0],
    ];

    this.total = categories.reduce((sum, [, , count]) => sum + count, 0);
    this.items = categories.map(([label, role, count]) => ({
      label,
      role,
      count,
      percentage: this.total ? (count / this.total) * 100 : 0,
    }));
  }
}
