import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { InformeService } from '../../@core/services/informe.service';
import { CreateJourneyReport } from './components/create-journey-report/create-journey-report';
import { FormsModule } from '@angular/forms';
import { ViewJourneyReport } from './components/view-journey-report/view-journey-report';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { UpdateJourneyReport } from './components/update-journey-report/update-journey-report';


@Component({
  selector: 'app-journey-report',
  imports: [
    TableModule,
    CommonModule,
    CreateJourneyReport,
    FormsModule,
    ViewJourneyReport,
    UpdateJourneyReport
  ],
  templateUrl: './journey-report.html',
  styleUrls: ['./journey-report.scss'],
})
export class JourneyReport implements OnInit, OnDestroy {
  reportes: any[] = [];
  reportSearchTerm: string = '';

  // Control de selección
  selectedReportRows: boolean[] = [];
  allReportsSelected: boolean = false;
  hasSelectedReport: boolean = false;

  // Modales
  isCreateModalOpen: boolean = false;
  isViewModalOpen: boolean = false;
  isUpdateModalOpen: boolean = false;
  isDeleteModalOpen: boolean = false;

  selectedReport: any = null;
  private informesSub!: Subscription;

  constructor(private informeService: InformeService) {}

  ngOnInit(): void {
    this.cargarInformes();
  }

  cargarInformes(): void {
    this.informesSub = this.informeService.getInformes().subscribe({
      next: ([informes, usuarios]) => {
        this.reportes = (informes || []).map((informe) => {
          const uidUsuario = informe.uidUsuario || informe.usuario || '';
          const usuarioData = usuarios?.[uidUsuario] || null;

          const nombre = usuarioData?.name || usuarioData?.nombre || '';
          const apellido = usuarioData?.lastName || usuarioData?.apellido || '';
          const nombreCompleto = usuarioData?.nombreUsuario || `${nombre} ${apellido}`.trim();
          const creadoEn = informe?.creadoEl || "No agarra";

          const camionId = informe.camionId || informe.camion || '';
          const rutaId = informe.rutaId || informe.ruta || '';

          return {
            ...informe,
            id: informe.id,
            uidUsuario,
            nombreUsuario: nombreCompleto || 'Usuario sin nombre',
            creadoEn,
            camionId,
            rutaId,
          };
        });

        this.selectedReportRows = new Array(this.reportes.length).fill(false);
      },
      error: (err) => console.error('Error al cargar informes:', err),
    });
  }

  onReportSearchChange(): void {
    // Lógica para filtrar reportes
  }

  toggleReportRow(index: number, isChecked: boolean): void {
    this.selectedReportRows[index] = isChecked;
    this.hasSelectedReport = this.selectedReportRows.some((val) => val);
    this.allReportsSelected = this.selectedReportRows.every((val) => val);
  }

  toggleSelectedAllInformes(): void {
    this.allReportsSelected = !this.allReportsSelected;
    this.selectedReportRows = new Array(this.reportes.length).fill(this.allReportsSelected);
    this.hasSelectedReport = this.allReportsSelected && this.reportes.length > 0;
  }

  // Modales y Acciones
  openCreateModal(): void {
    this.isCreateModalOpen = true;
  }

  openViewModal(reporte: any): void {
    this.selectedReport = reporte;
    this.isViewModalOpen = true;
  }

  openUpdateModal(reporte: any): void {
    this.selectedReport = reporte;
    this.isUpdateModalOpen = true;
  }

  openSingleDeleteModal(reporte: any): void {
    this.selectedReport = reporte;
    this.isDeleteModalOpen = true;
  }

  deleteSelectedReport(): void {
    // Lógica para eliminar seleccionados
  }

  ngOnDestroy(): void {
    if (this.informesSub) {
      this.informesSub.unsubscribe();
    }
  }
}
