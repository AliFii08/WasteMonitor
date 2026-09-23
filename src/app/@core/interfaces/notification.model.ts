export interface NotificacionItem {
    id: string;
    titulo: string;
    mensaje: string;
    tipo: 'alerta' | 'info' | 'exito' | 'error' | string;
    leida: boolean;
    timestamp: number;
  }