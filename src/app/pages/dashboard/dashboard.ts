import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { DashboardService } from '../../@core/services/dashboard.service';
import { NotificationService } from '../../@core/services/notification.service';
import { HistorialOperaciones } from './components/historial-operaciones/historial-operaciones';
import { Employees } from "./components/employees/employees";
import { Vehicles } from './components/vehicles/vehicles';

type DashboardTab = 'vehicles' | 'employees' | 'operations';

interface DashboardNotification {
  id: string;
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
export class Dashboard implements OnInit, OnDestroy {
  private dashboardService = inject(DashboardService);
  private notificationService = inject(NotificationService);

  activeTab: DashboardTab = 'vehicles';
  notifications: DashboardNotification[] = [];
  private notifSub?: Subscription;

  async ngOnInit(): Promise<void> {
    // 1. Escuchar las notificaciones en tiempo real desde el servicio
    this.notifSub = this.notificationService.notifications$.subscribe((items) => {
      this.notifications = items.map((item) => ({
        id: item.id,
        title: item.titulo,
        message: item.mensaje,
        time: item.timestamp
          ? new Date(item.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })
          : '',
      }));
    });

    // 2. Obtener estadísticas del Dashboard
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

  ngOnDestroy(): void {
    if (this.notifSub) {
      this.notifSub.unsubscribe();
    }
  }
}