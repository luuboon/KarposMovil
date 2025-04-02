import { API_CONFIG } from '../config';
import { ApiClient } from '../api-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Patient } from './patients';
import { Appointment } from './appointments';
import * as SecureStore from 'expo-secure-store';

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
  async getAuthHeaders() {
    const token = await SecureStore.getItemAsync('accessToken');
    
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  },

  /**
   * Obtiene el perfil del doctor actual
   * @returns Información del doctor
   */
  async getMyProfile(): Promise<Doctor> {
    try {
      const userId = await ApiClient.getUserId();
      console.log(`Obteniendo perfil de doctor con ID de usuario: ${userId}`);
      
      if (!userId) {
        throw new Error('No se pudo obtener el ID de usuario');
      }
      
      // Solicitud a la API para obtener perfil por ID de usuario
      const endpoint = `${API_CONFIG.ENDPOINTS.DOCTORS}/user/${userId}`;
      console.log(`Solicitando datos del doctor a: ${endpoint}`);
      
      const response = await ApiClient.request(endpoint);
      console.log('Respuesta de perfil de doctor (completa):', JSON.stringify(response));
      
      if (Array.isArray(response) && response.length > 0) {
        console.log('Perfil doctor encontrado:', JSON.stringify(response[0]));
        return response[0] as Doctor;
      } else if (response && typeof response === 'object') {
        console.log('Perfil doctor encontrado (objeto):', JSON.stringify(response));
        return response as Doctor;
      }
      
      throw new Error('No se encontraron datos del doctor para este usuario');
    } catch (error) {
      console.error('Error detallado al obtener perfil de doctor:', error);
      
      // Intentar con endpoint alternativo
      try {
        console.log('Intentando obtener perfil de doctor con endpoint alternativo');
        const userId = await ApiClient.getUserId();
        if (!userId) throw new Error('No se pudo obtener el ID de usuario');
        
        const response = await ApiClient.request(`${API_CONFIG.ENDPOINTS.DOCTORS}`);
        
        // Si obtenemos un array, buscar el doctor con el mismo id_us
        if (Array.isArray(response) && response.length > 0) {
          const myDoctor = response.find(doc => doc.id_us === userId);
          if (myDoctor) {
            console.log('Doctor encontrado en la lista por id_us:', JSON.stringify(myDoctor));
            return myDoctor as Doctor;
          }
        }
      } catch (fallbackError) {
        console.error('Error en intento alternativo:', fallbackError);
      }
      
      // Si llegamos aquí, no pudimos obtener los datos del doctor
      throw new Error('No se pudo obtener el perfil del doctor después de múltiples intentos');
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
        // Filtrar solo citas futuras
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const filteredAppointments = appointments
          .filter(app => {
            const appDate = new Date(app.date);
            return appDate >= today && (app.status === 'pending' || app.status === 'scheduled');
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
   * Obtiene los pacientes asignados a un doctor específico
   * @param doctorId ID del doctor
   * @returns Lista de pacientes
   */
  async getDoctorPatients(doctorId: number): Promise<DoctorPatientsResult> {
    try {
      console.log(`[Doctor] Obteniendo pacientes asignados al doctor ID: ${doctorId}`);
      
      // 1. Construir el endpoint correcto
      const appointmentsEndpoint = `/appointments/doctor/${doctorId}`;
      const fullEndpoint = `${API_CONFIG.BASE_URL}${appointmentsEndpoint}`;
      console.log(`[API] Obteniendo citas desde: ${fullEndpoint}`);
      
      const headers = await this.getAuthHeaders();
      const appointmentsResponse = await fetch(fullEndpoint, { 
        headers 
      });
      
      if (!appointmentsResponse.ok) {
        console.error(`[Doctor] Error HTTP: ${appointmentsResponse.status}, ${await appointmentsResponse.text()}`);
        throw new Error(`Error obteniendo citas del doctor: ${appointmentsResponse.status}`);
      }
      
      const appointments = await appointmentsResponse.json();
      console.log(`[Doctor] Se encontraron ${appointments.length} citas. Primera cita:`, JSON.stringify(appointments[0] || {}));
      
      if (!appointments || appointments.length === 0) {
        return {
          success: true,
          patients: []
        };
      }
      
      // 2. Extraer IDs únicos de pacientes de esas citas
      // La estructura es diferente: cada objeto tiene appointment y patient anidados
      const patientIds = Array.from(new Set(appointments.map((a: any) => {
        // Extraer ID del paciente de la estructura anidada
        if (a.appointment && a.appointment.id_pc) {
          return a.appointment.id_pc;
        }
        // Alternativa: usar el ID del objeto patient si existe
        if (a.patient && a.patient.id) {
          return a.patient.id;
        }
        if (a.id_pc) {
          return a.id_pc;
        }
        return null;
      }).filter(id => id !== null)));
      
      console.log(`[Doctor] IDs únicos de pacientes: ${patientIds.join(', ')}`);
      
      if (patientIds.length === 0) {
        console.log('[Doctor] No se encontraron IDs de pacientes en las citas');
        return {
          success: true,
          patients: []
        };
      }
      
      // 3. Obtener detalles de cada paciente
      const patientsPromises = patientIds.map(async (patientId: number) => {
        const patientEndpoint = `/patients/${patientId}`;
        const fullPatientEndpoint = `${API_CONFIG.BASE_URL}${patientEndpoint}`;
        console.log(`[API] Obteniendo paciente desde: ${fullPatientEndpoint}`);
        
        try {
          const patientResponse = await fetch(fullPatientEndpoint, { 
            headers 
          });
          
          if (!patientResponse.ok) {
            console.warn(`[Doctor] No se pudo obtener el paciente ID: ${patientId} - Status: ${patientResponse.status}`);
            return null;
          }
          
          const patientData = await patientResponse.json();
          console.log(`[Doctor] Datos del paciente ${patientId}:`, JSON.stringify(patientData).substring(0, 200) + "...");
          
          // Asegurarse de que el objeto tenga la estructura esperada
          // Si la API devuelve el id como 'id' pero nuestro código espera 'id_pc'
          if (patientData && patientData.id && !patientData.id_pc) {
            patientData.id_pc = patientData.id;  // Añadir campo id_pc si no existe
          }
          
          return patientData;
        } catch (error) {
          console.error(`[Doctor] Error al obtener paciente ID ${patientId}:`, error);
          return null;
        }
      });
      
      try {
        const patientsResults = await Promise.all(patientsPromises);
        const patients = patientsResults.filter(p => p !== null);
        
        console.log(`[Doctor] Se encontraron ${patients.length} pacientes con datos válidos`);
        
        return {
          success: true,
          patients
        };
      } catch (error) {
        console.error('[Doctor] Error procesando pacientes:', error);
        return {
          success: false,
          patients: [],
          error: error.message
        };
      }
    } catch (error) {
      console.error('[Doctor] Error obteniendo pacientes:', error);
      return {
        success: false,
        patients: [],
        error: error.message
      };
    }
  },

  /**
   * Obtiene la cita más reciente de un paciente específico
   * @param patientId ID del paciente
   * @returns La cita más reciente o null si no hay citas
   */
  async getLatestAppointment(patientId: number): Promise<LatestAppointmentResult> {
    try {
      console.log(`[Doctor] Obteniendo última cita para paciente ID: ${patientId}`);
      
      const appointmentsEndpoint = `/appointments/patient/${patientId}`;
      const fullEndpoint = `${API_CONFIG.BASE_URL}${appointmentsEndpoint}`;
      console.log(`[API] Obteniendo citas desde: ${fullEndpoint}`);
      
      const headers = await this.getAuthHeaders();
      const response = await fetch(fullEndpoint, { 
        headers 
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Doctor] Error HTTP: ${response.status}, ${errorText}`);
        throw new Error(`Error obteniendo citas del paciente: ${response.status}`);
      }
      
      const appointments = await response.json();
      console.log(`[Doctor] Se encontraron ${appointments.length} citas para el paciente`);
      
      // Mostrar la primera cita para depuración
      if (appointments && appointments.length > 0) {
        console.log(`[Doctor] Ejemplo de primera cita:`, JSON.stringify(appointments[0]).substring(0, 200) + "...");
      }
      
      if (!appointments || appointments.length === 0) {
        return {
          success: true,
          appointment: null
        };
      }
      
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
      
      // Mostrar la primera cita procesada para depuración
      if (processedAppointments && processedAppointments.length > 0) {
        console.log(`[Doctor] Ejemplo de primera cita procesada:`, JSON.stringify(processedAppointments[0]).substring(0, 200) + "...");
      }
      
      // Ordenar por fecha (más reciente primero)
      processedAppointments.sort((a: Appointment, b: Appointment) => {
        // Primero comparamos por fecha
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        
        if (dateA > dateB) return -1;
        if (dateA < dateB) return 1;
        
        // Si las fechas son iguales, comparamos por hora
        const timeA = a.time.split(':');
        const timeB = b.time.split(':');
        
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