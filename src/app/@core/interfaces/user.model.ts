export interface User{
  id_usuario: number,
  Nombre: string,
  Apellido: string,
  Cedula: string,
  Correo: string,
  Contraseña?: string,
  Hora: number,
  Cargo_idCargo:number,
  idCargo:number,
  Turno_idTurno:number,
  Fecha_Nacimiento: string;
  Cargo: string;
  piso: string;
  Turno: string;
  fotografia: any;
  idTurno: number;
}

export interface UserLogin extends User{
  access_token:string
}
