import { Component, inject, OnInit } from '@angular/core';
import { QuejasService } from '../../@core/services/quejas.service'; // Ajusta la ruta de tu servicio

@Component({
  selector: 'app-complaints',
  imports: [],
  templateUrl: './complaints.html',
  styleUrl: './complaints.scss',
})
export class Complaints implements OnInit {
  private quejasService = inject(QuejasService);

  async ngOnInit(): Promise<void> {
    try {
      const quejas = await this.quejasService.obtenerQuejas();
      console.log('Listado de quejas obtenidas:', quejas);
    } catch (error) {
      console.error('Error al obtener las quejas:', error);
    }
  }
}