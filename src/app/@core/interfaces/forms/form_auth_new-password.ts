import { FormControl } from "@angular/forms";

export interface newPasswordForm{
    code: FormControl<string>;
    password: FormControl<string>;
    confirmPassword: FormControl<string>;
}
