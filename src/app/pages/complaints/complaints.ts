import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { QuejasService } from '../../@core/services/quejas.service';
import { UserService } from '../../@core/services/user.service';
import { Quejas } from '../../@core/interfaces/quejas.model';
import { CreateComplaints } from './components/create-complaints/create-complaints';
import { ViewComplaints } from './components/view-complaints/view-complaints';
import { UpdateComplaints } from './components/update-complaints/update-complaints';

@Component({
  selector: 'app-complaints',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    TagModule,
    ButtonModule,
    DatePipe,
    CreateComplaints,
    ViewComplaints,
    UpdateComplaints
  ],
  templateUrl: './complaints.html',
  styleUrl: './complaints.scss',
})
export class Complaints implements OnInit {
  private quejasService = inject(QuejasService);
  private userService = inject(UserService);

  quejas = signal<Quejas[]>([]);
  loading = signal<boolean>(true);

  esAdmin = computed(() => {
    const user = this.userService.currentUserSignal();
    return user?.rol === 'admin';
  });

  mostrarModalCrear = false;
  mostrarModalVer = false;
  mostrarModalEditar = false;

  quejaSeleccionada: Quejas | null = null;

  async ngOnInit(): Promise<void> {
    await this.cargarQuejas();
  }

  async cargarQuejas(): Promise<void> {
    try {
      this.loading.set(true);
      const currentUser = this.userService.currentUserSignal();

      // Si es admin, no enviamos ID para traer todas; si no, pasamos su uid/id
      const userIdFiltro = this.esAdmin() ? undefined : (currentUser?.uid);
      
      const data = await this.quejasService.obtenerQuejas(userIdFiltro);
      this.quejas.set(data);
    } catch (error) {
      console.error('Error al obtener quejas:', error);
    } finally {
      this.loading.set(false);
    }
  }

  verQueja(queja: Quejas): void {
    this.quejaSeleccionada = queja;
    this.mostrarModalVer = true;
  }

  editarQueja(queja: Quejas): void {
    this.quejaSeleccionada = queja;
    this.mostrarModalEditar = true;
  }

  getSeverity(estado: string): 'warn' | 'info' | 'success' | 'secondary' {
    switch (estado) {
      case 'pendiente': return 'warn';
      case 'en_revision': return 'info';
      case 'resuelto': return 'success';
      default: return 'secondary';
    }
  }
}