import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  InformeAdministrativo,
  InformeService,
  ResumenInformesFinalizados,
} from '../../../../@core/services/informe.service';

@Component({
  selector: 'app-update-admin-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './update-admin-report.html',
  styleUrl: './update-admin-report.scss',
})
export class UpdateAdminReport {
  private informeService = inject(InformeService);
  @Input() visible = false;
  @Input() informe: InformeAdministrativo | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() updated = new EventEmitter<void>();

  fecha = '';
  observaciones = '';
  resumen: ResumenInformesFinalizados = {
    toneladasTotales: 0,
    viajesTotales: 0,
    informesFinalizados: 0,
  };
  loadingResumen = false;
  resumenCargado = false;
  saving = false;
  error = '';

  ngOnChanges(): void {
    if (this.visible && this.informe) {
      this.fecha = this.informe.fecha;
      this.observaciones = this.informe.observaciones || '';
      void this.cargarResumenFecha();
    }
  }

  async cargarResumenFecha(): Promise<void> {
    if (!this.fecha) return;
    const fechaSolicitada = this.fecha;
    this.loadingResumen = true;
    this.resumenCargado = false;
    this.resumen = {
      toneladasTotales: 0,
      viajesTotales: 0,
      informesFinalizados: 0,
    };
    this.error = '';
    try {
      const resumen = await this.informeService.obtenerResumenInformesFinalizados(fechaSolicitada);
      if (fechaSolicitada === this.fecha) {
        this.resumen = resumen;
        this.resumenCargado = true;
      }
    } catch (error) {
      console.error('Error al calcular el resumen administrativo:', error);
      this.error = 'No se pudieron calcular los informes finalizados de esta fecha.';
    } finally {
      if (fechaSolicitada === this.fecha) this.loadingResumen = false;
    }
  }

  close(): void {
    if (this.saving) return;
    this.visible = false;
    this.visibleChange.emit(false);
  }

  async submit(): Promise<void> {
    if (!this.informe || !this.fecha || this.saving || this.loadingResumen || !this.resumenCargado) return;
    this.saving = true;
    this.error = '';
    try {
      await this.informeService.actualizarInformeAdministrativo(this.informe.id, {
        fecha: this.fecha,
        observaciones: this.observaciones,
        toneladasTotales: this.resumen.toneladasTotales,
        viajesTotales: this.resumen.viajesTotales,
        informesFinalizados: this.resumen.informesFinalizados,
      });
      this.updated.emit();
      this.close();
    } catch (error) {
      console.error('Error al actualizar el informe administrativo:', error);
      this.error = 'No se pudo actualizar el informe.';
    } finally {
      this.saving = false;
    }
  }
}
