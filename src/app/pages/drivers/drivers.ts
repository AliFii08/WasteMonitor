import { Component, inject, OnInit } from '@angular/core';
import { ConductoresService } from '../../@core/services/conductores.service';
import { EmpleadoService } from '../../@core/services/empleado.service';
@Component({
  selector: 'app-drivers',
  imports: [],
  templateUrl: './drivers.html',
  styleUrl: './drivers.scss',
})
export class Drivers implements OnInit {

  private conductoresService = inject(ConductoresService);
  private empleadoService = inject(EmpleadoService);

  async ngOnInit() {
    await this.conductoresService.getConductores();
    await this.empleadoService.getEmpleado();
  }

  
}
