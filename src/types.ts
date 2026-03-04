// Shared types for Phase 1

export interface Service {
  id: number;
  name: string;
  durationMinutes: number;
  price: number;
  category: string;
}

export interface Professional {
  id: number;
  name: string;
}

export interface Appointment {
  id: number;
  clientName: string;
  phone: string;
  email: string | null;
  treatment: string;
  dateTime: string;
  durationMinutes: number;
  status: string;
  token: string | null;
  source: string;
  service_id: number | null;
  professional_id: number | null;
  serviceName?: string;
  professionalName?: string;
}

export interface AvailabilitySlot {
  time: string;
  professionalIds: number[];
}
