import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InformeAdministrativo, InformeService } from '../../@core/services/informe.service';
import { CreateAdminReport } from './components/create-admin-report/create-admin-report';
import { UpdateAdminReport } from './components/update-admin-report/update-admin-report';
import { DeleteAdminReport } from './components/delete-admin-report/delete-admin-report';

@Component({
  selector: 'app-admin-journey-report',
  standalone: true,
  imports: [CommonModule, FormsModule, CreateAdminReport, UpdateAdminReport, DeleteAdminReport],
  templateUrl: './admin-journey-report.html',
  styleUrl: './admin-journey-report.scss',
})
export class AdminJourneyReport {
  private informeService = inject(InformeService);

  fechaSeleccionada = '';
  fechaInicial = this.obtenerFechaActual();
  searchTerm = '';
  informesGuardados: InformeAdministrativo[] = [];
  crearVisible = false;
  editarVisible = false;
  eliminarVisible = false;
  informeSeleccionado: InformeAdministrativo | null = null;

  constructor() {
    void this.cargarInformesGuardados();
  }

  async cargarInformesGuardados(): Promise<void> {
    try {
      this.informesGuardados = await this.informeService.obtenerInformesAdministrativos();
    } catch (error) {
      console.error('Error al cargar los informes administrativos:', error);
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

  abrirEditar(informe: InformeAdministrativo): void {
    this.informeSeleccionado = informe;
    this.editarVisible = true;
  }

  abrirEliminar(informe: InformeAdministrativo): void {
    this.informeSeleccionado = informe;
    this.eliminarVisible = true;
  }

  obtenerFechaActual(): string {
    const fecha = new Date();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mes}-${dia}`;
  }

}
