import { API_CONFIG } from '../config';
import { ApiClient } from '../api-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Patient } from './patients';
import { Appointment } from './appointments';
import * as SecureStore from 'expo-secure-store';
import { AuthService } from './auth';

export interface Doctor {
  id_dc: number;
  nombre: string;
  apellido_p: string;
  apellido_m: string;
  prof_id: string;
  id_us: number;
  speciality?: string;
}

interface DoctorPatientsResult {
  success: boolean;
  patients: Patient[];
  error?: string;
}

interface LatestAppointmentResult {
  success: boolean;
  appointment: Appointment | null;
  error?: string;
}

export const DoctorService = {
  /**
   * Obtiene el perfil del doctor actual
   * @returns Información del doctor
   */
  async getMyProfile(): Promise<Doctor> {
    try {
      const userId = await AuthService.getUserId();
      console.log(`[Doctor] Obteniendo perfil de doctor con ID de usuario: ${userId}`);
      
      if (!userId) {
        throw new Error('No se pudo obtener el ID de usuario');
      }
      
      // Primero intentar obtener la lista completa de doctores
      console.log(`[Doctor] Solicitando lista completa de doctores`);
      
      // Usar URL directa para evitar 404
      const directEndpoint = `${API_CONFIG.BASE_URL}/doctors`;
      console.log(`[Doctor] Solicitando datos a: ${directEndpoint}`);
      
      const headers = await AuthService.getAuthHeaders();
      const response = await fetch(directEndpoint, { headers });
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const doctors = await response.json();
      console.log(`[Doctor] Se encontraron ${Array.isArray(doctors) ? doctors.length : 0} doctores`);
      
      // Buscar el doctor que coincida con el ID de usuario
      if (Array.isArray(doctors) && doctors.length > 0) {
        const myDoctor = doctors.find(doc => doc.id_us === userId);
        
        if (myDoctor) {
          console.log('[Doctor] Doctor encontrado por id_us:', JSON.stringify(myDoctor));
          return myDoctor;
        }
      }
      
      // Si no se encuentra, intentar con el primer doctor si existe (solo para desarrollo)
      if (Array.isArray(doctors) && doctors.length > 0) {
        console.log('[Doctor] Usando primer doctor de la lista para desarrollo:', JSON.stringify(doctors[0]));
        return doctors[0];
      }
      
      throw new Error('No se encontraron datos del doctor para este usuario');
    } catch (error) {
      console.error('[Doctor] Error al obtener perfil de doctor:', error);
      
      // Intentar con endpoint alternativo (endpoint antiguo por compatibilidad)
      try {
        console.log('[Doctor] Intentando obtener perfil con ruta específica de usuario');
        
        const userId = await AuthService.getUserId();
        if (!userId) throw new Error('No se pudo obtener el ID de usuario');
        
        // Usar el endpoint específico con usuario
        const headers = await AuthService.getAuthHeaders();
        const endpoint = `${API_CONFIG.BASE_URL}/doctors/user/${userId}`;
        console.log(`[Doctor] Solicitando datos a: ${endpoint}`);
        
        const response = await fetch(endpoint, { headers });
        
        if (response.ok) {
          const data = await response.json();
          if (data) {
            console.log('[Doctor] Doctor encontrado con endpoint específico:', JSON.stringify(data));
            return data;
          }
        }
      } catch (fallbackError) {
        console.error('[Doctor] Error en intento alternativo:', fallbackError);
      }
      
      // Si llega aquí, no fue posible obtener los datos del doctor
      throw new Error('No se pudo obtener el perfil del doctor');
    }
  },
  
  /**
   * Obtiene un doctor por su ID
   * @param id ID del doctor
   * @returns Información del doctor
   */
  async getDoctorById(id: number): Promise<Doctor> {
    try {
      console.log(`Obteniendo doctor con ID: ${id}`);
      const response = await ApiClient.request(`${API_CONFIG.ENDPOINTS.DOCTORS}/${id}`);
      
      if (response && typeof response === 'object') {
        console.log('Doctor encontrado por ID:', JSON.stringify(response));
        return response as Doctor;
      }
      
      if (Array.isArray(response) && response.length > 0) {
        console.log('Doctor encontrado por ID (en array):', JSON.stringify(response[0]));
        return response[0] as Doctor;
      }
      
      throw new Error(`No se encontró el doctor con ID ${id}`);
    } catch (error) {
      console.error(`Error al obtener doctor con ID ${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Obtiene todos los doctores
   * @returns Lista de doctores
   */
  async getAllDoctors(): Promise<Doctor[]> {
    try {
      console.log('Obteniendo lista de todos los doctores');
      const response = await ApiClient.request(API_CONFIG.ENDPOINTS.DOCTORS);
      
      if (Array.isArray(response)) {
        console.log(`Se encontraron ${response.length} doctores`);
        return response as Doctor[];
      }
      
      return [];
    } catch (error) {
      console.error('Error al obtener lista de doctores:', error);
      throw error;
    }
  },
  
  /**
   * Obtiene las próximas citas del doctor
   * @returns Lista de citas
   */
  async getUpcomingAppointments(): Promise<any[]> {
    try {
      // Primero obtener el ID del doctor a partir del ID de usuario
      const doctorProfile = await this.getMyProfile();
      const doctorId = doctorProfile.id_dc;
      
      if (!doctorId) {
        throw new Error('No se pudo obtener el ID del doctor');
      }
      
      console.log(`Obteniendo citas para doctor ID: ${doctorId}`);
      
      // Obtener citas del doctor
      const endpoint = API_CONFIG.ENDPOINTS.APPOINTMENTS.DOCTOR(doctorId);
      console.log(`Solicitando citas a: ${endpoint}`);
      
      const appointments = await ApiClient.request(endpoint);
      console.log(`Respuesta de citas: ${JSON.stringify(appointments)}`);
      
      if (Array.isArray(appointments) && appointments.length > 0) {
        // Extraer datos de citas si están dentro de un objeto "appointment"
        const processedAppointments = appointments.map(item => {
          if (item.appointment) {
            return {
              ...item.appointment,
              patient: item.patient // mantener la referencia al paciente
            };
          }
          return item;
        });
        
        // Filtrar solo citas futuras con estado pendiente o completado
        // No usamos "scheduled" porque no está permitido en la base de datos
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const filteredAppointments = processedAppointments
          .filter(app => {
            const appDate = new Date(app.date);
            return appDate >= today && 
                  (app.status === 'pending' || app.status === 'completed');
          })
          .sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.time}`);
            const dateB = new Date(`${b.date}T${b.time}`);
            return dateA.getTime() - dateB.getTime();
          });
          
        console.log(`Se encontraron ${filteredAppointments.length} citas activas`);
        return filteredAppointments;
      }
      
      console.log('No se encontraron citas para este doctor');
      return [];
    } catch (error) {
      console.error('Error al obtener citas del doctor:', error);
      throw error;
    }
  },

  /**
   * Obtiene las próximas citas del doctor sin procesar los datos
   * @returns Datos de citas en formato bruto (raw) como vienen de la API
   */
  async getUpcomingAppointmentsRaw(): Promise<any[]> {
    try {
      // Primero obtener el ID del doctor a partir del ID de usuario
      const doctorProfile = await this.getMyProfile();
      const doctorId = doctorProfile.id_dc;
      
      if (!doctorId) {
        throw new Error('No se pudo obtener el ID del doctor');
      }
      
      console.log(`Obteniendo citas para doctor ID: ${doctorId}`);
      
      // Obtener citas del doctor
      const endpoint = API_CONFIG.ENDPOINTS.APPOINTMENTS.DOCTOR(doctorId);
      console.log(`Solicitando citas a: ${endpoint}`);
      
      const appointments = await ApiClient.request(endpoint);
      console.log(`Respuesta de citas: ${JSON.stringify(appointments)}`);
      
      if (Array.isArray(appointments)) {
        return appointments;
      }
      
      console.log('No se encontraron citas para este doctor');
      return [];
    } catch (error) {
      console.error('Error al obtener citas del doctor (raw):', error);
      throw error;
    }
  },

  /**
   * Obtiene los pacientes asignados a un doctor específico
   * @param doctorId ID del doctor
   * @returns Lista de pacientes
   */
  async getDoctorPatients(doctorId: number): Promise<DoctorPatientsResult> {
    try {
      console.log(`[Doctor] Obteniendo pacientes asignados al doctor ID: ${doctorId}`);
      
      // 1. Primero intentar obtener las citas del doctor directamente
      const appointmentsEndpoint = `${API_CONFIG.BASE_URL}/appointments/doctor/${doctorId}`;
      console.log(`[API] Obteniendo citas desde: ${appointmentsEndpoint}`);
      
      const headers = await AuthService.getAuthHeaders();
      
      try {
        const appointmentsResponse = await fetch(appointmentsEndpoint, { headers });
        
        if (appointmentsResponse.ok) {
          const appointments = await appointmentsResponse.json();
          console.log(`[Doctor] Se encontraron ${appointments.length} citas`);
          
          if (appointments && appointments.length > 0) {
            // Extraer IDs únicos de pacientes
            const patientIds = Array.from(new Set(appointments.map((a: any) => {
              // Extraer ID del paciente según la estructura
              if (a.appointment && a.appointment.id_pc) {
                return a.appointment.id_pc;
              }
              if (a.patient && a.patient.id) {
                return a.patient.id;
              }
              if (a.id_pc) {
                return a.id_pc;
              }
              return null;
            }).filter(id => id !== null)));
            
            console.log(`[Doctor] IDs únicos de pacientes encontrados: ${patientIds.join(', ')}`);
            
            // Obtener detalles de los pacientes
            const patients = await this.getPatientsByIds(patientIds, headers);
            
            return {
              success: true,
              patients
            };
          }
        } else {
          console.warn(`[Doctor] Error obteniendo citas: ${appointmentsResponse.status}`);
        }
      } catch (error) {
        console.error('[Doctor] Error en la obtención de citas:', error);
      }
      
      // 2. Si el primer método falla, intentar obtener todos los pacientes y filtrar
      console.log('[Doctor] Intentando método alternativo: obtener todos los pacientes');
      
      try {
        const patientsEndpoint = `${API_CONFIG.BASE_URL}/patients`;
        console.log(`[API] Obteniendo todos los pacientes desde: ${patientsEndpoint}`);
        
        const patientsResponse = await fetch(patientsEndpoint, { headers });
        
        if (patientsResponse.ok) {
          const allPatients = await patientsResponse.json();
          console.log(`[Doctor] Se encontraron ${allPatients.length} pacientes en total`);
          
          // Como no podemos filtrar por doctor, devolvemos todos para desarrollo
          return {
            success: true,
            patients: allPatients
          };
        } else {
          console.warn(`[Doctor] Error obteniendo pacientes: ${patientsResponse.status}`);
        }
      } catch (error) {
        console.error('[Doctor] Error en la obtención de pacientes:', error);
      }
      
      // Si no hay pacientes, devolver una lista vacía
      console.warn('[Doctor] No se encontraron pacientes para este doctor');
      return {
        success: false,
        patients: [],
        error: 'No se encontraron pacientes para este doctor'
      };
    } catch (error) {
      console.error('[Doctor] Error general en getDoctorPatients:', error);
      return {
        success: false,
        patients: [],
        error: error.message
      };
    }
  },
  
  /**
   * Método auxiliar para obtener pacientes por sus IDs
   */
  async getPatientsByIds(patientIds: number[], headers: any): Promise<any[]> {
    const patients = [];
    
    // Si no se proporcionan headers, obtenerlos
    if (!headers) {
      headers = await AuthService.getAuthHeaders();
    }
    
    for (const patientId of patientIds) {
      try {
        const patientEndpoint = `${API_CONFIG.BASE_URL}/patients/${patientId}`;
        console.log(`[API] Obteniendo paciente desde: ${patientEndpoint}`);
        
        const patientResponse = await fetch(patientEndpoint, { headers });
        
        if (patientResponse.ok) {
          const patientData = await patientResponse.json();
          console.log(`[Doctor] Paciente ${patientId} obtenido correctamente`);
          
          // Asegurar que tenga id_pc
          if (patientData) {
            if (!patientData.id_pc && patientData.id) {
              patientData.id_pc = patientData.id;
            }
            patients.push(patientData);
          }
        } else {
          console.warn(`[Doctor] No se pudo obtener el paciente ID ${patientId}: ${patientResponse.status}`);
        }
      } catch (error) {
        console.error(`[Doctor] Error al obtener paciente ID ${patientId}:`, error);
      }
    }
    
    return patients;
  },
  
  /**
   * Obtiene la cita más reciente de un paciente específico
   * @param patientId ID del paciente
   * @returns La cita más reciente o null si no hay citas
   */
  async getLatestAppointment(patientId: number): Promise<LatestAppointmentResult> {
    try {
      console.log(`[Doctor] Obteniendo última cita para paciente ID: ${patientId}`);
      
      // Usar la URL completa
      const appointmentsEndpoint = `${API_CONFIG.BASE_URL}/appointments/patient/${patientId}`;
      console.log(`[API] Obteniendo citas desde: ${appointmentsEndpoint}`);
      
      const headers = await AuthService.getAuthHeaders();
      
      try {
        const response = await fetch(appointmentsEndpoint, { headers });
        
        if (response.ok) {
          const appointments = await response.json();
          console.log(`[Doctor] Se encontraron ${appointments.length} citas para el paciente`);
          
          // Mostrar la primera cita para depuración
          if (appointments && appointments.length > 0) {
            console.log(`[Doctor] Ejemplo de primera cita:`, JSON.stringify(appointments[0]).substring(0, 200) + "...");
          
            // Extraer detalles de cita, considerando posible estructura anidada
            const processedAppointments = appointments.map((app: any) => {
              // Si la cita está en formato anidado, extraer datos
              if (app.appointment) {
                console.log(`[Doctor] Procesando cita con estructura anidada`);
                return {
                  id_ap: app.appointment.id_ap,
                  id_pc: app.appointment.id_pc,
                  id_dc: app.appointment.id_dc,
                  date: app.appointment.date,
                  time: app.appointment.time,
                  status: app.appointment.status,
                  notes: app.appointment.notes,
                  payment_amount: app.appointment.payment_amount,
                  payment_status: app.appointment.payment_status,
                  // Mantener referencia a estructuras anidadas originales
                  patient: app.patient,
                  doctor: app.doctor
                };
              }
              // Si no está anidada, devolverla tal cual
              return app;
            });
            
            // Ordenar por fecha (más reciente primero)
            processedAppointments.sort((a: Appointment, b: Appointment) => {
              // Primero comparamos por fecha
              const dateA = new Date(a.date || '2000-01-01');
              const dateB = new Date(b.date || '2000-01-01');
              
              if (dateA > dateB) return -1;
              if (dateA < dateB) return 1;
              
              // Si las fechas son iguales, comparamos por hora
              const timeA = (a.time || '00:00').split(':');
              const timeB = (b.time || '00:00').split(':');
              
              const hourA = parseInt(timeA[0]);
              const hourB = parseInt(timeB[0]);
              
              if (hourA !== hourB) return hourB - hourA;
              
              const minA = parseInt(timeA[1]);
              const minB = parseInt(timeB[1]);
              
              return minB - minA;
            });
            
            const latestAppointment = processedAppointments[0];
            console.log(`[Doctor] Última cita encontrada con ID: ${latestAppointment.id_ap}`);
            
            return {
              success: true,
              appointment: latestAppointment
            };
          }
        } else {
          console.warn(`[Doctor] Error obteniendo citas: ${response.status}`);
        }
      } catch (error) {
        console.error('[Doctor] Error en la obtención de citas del paciente:', error);
      }
      
      // Si no se encontraron citas, devolver null
      console.warn('[Doctor] No se encontraron citas para este paciente');
      return {
        success: false,
        appointment: null,
        error: 'No se encontraron citas para este paciente'
      };
    } catch (error) {
      console.error('[Doctor] Error obteniendo última cita:', error);
      return {
        success: false,
        appointment: null,
        error: error.message
      };
    }
  }
};