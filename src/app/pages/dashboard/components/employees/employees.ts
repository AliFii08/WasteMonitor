import { DecimalPipe } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
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
  imports: [DecimalPipe],
  templateUrl: './employees.html',
  styleUrl: './employees.scss',
})
export class Employees implements OnInit, OnDestroy {
  private dashboardService = inject(DashboardService);
  private changeDetector = inject(ChangeDetectorRef);
  private refreshTimer?: ReturnType<typeof setInterval>;

  items: EmployeeChartItem[] = [];
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
