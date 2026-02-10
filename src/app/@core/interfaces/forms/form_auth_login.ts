import { FormControl } from '@angular/forms';

export interface AuthLogin {
  email: FormControl<string>;
  password: FormControl<string>;
}
