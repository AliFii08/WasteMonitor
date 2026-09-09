export const VEHICLE_TYPES = [
  'retroexcavadora',
  'volteo',
  'minimati',
  'compactadores',
  'gandolas',
  'anacondas',
] as const;

export type VehicleType = (typeof VEHICLE_TYPES)[number];

export interface Vehicle {
  id: string;
  type: VehicleType;
  weight: number;
  plate: string;
  route?: string;
  status: string;
  activo?: boolean;
}
