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
  activo: boolean;
}

export interface UserLogin extends User{
  access_token:string
}

export interface FirebaseUser {
  uid: string;
  driverId?: string; // Formato DRV-001
  name: string;
  lastName: string;
  email: string;
  phone?: string;
  rol: 'admin' | 'user' | 'supervisor' | 'crew' | 'conductor' | 'empleado' | 'mecanico';
  camionId?: string; // Formato VEH-001
  rutaAsignada?: string; // Opcional si se calcula dinámicamente desde la ruta del camión
  address?: {
     sector: string;
     lat: number;
     lng: number;
   };
<<<<<<< HEAD
}
=======
   activo: boolean;
}
>>>>>>> 7e021c7dcb168a21d1ee001761a14342ef0d920d
