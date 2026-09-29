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
import { DeleteJourneyReport } from './components/delete-journey-report/delete-journey-report';


@Component({
  selector: 'app-journey-report',
  imports: [
    TableModule,
    CommonModule,
    CreateJourneyReport,
    FormsModule,
    ViewJourneyReport,
    UpdateJourneyReport,
    DeleteJourneyReport,
  ],
  templateUrl: './journey-report.html',
  styleUrls: ['./journey-report.scss'],
})
export class JourneyReport implements OnInit, OnDestroy {
  reportes: any[] = [];
  private allReportes: any[] = [];
  reportSearchTerm: string = '';

  private cdr = inject(ChangeDetectorRef);

  // Control de selección
  selectedReportRows: boolean[] = [];
  allReportsSelected: boolean = false;
  hasSelectedReport: boolean = false;


selectedReportsList: any[] = [];
  private selectedReportIds = new Set<string>();


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
        // Filtrar únicamente los informes que están activos (activo !== false)
        const informesActivos = (informes || []).filter((informe) => informe.activo !== false);

        this.allReportes = informesActivos.map((informe) => {
          const uidUsuario = informe.uidUsuario || informe.usuario || '';
          const usuarioData = usuarios?.[uidUsuario] || null;

          const nombre = usuarioData?.name || usuarioData?.nombre || '';
          const apellido = usuarioData?.lastName || usuarioData?.apellido || '';
          const nombreCompleto = usuarioData?.nombreUsuario || `${nombre} ${apellido}`.trim();
          const fechaCreacion = informe?.creadoEl == null ? null : new Date(informe.creadoEl);
          const creadoEn = fechaCreacion && !Number.isNaN(fechaCreacion.getTime())
            ? fechaCreacion
            : null;

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

        const availableReportIds = new Set(
          this.allReportes.map((reporte) => String(reporte.id ?? '')).filter(Boolean),
        );
        this.selectedReportIds = new Set(
          [...this.selectedReportIds].filter((id) => availableReportIds.has(id)),
        );
        this.onReportSearchChange();
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error al cargar informes:', err),
    });
  }

  onReportSearchChange(): void {
    const searchTerm = this.reportSearchTerm.trim().toLocaleLowerCase();
    this.reportes = searchTerm
      ? this.allReportes.filter((reporte) => {
          const values = [
            reporte.nombreUsuario,
            reporte.camionId,
            reporte.rutaId,
            this.isReportSigned(reporte) ? 'Firmado' : 'Pendiente',
            reporte.creadoEn?.toLocaleDateString(),
          ];
          return values.some((value) =>
            String(value ?? '').toLocaleLowerCase().includes(searchTerm),
          );
        })
      : [...this.allReportes];

    this.syncReportSelection();
  }

  toggleReportRow(index: number, isChecked: boolean): void {
    const reportId = String(this.reportes[index]?.id ?? '');
    if (!reportId) return;

    if (isChecked) {
      this.selectedReportIds.add(reportId);
    } else {
      this.selectedReportIds.delete(reportId);
    }
    this.syncReportSelection();
  }

  toggleSelectedAllInformes(isSelected: boolean): void {
    this.reportes.forEach((reporte) => {
      const reportId = String(reporte.id ?? '');
      if (!reportId) return;

      if (isSelected) {
        this.selectedReportIds.add(reportId);
      } else {
        this.selectedReportIds.delete(reportId);
      }
    });
    this.syncReportSelection();
  }

  private syncReportSelection(): void {
    this.selectedReportRows = this.reportes.map((reporte) =>
      this.selectedReportIds.has(String(reporte.id ?? '')),
    );
    this.hasSelectedReport = this.selectedReportIds.size > 0;
    this.allReportsSelected =
      this.reportes.length > 0 &&
      this.reportes.every((reporte) => this.selectedReportIds.has(String(reporte.id ?? '')));
  }

  isReportSigned(reporte: any): boolean {
    return reporte?.estado === true || String(reporte?.estado ?? '').toLocaleLowerCase() === 'firmado';
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
    const creadorId =
      reporte?.uidUsuario ||
      reporte?.idUsuario ||
      reporte?.usuario ||
      reporte?.usuarioId ||
      reporte?.userId;

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

  // Al presionar el botón de la barra superior para eliminar seleccionados:
  deleteSelectedReport(): void {
    // Extrae los reportes cuya casilla esté en true
    this.selectedReportsList = this.allReportes.filter((reporte) =>
      this.selectedReportIds.has(String(reporte.id ?? '')),
    );

    console.log('📋 Reportes filtrados para eliminar:', this.selectedReportsList);

    this.selectedReport = null; // Limpiar selección individual
    this.isDeleteModalOpen = true;
  }

  openSingleDeleteModal(reporte: any): void {
    this.selectedReport = reporte;
    this.selectedReportsList = []; // Limpiar selección múltiple
    this.isDeleteModalOpen = true;
  }

  onReportesEliminados(): void {
    this.selectedReportRows = [];
    this.allReportsSelected = false;
    this.selectedReportIds.clear();
    this.hasSelectedReport = false;
    this.selectedReportsList = [];
    this.selectedReport = null;
  }

  ngOnDestroy(): void {
    if (this.informesSub) {
      this.informesSub.unsubscribe();
    }
  }
}
