import { Component } from '@angular/core';

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
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
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

  selectTab(tab: DashboardTab): void {
    this.activeTab = tab;
  }

}
