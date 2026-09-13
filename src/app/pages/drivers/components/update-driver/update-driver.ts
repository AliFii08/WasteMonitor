import { Component, inject } from '@angular/core';
import { ConductoresService } from '../../../../@core/services/conductores.service';

@Component({
  selector: 'app-update-driver',
  standalone: true,
  imports: [],
  templateUrl: './update-driver.html',
  styleUrl: './update-driver.scss',
})
export class UpdateDriver {

  private driverService = inject(ConductoresService);

  visible = false;



  async onSubmit(): Promise<void> {
    // if (!)
  }

}
