import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { InformeService } from '../../@core/services/informe.service';
import { CreateJourneyReport } from './components/create-journey-report/create-journey-report';
import { FormsModule } from '@angular/forms';
import { ViewJourneyReport } from './components/view-journey-report/view-journey-report';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { UpdateJourneyReport } from './components/update-journey-report/update-journey-report';
import { AuthService } from '../../@core/services/auth.service';


@Component({
  selector: 'app-journey-report',
  imports: [
    TableModule,
    CommonModule,
    CreateJourneyReport,
    FormsModule,
    ViewJourneyReport,
    UpdateJourneyReport,
  ],
  templateUrl: './journey-report.html',
  styleUrls: ['./journey-report.scss'],
})
export class JourneyReport implements OnInit, OnDestroy {
  reportes: any[] = [];
  reportSearchTerm: string = '';

  private cdr = inject(ChangeDetectorRef);

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

  // private auth = inject(Auth);
  private authService = inject(AuthService);

  constructor(private informeService: InformeService) {}

  ngOnInit(): void {
    this.cargarInformes();
  }

  get isAdmin(): boolean {
    return this.authService.hasRole(['admin']);
  }

  async cargarInformes(): Promise<void> {
    this.informesSub = this.informeService.getInformes().subscribe({
      next: ([informes, usuarios]) => {
        this.reportes = (informes || []).map((informe) => {
          const uidUsuario = informe.uidUsuario || informe.usuario || '';
          const usuarioData = usuarios?.[uidUsuario] || null;

          const nombre = usuarioData?.name || usuarioData?.nombre || '';
          const apellido = usuarioData?.lastName || usuarioData?.apellido || '';
          const nombreCompleto = usuarioData?.nombreUsuario || `${nombre} ${apellido}`.trim();
          const creadoEn = informe?.creadoEl || 'No agarra';

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
        this.cdr.detectChanges();
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
    // 1. Obtener el UID del usuario en sesión
    const currentUserId = this.authService.getCurrentUserId();

    // 2. Extraer el UID del creador (tomando 'reporte.usuario' que es como está en Firebase)
    const creadorId = reporte?.usuario || reporte?.usuarioId || reporte?.userId;


    // 3. Validar coincidencia de IDs
    if ((!currentUserId || creadorId !== currentUserId) && !this.isAdmin) {
      alert('no puedes actualizar un informe que no fue creado por ti');
      return;
    }

    this.cdr.detectChanges();

    // 4. Abrir modal si coincide
    this.selectedReport = reporte;
    this.isUpdateModalOpen = true;
  }

  openSingleDeleteModal(reporte: any): void {
    if (!this.isAdmin) {
      alert('No tienes permisos de administrador para eliminar informes.');
      return;
    }
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
