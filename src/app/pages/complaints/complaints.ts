import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
  ChangeDetectorRef,
  effect,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { QuejasService } from '../../@core/services/quejas.service';
import { UserService } from '../../@core/services/user.service';
import { Quejas } from '../../@core/interfaces/quejas.model';
import { CreateComplaints } from './components/create-complaints/create-complaints';
import { ViewComplaints } from './components/view-complaints/view-complaints';
import { UpdateComplaints } from './components/update-complaints/update-complaints';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-complaints',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TagModule,
    ButtonModule,
    DatePipe,
    CreateComplaints,
    ViewComplaints,
    UpdateComplaints,
  ],
  templateUrl: './complaints.html',
  styleUrl: './complaints.scss',
})
export class Complaints implements OnInit {
  private quejasService = inject(QuejasService);
  private userService = inject(UserService);
  private cdr = inject(ChangeDetectorRef);

  quejas = signal<Quejas[]>([]);
  loading = signal<boolean>(true);

  filtroTexto = signal<string>('');

  quejasFiltradas = computed(() => {
    const texto = this.filtroTexto().toLowerCase().trim();
    const lista = this.quejas();

    if (!texto) return lista;

    return lista.filter(
      (q) =>
        (q.asunto && q.asunto.toLowerCase().includes(texto)) ||
        (q.descripcion && q.descripcion.toLowerCase().includes(texto)),
    );
  });

  esAdmin = computed(() => {
    const user = this.userService.currentUserSignal();
    return user?.rol === 'admin';
  });

  mostrarModalCrear = false;
  mostrarModalVer = false;
  mostrarModalEditar = false;

  quejaSeleccionada: Quejas | null = null;

  constructor() {
    // 🔹 Si el usuario tarda en cargarse desde Firebase, reaccionamos automáticamente cuando cambie
    effect(() => {
      const user = this.userService.currentUserSignal();
      if (user) {
        this.cargarQuejas();
      }
    });
  }

  async ngOnInit(): Promise<void> {
    await this.cargarQuejas();
  }

  async cargarQuejas(): Promise<void> {
    try {
      this.loading.set(true);
      this.cdr.detectChanges();

      const currentUser = this.userService.currentUserSignal();

      // Si es admin, no filtramos (undefined para traer todas); si es usuario común, usamos únicamente currentUser.uid
      const userIdFiltro = this.esAdmin() ? undefined : currentUser?.uid;

      console.log('🔍 Cargando quejas con filtro userId:', userIdFiltro);

      const data = await this.quejasService.obtenerQuejas(userIdFiltro);
      this.quejas.set(data);
    } catch (error) {
      console.error('Error al obtener quejas:', error);
    } finally {
      this.loading.set(false);
      this.cdr.detectChanges();
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