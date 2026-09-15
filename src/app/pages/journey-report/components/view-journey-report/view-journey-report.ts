import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-view-journey-report',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './view-journey-report.html',
  styleUrl: './view-journey-report.scss',
})
export class ViewJourneyReport {
  @Input() visible: boolean = false;
  @Input() reporte: any = null;
  @Output() visibleChange = new EventEmitter<boolean>();

  closeModal(): void {
    this.visible = false;
    this.visibleChange.emit(this.visible);
  }
}
