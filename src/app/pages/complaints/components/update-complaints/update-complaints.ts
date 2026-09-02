import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select'; // En lugar de DropdownModule de 'primeng/dropdown'
import { ButtonModule } from 'primeng/button';
import { Quejas } from '../../../../@core/interfaces/quejas.model';
import { QuejasService } from '../../../../@core/services/quejas.service';

@Component({
  selector: 'app-update-complaints',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    SelectModule, // Reemplazado aquí
    ButtonModule
  ],
  templateUrl: './update-complaints.html',
  styleUrl: './update-complaints.scss',
})
export class UpdateComplaints implements OnChanges {
  private fb = inject(FormBuilder);
  private quejasService = inject(QuejasService);

  @Input() visible = false;
  @Input() queja: Quejas | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() quejaActualizada = new EventEmitter<void>();

  loading = false;

  opcionesEstado = [
    { label: 'Pendiente', value: 'pendiente' },
    { label: 'En Revisión', value: 'en_revision' },
    { label: 'Resuelto', value: 'resuelto' }
  ];

  form: FormGroup = this.fb.group({
    estado: ['', [Validators.required]]
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['queja'] && this.queja) {
      this.form.patchValue({
        estado: this.queja.estado
      });
    }
  }

  cerrarModal(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  async guardarCambios(): Promise<void> {
    if (this.form.invalid || !this.queja?.id) return;

    this.loading = true;
    const nuevoEstado = this.form.value.estado;

    try {
      await this.quejasService.actualizarEstadoQueja(this.queja.id, nuevoEstado);
      this.quejaActualizada.emit();
      this.cerrarModal();
    } catch (error) {
      console.error('Error al actualizar el estado:', error);
    } finally {
      this.loading = false;
    }
  }
}