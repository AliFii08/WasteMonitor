import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext'; // Maneja inputs y textareas
import { ButtonModule } from 'primeng/button';
import { QuejasService } from '../../../../@core/services/quejas.service'; // Ajusta según tu ruta[cite: 28]

@Component({
  selector: 'app-create-complaints',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    InputTextModule,
    ButtonModule
  ],
  templateUrl: './create-complaints.html',
  styleUrl: './create-complaints.scss',
})
export class CreateComplaints {
  private fb = inject(FormBuilder);
  private quejasService = inject(QuejasService);

  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() quejaCreada = new EventEmitter<void>();

  loading = false;

  form: FormGroup = this.fb.group({
    asunto: ['', [Validators.required, Validators.minLength(5)]],
    descripcion: ['', [Validators.required, Validators.minLength(10)]],
  });

  cerrarModal() {
    this.visible = false;
    this.visibleChange.emit(false);
    this.form.reset();
  }

  async guardarQueja() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const { asunto, descripcion } = this.form.value;

    try {
      const userId = '8htNKb3hpKQqNhkUeADCIb2UmiH3';
      await this.quejasService.registrarQueja(userId, asunto, descripcion);
      this.quejaCreada.emit();
      this.cerrarModal();
    } catch (error) {
      console.error('Error al registrar la queja:', error);
    } finally {
      this.loading = false;
    }
  }
}