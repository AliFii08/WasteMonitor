import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-create-journey-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-journey-report.html',
  styleUrl: './create-journey-report.scss',
})
export class CreateJourneyReport {
  @Input() visible: boolean = false;
  @Input() numeroViaje: number = 1;
  @Output() visibleChange = new EventEmitter<boolean>();

  formData = {
    tonRecogidas: null as number | null,
    direccionLlenado: '',
    observaciones: '',
  };

  onSubmit(): void {
    console.log(`Creando informe para Viaje ${this.numeroViaje}:`, this.formData);
    this.closeModal();
    this.resetForm();
  }

  closeModal(): void {
    this.visible = false;
    this.visibleChange.emit(this.visible);
  }

  private resetForm(): void {
    this.formData = {
      tonRecogidas: null,
      direccionLlenado: '',
      observaciones: '',
    };
  }
}
