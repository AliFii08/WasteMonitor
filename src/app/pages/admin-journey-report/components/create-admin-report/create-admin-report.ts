import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  InformeService,
  ResumenInformesFinalizados,
} from '../../../../@core/services/informe.service';

@Component({
  selector: 'app-create-admin-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-admin-report.html',
  styleUrl: './create-admin-report.scss',
})
export class CreateAdminReport implements OnChanges, OnDestroy {
  private informeService = inject(InformeService);
  private changeDetector = inject(ChangeDetectorRef);
  @Input() visible = false;
  @Input() fechaInicial = '';
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() created = new EventEmitter<void>();

  fecha = '';
  observaciones = '';
  toneladasTotales = 0;
  viajesTotales = 0;
  informesFinalizados = 0;
  informesSinFinalizar = 0;
  loadingResumen = false;
  resumenCargado = false;
  saving = false;
  isClosing = false;
  error = '';
  private detenerResumen?: () => void;

  get isSubmitDisabled(): boolean {
    return (
      this.saving ||
      this.loadingResumen ||
      !this.resumenCargado ||
      !this.fecha ||
      this.informesSinFinalizar > 0
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue === true) {
      this.fecha = this.fechaInicial;
      this.observaciones = '';
      this.error = '';
      this.escucharResumenFecha();
    } else if (changes['visible']?.currentValue === false) {
      this.detenerEscuchaResumen();
    }
  }

  open(fecha: string): void {
    this.fecha = fecha;
    this.observaciones = '';
    this.error = '';
    this.visible = true;
    this.escucharResumenFecha();
  }

  ngOnDestroy(): void {
    this.detenerEscuchaResumen();
  }

  escucharResumenFecha(): void {
    this.detenerEscuchaResumen();
    this.resumenCargado = false;
    this.toneladasTotales = 0;
    this.viajesTotales = 0;
    this.informesFinalizados = 0;
    this.informesSinFinalizar = 0;

    if (!this.fecha) {
      this.loadingResumen = false;
      return;
    }

    this.loadingResumen = true;
    this.detenerResumen = this.informeService.escucharResumenInformesFinalizados(
      this.fecha,
      (resumen, error) => this.actualizarResumen(resumen, error),
    );
  }

  private actualizarResumen(resumen: ResumenInformesFinalizados | null, error?: unknown): void {
    this.loadingResumen = false;
    if (error || !resumen) {
      this.error = 'No se pudieron calcular los informes finalizados de esta fecha.';
      this.changeDetector.detectChanges();
      return;
    }

    this.toneladasTotales = resumen.toneladasTotales;
    this.viajesTotales = resumen.viajesTotales;
    this.informesFinalizados = resumen.informesFinalizados;
    this.informesSinFinalizar = resumen.informesSinFinalizar || 0;
    this.resumenCargado = true;
    this.error = '';
    this.changeDetector.detectChanges();
  }

  private detenerEscuchaResumen(): void {
    this.detenerResumen?.();
    this.detenerResumen = undefined;
  }

  close(force = false): void {
    if ((this.saving && !force) || this.isClosing) return;
    this.isClosing = true;
    this.detenerEscuchaResumen();
    setTimeout(() => {
      this.isClosing = false;
      this.visible = false;
      this.visibleChange.emit(false);
    }, 180);
  }

  async submit(): Promise<void> {
    if (this.isSubmitDisabled) return;
    this.saving = true;
    this.error = '';
    try {
      await this.informeService.crearInformeAdministrativo(this.fecha, this.observaciones, {
        toneladasTotales: this.toneladasTotales,
        viajesTotales: this.viajesTotales,
        informesFinalizados: this.informesFinalizados,
      });
      this.created.emit();
      this.close(true);
    } catch (error) {
      console.error('Error al crear el informe administrativo:', error);
      this.error = 'No se pudo guardar el informe administrativo.';
    } finally {
      this.saving = false;
    }
  }
}