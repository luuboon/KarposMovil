export type Role = 'admin' | 'doctor' | 'patient';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface User {
  id: number;
  email: string;
  role: Role;
  created_at: string;
  updated_at: string;
}

export interface Patient {
  id_pc: number;
  nombre: string;
  apellido_p: string;
  apellido_m: string;
  age: number;
  weight: number;
  height: number;
  gender: 'male' | 'female' | 'other';
  blood_type: string;
  id_us: number;
  progress?: number;
}

export interface Doctor {
  id_dc: number;
  nombre: string;
  apellido_p: string;
  apellido_m: string;
  prof_id: string;
  id_us: number;
  especialidad?: string;
}

export interface Appointment {
  id_ap: number;
  id_pc: number;
  id_dc: number;
  date: string;
  time: string;
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'failed';
  payment_amount: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  doctor?: {
    nombre: string;
    apellido_p: string;
    apellido_m?: string;
    speciality?: string;
  };
}

export interface MedicalRecord {
  id_mr: number;
  id_pc: number;
  diagnosis: string;
  treatment: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Factura {
  id: number;
  id_ap: number;
  fecha: string;
  monto: number;
  concepto: string;
  estado: string;
}

export interface RegisterDTO {
  email: string;
  password: string;
  role: Role;
  nombre: string;
  apellido_p: string;
  apellido_m: string;
  age?: number;
  weight?: number;
  height?: number;
  gender?: 'male' | 'female' | 'other';
  blood_type?: string;
  prof_id?: string;
} 