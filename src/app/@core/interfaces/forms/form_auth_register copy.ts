import { FormControl } from "@angular/forms";

export interface AuthRegister{
    Nombre: FormControl<string>;
    Apellido: FormControl<string>;
    Cedula: FormControl<string>;
    Turno: FormControl<string>;
    Correo: FormControl<string>;
    Password: FormControl<string>;
    ConfirmarPassword: FormControl<string>;
    Hora: FormControl<number>;
    Fecha_Nacimiento: FormControl<string>;
    Cargo: FormControl<string>;
    Piso: FormControl<string>;
}
