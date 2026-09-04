import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { Quejas } from '../../../../@core/interfaces/quejas.model';
import { QuejasService } from '../../../../@core/services/quejas.service';

@Component({
  selector: 'app-view-complaints',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, TagModule, DatePipe],
  templateUrl: './view-complaints.html',
  styleUrl: './view-complaints.scss',
})
export class ViewComplaints implements OnChanges {
  private quejasService = inject(QuejasService);

  @Input() visible = false;
  @Input() queja: Quejas | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();

  nombreUsuario = signal<string>('Cargando...');

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['queja'] && this.queja?.userId) {
      this.nombreUsuario.set('Cargando...');
      try {
        const usuario = await this.quejasService.obtenerUsuarioPorId(this.queja.userId);
        if (usuario) {
          this.nombreUsuario.set(`${usuario.name} ${usuario.lastName}`.trim());
        } else {
          this.nombreUsuario.set('Usuario no encontrado');
        }
      } catch (error) {
        console.error('Error al obtener usuario:', error);
        this.nombreUsuario.set('Error al cargar');
      }
    }
  }

  cerrarModal(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  getSeverity(estado?: string): 'warn' | 'info' | 'success' | 'secondary' {
    switch (estado) {
      case 'pendiente':
        return 'warn';
      case 'en_revision':
        return 'info';
      case 'resuelto':
        return 'success';
      default:
        return 'secondary';
    }
  }
}