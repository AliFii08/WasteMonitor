export interface Quejas {
    id?: string;
    userId: string;
    asunto: string;
    descripcion: string;
    fecha: number;
    estado: 'pendiente' | 'en_revision' | 'resuelto';
  }