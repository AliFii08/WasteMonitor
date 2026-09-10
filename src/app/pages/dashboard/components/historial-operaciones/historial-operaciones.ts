import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { DashboardService, OperacionHistorial } from '../../../../@core/services/dashboard.service';

@Component({
  selector: 'app-historial-operaciones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './historial-operaciones.html',
  styleUrl: './historial-operaciones.scss',
})
export class HistorialOperaciones implements OnInit, OnDestroy {
  private dashboardService = inject(DashboardService);
  private cdr = inject(ChangeDetectorRef);
  private subOps?: Subscription;

  historial: OperacionHistorial[] = [];
  cargando: boolean = true;

  ngOnInit(): void {
    this.subOps = this.dashboardService.obtenerOperacionesEnTiempoReal().subscribe({
      next: (operaciones: OperacionHistorial[]) => {
        this.historial = operaciones;
        this.cargando = false;
        this.cdr.detectChanges(); // Fuerza la actualización inmediata de la vista
      },
      error: (err) => {
        console.error('Error en suscripción de operaciones:', err);
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  ngOnDestroy(): void {
    this.subOps?.unsubscribe();
  }
}
