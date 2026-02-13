import { FormControl } from "@angular/forms";

export interface AuthRegister{
    name: FormControl<string>;
    lastName: FormControl<string>;
    email: FormControl<string>;
    phone: FormControl<number>;
    password: FormControl<string>;
    confirmPassword: FormControl<string>;
    sector: FormControl<string>;
    street: FormControl<string>;
    houseNumber: FormControl<string>;
    postalCode: FormControl<number>;
}
