import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { Subscription } from 'rxjs';
// Ajusta esta ruta si tu archivo informe.service.ts está en otra carpeta (ej: '../services/informe.service')
import { InformeService, InformeReporte } from '../../@core/services/informe.service';

@Component({
  selector: 'app-journey-report',
  standalone: true,
  imports: [
    CommonModule, 
    TableModule,
    DatePipe
  ],
  templateUrl: './journey-report.html',
  styleUrl: './journey-report.scss'
})
export class JourneyReport implements OnInit, OnDestroy {
  private informeService = inject(InformeService);
  private sub?: Subscription;

  reportes: InformeReporte[] = [];

  ngOnInit(): void {
    this.sub = this.informeService.getInformesConDetalles().subscribe({
      next: (data: InformeReporte[]) => {
        this.reportes = data;
      },
      error: (err: unknown) => {
        console.error('Error al cargar informes:', err);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }
}