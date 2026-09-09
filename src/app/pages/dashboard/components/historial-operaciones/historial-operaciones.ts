import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface OperacionesHistorial {
  id: string;
  usuario: string;
  rol: string;
  accion: 'crear' | 'actualizar' | 'eliminar';
  modulo: 'Usuarios' | 'Vehículos' | 'Rutas' | 'Mantenimiento';
  detalle: string;
  fechaHora: string;
}

@Component({
  selector: 'app-historial-operaciones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './historial-operaciones.html',
  styleUrl: './historial-operaciones.scss',
})
export class HistorialOperaciones implements OnInit {
  historial: OperacionesHistorial[] = [
    {
      id: 'OP-101',
      usuario: 'Carlos Mendoza',
      rol: 'Supervisor',
      accion: 'crear',
      modulo: 'Rutas',
      detalle: 'Creó la ruta "Sector 4 - Juana de Ávila" para el turno matutino.',
      fechaHora: '09/09/2026, 08:30 AM',
    },
    {
      id: 'OP-102',
      usuario: 'María Delgado',
      rol: 'Admin',
      accion: 'actualizar',
      modulo: 'Vehículos',
      detalle: 'Asignó el camión VEH-003 al conductor Pedro Pérez.',
      fechaHora: '09/09/2026, 09:15 AM',
    },
    {
      id: 'OP-103',
      usuario: 'Manuel Díaz',
      rol: 'Admin',
      accion: 'eliminar',
      modulo: 'Usuarios',
      detalle: 'Deshabilitó la cuenta del empleado "Juan López" (ID: USR-45).',
      fechaHora: '09/09/2026, 10:05 AM',
    },
    {
      id: 'OP-104',
      usuario: 'Carlos Mendoza',
      rol: 'Supervisor',
      accion: 'actualizar',
      modulo: 'Rutas',
      detalle: 'Modificó los puntos de parada en la Ruta Norte (Agregó Sector 2).',
      fechaHora: '09/09/2026, 11:40 AM',
    },
    {
      id: 'OP-105',
      usuario: 'María Delgado',
      rol: 'Admin',
      accion: 'crear',
      modulo: 'Vehículos',
      detalle: 'Registró la nueva unidad de recolección VEH-018.',
      fechaHora: '09/09/2026, 01:20 PM',
    },
  ];

  ngOnInit(): void {}
}
