import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, Output, inject } from '@angular/core';
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
  private changeDetector = inject(ChangeDetectorRef);
  @Input() visible = false;
  @Input() informe: InformeAdministrativo | null = null;
  @Input() readOnly = false;
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
  isClosing = false;
  error = '';

  get isReadOnly(): boolean {
    return this.readOnly || this.informe?.finalizado === true;
  }

  ngOnChanges(): void {
    if (this.visible && this.informe) {
      this.fecha = this.informe.fecha;
      this.observaciones = this.informe.observaciones || '';
      if (this.isReadOnly) {
        this.resumen = {
          toneladasTotales: this.informe.toneladasTotales || 0,
          viajesTotales: this.informe.viajesTotales || 0,
          informesFinalizados: this.informe.informesFinalizados || 0,
        };
        this.resumenCargado = true;
        this.loadingResumen = false;
        return;
      }
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
      if (fechaSolicitada === this.fecha) {
        this.loadingResumen = false;
        this.changeDetector.detectChanges();
      }
    }
  }

  close(force = false): void {
    if ((this.saving && !force) || this.isClosing) return;
    this.isClosing = true;
    setTimeout(() => {
      this.isClosing = false;
      this.visible = false;
      this.visibleChange.emit(false);
    }, 180);
  }

  async submit(): Promise<void> {
    await this.guardar(false);
  }

  async finalizar(): Promise<void> {
    await this.guardar(true);
  }

  private async guardar(finalizar: boolean): Promise<void> {
    if (!this.informe || !this.fecha || this.saving || this.loadingResumen || !this.resumenCargado) return;
    if (this.isReadOnly) return;
    this.saving = true;
    this.error = '';
    try {
      const datos = {
        fecha: this.fecha,
        observaciones: this.observaciones,
        toneladasTotales: this.resumen.toneladasTotales,
        viajesTotales: this.resumen.viajesTotales,
        informesFinalizados: this.resumen.informesFinalizados,
      };
      if (finalizar) {
        await this.informeService.finalizarInformeAdministrativo(this.informe.id, datos);
        this.informe.finalizado = true;
      } else {
        await this.informeService.actualizarInformeAdministrativo(this.informe.id, datos);
      }
      this.updated.emit();
      this.close(true);
    } catch (error) {
      console.error('Error al actualizar el informe administrativo:', error);
      this.error = finalizar
        ? 'No se pudo finalizar el informe.'
        : 'No se pudo actualizar el informe.';
    } finally {
      this.saving = false;
    }
  }
}
