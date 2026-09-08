import { FormControl } from '@angular/forms';
import { VehicleType } from '../vehicle.model';

export interface VehicleForm {
  type: FormControl<VehicleType | ''>;
  weight: FormControl<number | null>;
  route: FormControl<string>;
  plate: FormControl<string>;
}
