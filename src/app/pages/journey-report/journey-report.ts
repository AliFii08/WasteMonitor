import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { Subscription } from 'rxjs';
import { InformeService, InformeReporte } from '../../@core/services/informe.service';
import { CreateJourneyReport } from './components/create-journey-report/create-journey-report';
import { ViewJourneyReport } from './components/view-journey-report/view-journey-report';

@Component({
  selector: 'app-journey-report',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    DatePipe,
    CreateJourneyReport,
    ViewJourneyReport,
  ],
  templateUrl: './journey-report.html',
  styleUrl: './journey-report.scss',
})
export class JourneyReport implements OnInit, OnDestroy {
  private informeService = inject(InformeService);
  private sub?: Subscription;

  reportes: InformeReporte[] = [];

  reportSearchTerm: string = '';
  allReportsSelected: boolean = false;
  hasSelectedReport: boolean = false;
  selectedReportRows: boolean[] = [];

  isCreateModalOpen: boolean = false;
  isViewModalOpen: boolean = false;
  selectedReport: InformeReporte | null = null;

  ngOnInit(): void {
    this.sub = this.informeService.getInformesConDetalles().subscribe({
      next: (data: InformeReporte[]) => {
        this.reportes = data;
        this.selectedReportRows = new Array(data.length).fill(false);
      },
      error: (err: unknown) => {
        console.error('Error al cargar informes:', err);
      },
    });
  }

  onReportSearchChange(): void {}

  toggleSelectedAllInformes(): void {
    this.allReportsSelected = !this.allReportsSelected;
    this.selectedReportRows = this.selectedReportRows.map(() => this.allReportsSelected);
    this.hasSelectedReport = this.allReportsSelected;
  }

  toggleReportrRow(index: number, checked: boolean): void {
    this.selectedReportRows[index] = checked;
    this.hasSelectedReport = this.selectedReportRows.some((val) => val);
    this.allReportsSelected = this.selectedReportRows.every((val) => val);
  }

  deleteSelectedReport(): void {}

  openCreateModal(): void {
    this.isCreateModalOpen = true;
  }

  openViewModal(reporte: InformeReporte): void {
    this.selectedReport = reporte;
    this.isViewModalOpen = true;
  }

  openUpdateModal(driver: any): void {}
  openSingleDeleteModal(driver: any): void {}

  ngOnDestroy(): void {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }
}
