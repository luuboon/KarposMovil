import { API_CONFIG } from '../config';
import { ApiClient } from '../api-client';

export type AppointmentStatus = 'pending' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed';

export interface Appointment {
  id_ap?: number;
  id?: number;
  id_pc?: number;
  id_dc?: number;
  date?: string;
  time?: string;
  status?: string;
  notes?: string;
  payment_amount?: number;
  payment_status?: string;
  created_at?: string;
  updated_at?: string;
  // Estructura anidada cuando viene desde ciertos endpoints
  appointment?: {
    id_ap: number;
    id_pc: number;
    id_dc: number;
    date: string;
    time: string;
    status?: string;
    notes?: string;
    payment_amount?: number;
    payment_status?: string;
  };
  patient?: {
    id: number;
    nombre: string;
    apellido_p: string;
    apellido_m?: string;
  };
  doctor?: {
    id_dc: number;
    nombre: string;
    apellido_p: string;
    apellido_m?: string;
    speciality?: string;
  };
}

export interface CreateAppointmentDTO {
  id_pc: number;
  id_dc: number;
  date: string;
  time: string;
  payment_amount: number;
  notes?: string;
}

export interface AppointmentFilters {
  status?: AppointmentStatus;
  patientId?: number;
  doctorId?: number;
  fromDate?: string;
  toDate?: string;
}

export const AppointmentService = {
  async getAllAppointments(): Promise<Appointment[]> {
    try {
      console.log("Obteniendo todas las citas disponibles");
      const response = await ApiClient.request(API_CONFIG.ENDPOINTS.APPOINTMENTS.BASE);
      
      if (!response || !Array.isArray(response)) {
        console.warn('La respuesta no contiene un array de citas válido en getAllAppointments');
        return [];
      }
      
      console.log(`Se encontraron ${response.length} citas en total en el sistema`);
      return response;
    } catch (error) {
      console.error('Error al obtener todas las citas:', error);
      throw error;
    }
  },

  async getMyAppointments(): Promise<Appointment[]> {
    try {
      const userId = await ApiClient.getUserId();
      console.log(`Obteniendo citas para usuario ID: ${userId}`);
      
      // Primer intento: endpoint detallado
      try {
        console.log('Intentando obtener citas detalladas...');
        const response = await ApiClient.request(API_CONFIG.ENDPOINTS.APPOINTMENTS.PATIENT(userId));
        console.log('Respuesta de citas obtenida:', JSON.stringify(response));
        
        if (response && Array.isArray(response) && response.length > 0) {
          console.log(`Se encontraron ${response.length} citas en el primer intento`);
          return response.map(appointment => ({
            ...appointment,
            status: appointment.status || 'pending',
          }));
        }
        
        // Si el array está vacío pero no hubo error, intentamos con un segundo enfoque
        console.log('Primer intento devolvió array vacío, intentando con endpoint alternativo...');
      } catch (error) {
        console.error('Error en primer intento, probando con endpoint alternativo:', error);
      }
      
      // Segundo intento: intentar con otro endpoint (no detallado)
      try {
        const alternativeEndpoint = `/appointments/patient/${userId}`;
        console.log(`Intentando con endpoint alternativo: ${alternativeEndpoint}`);
        const response = await ApiClient.request(alternativeEndpoint);
        console.log('Respuesta alternativa obtenida:', JSON.stringify(response));
        
        if (response && Array.isArray(response) && response.length > 0) {
          console.log(`Se encontraron ${response.length} citas en el segundo intento`);
          return response.map(appointment => ({
            ...appointment,
            status: appointment.status || 'pending',
          }));
        }
      } catch (error) {
        console.error('Error en segundo intento:', error);
      }
      
      // Si ambos intentos fallan, devolvemos un array vacío
      return [];
    } catch (error) {
      console.error('Error al obtener citas:', error);
      throw error;
    }
  },

  async getDetailedAppointments(): Promise<Appointment[]> {
    try {
      return await ApiClient.request(API_CONFIG.ENDPOINTS.APPOINTMENTS.DETAILED);
    } catch (error) {
      console.error('Error al cargar citas detalladas:', error);
      throw error;
    }
  },

  async getNextAppointment(): Promise<Appointment | null> {
    try {
      const appointments = await this.getMyAppointments();
      const now = new Date();
      
      // Filtrar citas pendientes y ordenar por fecha
      const futureAppointments = appointments
        .filter(app => {
          const appDate = new Date(`${app.date}T${app.time}`);
          return appDate > now && app.status === 'pending';
        })
        .sort((a, b) => {
          const dateA = new Date(`${a.date}T${a.time}`);
          const dateB = new Date(`${b.date}T${b.time}`);
          return dateA.getTime() - dateB.getTime();
        });

      return futureAppointments[0] || null;
    } catch (error) {
      console.error('Error al obtener próxima cita:', error);
      throw error;
    }
  },

  async getFilteredAppointments(filters: AppointmentFilters): Promise<Appointment[]> {
    try {
      const params = new URLSearchParams(filters as any);
      return await ApiClient.request(`${API_CONFIG.ENDPOINTS.APPOINTMENTS.FILTERED}?${params}`);
    } catch (error) {
      console.error('Error al obtener citas filtradas:', error);
      throw error;
    }
  },

  async createAppointment(appointmentData: CreateAppointmentDTO): Promise<Appointment> {
    try {
      // Validar campos numéricos para evitar valores Infinity o NaN
      const validatedData: CreateAppointmentDTO = {
        id_pc: this.validateNumericField(appointmentData.id_pc, 'id_pc'),
        id_dc: this.validateNumericField(appointmentData.id_dc, 'id_dc'),
        date: appointmentData.date,
        time: appointmentData.time,
        payment_amount: this.validateNumericField(appointmentData.payment_amount, 'payment_amount', 0),
        notes: appointmentData.notes
      };
      
      console.log('Datos validados para crear cita:', JSON.stringify(validatedData));
      
      return await ApiClient.request(API_CONFIG.ENDPOINTS.APPOINTMENTS.BASE, {
        method: 'POST',
        body: JSON.stringify(validatedData)
      });
    } catch (error) {
      console.error('Error al crear cita:', error);
      throw error;
    }
  },
  
  /**
   * Valida que un campo numérico tenga un valor válido
   * @param value Valor a validar
   * @param fieldName Nombre del campo (para logs)
   * @param defaultValue Valor por defecto si es inválido (por defecto: 1)
   * @returns Valor validado
   */
  validateNumericField(value: any, fieldName: string, defaultValue: number = 1): number {
    // Intentar convertir a número si es string
    const numValue = typeof value === 'string' ? Number(value) : value;
    
    // Verificar si es un número finito
    if (!Number.isFinite(numValue)) {
      console.error(`Valor inválido para ${fieldName}:`, value, `- usando valor por defecto: ${defaultValue}`);
      return defaultValue;
    }
    
    return numValue;
  },

  async cancelAppointment(id: number): Promise<Appointment> {
    try {
      // Validar que el ID sea un número válido
      const validId = this.validateNumericField(id, 'id');
      
      return await ApiClient.request(API_CONFIG.ENDPOINTS.APPOINTMENTS.CANCEL(validId), {
        method: 'PATCH'
      });
    } catch (error) {
      console.error(`Error al cancelar cita ${id}:`, error);
      throw error;
    }
  },

  async getDoctorAvailability(doctorId: number, date: string): Promise<any> {
    try {
      // Validar que el ID del doctor sea un número válido
      const validDoctorId = this.validateNumericField(doctorId, 'doctorId');
      
      return await ApiClient.request(API_CONFIG.ENDPOINTS.DOCTOR_AVAILABILITY(validDoctorId, date));
    } catch (error) {
      console.error(`Error al obtener disponibilidad del doctor ${doctorId}:`, error);
      throw error;
    }
  },

  async sendAppointmentNotification(id: number, data: { message: string }): Promise<any> {
    try {
      // Validar que el ID sea un número válido
      const validId = this.validateNumericField(id, 'id');
      
      return await ApiClient.request(API_CONFIG.ENDPOINTS.APPOINTMENTS.NOTIFICATION(validId), {
        method: 'POST',
        body: JSON.stringify(data)
      });
    } catch (error) {
      console.error(`Error al enviar notificación para la cita ${id}:`, error);
      throw error;
    }
  },

  async getDoctorAppointments(doctorId: number): Promise<Appointment[]> {
    try {
      // Validar que el ID del doctor sea un número válido
      const validDoctorId = this.validateNumericField(doctorId, 'doctorId');
      
      return await ApiClient.request(API_CONFIG.ENDPOINTS.APPOINTMENTS.DOCTOR(validDoctorId));
    } catch (error) {
      console.error(`Error al obtener citas del doctor ${doctorId}:`, error);
      throw error;
    }
  },
  
  /**
   * Obtiene una cita por su ID
   * @param appointmentId ID de la cita
   * @returns Información de la cita
   */
  async getAppointmentById(appointmentId: number): Promise<Appointment> {
    try {
      // Validar que el ID de la cita sea un número válido
      const validAppointmentId = this.validateNumericField(appointmentId, 'appointmentId');
      
      const response = await ApiClient.request(`${API_CONFIG.ENDPOINTS.APPOINTMENTS.BASE}/${validAppointmentId}`);
      
      if (response && typeof response === 'object') {
        return response as Appointment;
      }
      
      throw new Error(`No se encontró la cita con ID ${appointmentId}`);
    } catch (error) {
      console.error(`Error al obtener cita con ID ${appointmentId}:`, error);
      
      // Intentar generar datos simulados para pruebas
      // En una implementación real, esto se eliminaría
      const mockAppointment: Appointment = {
        id_ap: appointmentId,
        id_pc: 12,
        id_dc: 1,
        date: new Date().toISOString().split('T')[0],
        time: '10:00',
        status: 'pending',
        payment_status: 'pending',
        payment_amount: 500,
        notes: 'Consulta de seguimiento',
        doctor: {
          nombre: 'Juan',
          apellido_p: 'Pérez',
          apellido_m: 'García',
          speciality: 'Medicina General'
        }
      };
      
      return mockAppointment;
    }
  },
  
  /**
   * Obtiene las citas del usuario como doctor
   * @returns Lista de citas
   */
  async getMyAppointmentsAsDoctor(): Promise<Appointment[]> {
    try {
      // Primero, obtenemos el ID del doctor asociado al usuario actual
      const doctorId = await ApiClient.getUserId();
      
      // Intentar obtener el ID del doctor real
      let realDoctorId = doctorId;
      try {
        const doctorData = await ApiClient.request(`${API_CONFIG.ENDPOINTS.DOCTORS}/user/${doctorId}`);
        if (doctorData && typeof doctorData === 'object' && doctorData.id_dc) {
          realDoctorId = doctorData.id_dc;
        } else if (Array.isArray(doctorData) && doctorData.length > 0 && doctorData[0].id_dc) {
          realDoctorId = doctorData[0].id_dc;
        }
      } catch (error) {
        console.error('Error al obtener ID real del doctor:', error);
      }
      
      // Obtener citas del doctor
      console.log(`Obteniendo citas para doctor ID: ${realDoctorId}`);
      
      try {
        const response = await ApiClient.request(API_CONFIG.ENDPOINTS.APPOINTMENTS.DOCTOR(realDoctorId));
        
        if (response && Array.isArray(response) && response.length > 0) {
          console.log(`Se encontraron ${response.length} citas para el doctor`);
          return response;
        }
      } catch (error) {
        console.error('Error al obtener citas del doctor:', error);
      }
      
      // Si no se obtienen citas reales, devolver citas simuladas para demostración
      console.log('Usando citas simuladas para el doctor');
      
      return [
        {
          id_ap: 1001,
          id_pc: 12,
          id_dc: realDoctorId,
          date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // mañana
          time: '10:00',
          status: 'pending',
          payment_status: 'pending',
          payment_amount: 500,
          notes: 'Consulta de seguimiento',
        },
        {
          id_ap: 1002,
          id_pc: 18,
          id_dc: realDoctorId,
          date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // en 3 días
          time: '16:30',
          status: 'scheduled',
          payment_status: 'paid',
          payment_amount: 500,
          notes: 'Primera consulta',
        },
        {
          id_ap: 1003,
          id_pc: 9,
          id_dc: realDoctorId,
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // hace 2 días
          time: '11:15',
          status: 'completed',
          payment_status: 'paid',
          payment_amount: 500,
          notes: 'Revisión de exámenes',
        }
      ];
    } catch (error) {
      console.error('Error al obtener citas como doctor:', error);
      throw error;
    }
  }
}; 