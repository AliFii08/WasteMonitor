import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TablePagination } from '../../@core/components/table-pagination/table-pagination';
import { InformeAdministrativo, InformeService } from '../../@core/services/informe.service';
import { CreateAdminReport } from './components/create-admin-report/create-admin-report';
import { UpdateAdminReport } from './components/update-admin-report/update-admin-report';
import { DeleteAdminReport } from './components/delete-admin-report/delete-admin-report';
import { UserService } from '../../@core/services/user.service';

@Component({
  selector: 'app-admin-journey-report',
  standalone: true,
  imports: [CommonModule, FormsModule, TablePagination, CreateAdminReport, UpdateAdminReport, DeleteAdminReport],
  templateUrl: './admin-journey-report.html',
  styleUrl: './admin-journey-report.scss',
})
export class AdminJourneyReport implements OnInit {
  private informeService = inject(InformeService);
  private changeDetector = inject(ChangeDetectorRef);
  private userService = inject(UserService);

  fechaSeleccionada = '';
  fechaInicial = this.obtenerFechaActual();
  searchTerm = '';
  paginaInformes = 0;
  readonly tamanoPaginaInformes = 10;
  informesGuardados: InformeAdministrativo[] = [];
  selectedAdminReportIds = new Set<string>();

  crearVisible = false;
  editarVisible = false;
  eliminarVisible = false;
  informeSeleccionado: InformeAdministrativo | null = null;
  informesParaEliminar: InformeAdministrativo[] = [];

  ngOnInit(): void {
    void this.cargarInformesGuardados();
  }

  get canCreateReports(): boolean {
    const role = this.userService.currentUserSignal()?.rol;
    return role === 'admin' || role === 'supervisor';
  }

  get hasManageableReports(): boolean {
    return this.informesFiltrados.some((informe) => this.canManageReport(informe));
  }

  canManageReport(informe: InformeAdministrativo): boolean {
    const currentUser = this.userService.currentUserSignal();
    if (!currentUser) return false;
    if (currentUser.rol === 'admin') return true;
    return !informe.finalizado && informe.creadoPor === currentUser.uid;
  }

  canEditReport(informe: InformeAdministrativo): boolean {
    return this.canManageReport(informe) && !informe.finalizado;
  }

  get canManageSelectedReport(): boolean {
    return !!this.informeSeleccionado && this.canManageReport(this.informeSeleccionado);
  }

  async cargarInformesGuardados(): Promise<void> {
    try {
      this.informesGuardados = await this.informeService.obtenerInformesAdministrativos();
      const idsDisponibles = new Set(this.informesGuardados.map((informe) => informe.id));
      this.selectedAdminReportIds = new Set(
        [...this.selectedAdminReportIds].filter((id) =>
          idsDisponibles.has(id) && this.informesGuardados.some(
            (informe) => informe.id === id && this.canManageReport(informe),
          ),
        ),
      );
    } catch (error) {
      console.error('Error al cargar los informes administrativos:', error);
    } finally {
      this.changeDetector.detectChanges();
    }
  }

  get informesFiltrados(): InformeAdministrativo[] {
    const term = this.searchTerm.trim().toLowerCase();
    return this.informesGuardados.filter((informe) =>
      `${informe.fecha} ${informe.observaciones || ''} ${informe.informesFinalizados || 0} ${informe.viajesTotales || 0} ${informe.toneladasTotales || 0}`
        .toLowerCase()
        .includes(term) && (!this.fechaSeleccionada || informe.fecha === this.fechaSeleccionada),
    );
  }

  get informesPaginados(): InformeAdministrativo[] {
    const inicio = this.paginaInformes * this.tamanoPaginaInformes;
    return this.informesFiltrados.slice(inicio, inicio + this.tamanoPaginaInformes);
  }

  abrirEditar(informe: InformeAdministrativo): void {
    this.informeSeleccionado = informe;
    this.editarVisible = true;
  }

  abrirEliminar(informe: InformeAdministrativo): void {
    if (!this.canManageReport(informe)) return;
    this.informeSeleccionado = informe;
    this.informesParaEliminar = [];
    this.eliminarVisible = true;
  }

  obtenerFechaActual(): string {
    const fecha = new Date();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mes}-${dia}`;
  }

  get allAdminReportSelected(): boolean {
    const informesEditables = this.informesFiltrados.filter((informe) => this.canManageReport(informe));
    return informesEditables.length > 0 && informesEditables.every(
      (informe) => this.selectedAdminReportIds.has(informe.id),
    );
  }

  isAdminReportSelected(id: string): boolean {
    return this.selectedAdminReportIds.has(id);
  }

  toggleSelectAll(checked: boolean): void {
    const selectedIds = new Set(this.selectedAdminReportIds);
    this.informesFiltrados.forEach((informe) => {
      if (!this.canManageReport(informe)) return;
      if (checked) selectedIds.add(informe.id);
      else selectedIds.delete(informe.id);
    });
    this.selectedAdminReportIds = selectedIds;
  }

  toggleAdminReport(id: string, checked: boolean): void {
    const informe = this.informesGuardados.find((item) => item.id === id);
    if (!informe || !this.canManageReport(informe)) return;
    const selectedIds = new Set(this.selectedAdminReportIds);
    if (checked) selectedIds.add(id);
    else selectedIds.delete(id);
    this.selectedAdminReportIds = selectedIds;
  }

  get hasSelectedItems(): boolean {
    return this.selectedAdminReportIds.size > 0;
  }

  get selectedCount(): number {
    return this.selectedAdminReportIds.size;
  }

  eliminarInformesSeleccionados(): void {
    const informesSeleccionados = this.informesGuardados.filter((informe) =>
      this.selectedAdminReportIds.has(informe.id) && this.canManageReport(informe),
    );
    if (!informesSeleccionados.length) return;

    this.informeSeleccionado = null;
    this.informesParaEliminar = informesSeleccionados;
    this.eliminarVisible = true;
  }

  async onInformesEliminados(): Promise<void> {
    this.selectedAdminReportIds = new Set();
    this.informeSeleccionado = null;
    this.informesParaEliminar = [];
    await this.cargarInformesGuardados();
  }

}
