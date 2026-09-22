import { Component, inject, OnInit } from '@angular/core';
import { DashboardService } from '../../@core/services/dashboard.service';
import { HistorialOperaciones } from './components/historial-operaciones/historial-operaciones';
import { Employees } from "./components/employees/employees";
import { Vehicles } from './components/vehicles/vehicles';

type DashboardTab = 'vehicles' | 'employees' | 'operations';

interface DashboardNotification {
  id: number;
  title: string;
  message: string;
  time: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [HistorialOperaciones, Employees, Vehicles],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private dashboardService = inject(DashboardService);

  activeTab: DashboardTab = 'vehicles';

  notifications: DashboardNotification[] = [
    {
      id: 1,
      title: 'Ruta Norte',
      message: 'Una unidad reportó retraso por tráfico en la recolección matutina.',
      time: '08:40',
    },
    {
      id: 2,
      title: 'Mantenimiento',
      message: 'El vehículo VEH-014 tiene revisión preventiva programada hoy.',
      time: '09:10',
    },
    {
      id: 3,
      title: 'Operaciones',
      message: 'Se completó el cierre de jornada del turno nocturno.',
      time: '09:35',
    },
  ];

  async ngOnInit(): Promise<void> {
    const stats = await this.dashboardService.obtenerEstadisticas();

    if (stats) {
      console.group(
        '%c📊 ESTADÍSTICAS DEL DASHBOARD',
        'color: #0d5c3a; font-size: 14px; font-weight: bold;',
      );
      console.log('👷 Empleados:', stats.empleados);
      console.log('🚛 Vehículos:', stats.vehiculos);
      console.log('🗺️ Operaciones y Rutas:', stats.operaciones);
      console.groupEnd();
    }
  }

  selectTab(tab: DashboardTab): void {
    this.activeTab = tab;
  }
}