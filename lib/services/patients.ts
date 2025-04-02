import { API_CONFIG } from '../config';
import { ApiClient } from '../api-client';

export interface Patient {
  id_pc?: number;
  id?: number;
  nombre?: string;
  name?: string;
  apellido_p?: string;
  last_name?: string;
  apellido?: string;
  apellido_m?: string;
  age?: number;
  edad?: number;
  gender?: 'male' | 'female' | 'other';
  genero?: 'male' | 'female' | 'other';
  blood_type?: string;
  tipo_sangre?: string;
  weight?: number;
  peso?: number;
  height?: number;
  altura?: number;
  created_at?: string;
  updated_at?: string;
  id_us?: number;
  progress?: number;
}

export const PatientService = {
  /**
   * Obtiene el perfil del paciente autenticado
   * @returns Información del perfil del paciente
   */
  async getMyProfile(): Promise<Patient> {
    try {
      // Obtener el ID del usuario del token JWT
      const userId = await ApiClient.getUserId();
      console.log('Cargando datos del paciente para userId:', userId);
      
      if (!userId) {
        throw new Error('No se pudo obtener el ID del usuario. Por favor, inicia sesión nuevamente.');
      }
      
      // Obtener todos los pacientes para buscar el que corresponde al usuario autenticado
      const allPatients = await ApiClient.request(`${API_CONFIG.ENDPOINTS.PATIENTS}`);
      
      if (Array.isArray(allPatients) && allPatients.length > 0) {
        // Buscar el paciente cuyo id_us coincida con el userId del token
        const myPatient = allPatients.find(p => p.id_us === userId);
        
        if (myPatient) {
          console.log(`Paciente encontrado por id_us=${userId}:`, myPatient);
          return myPatient;
        }
        
        // Si no se encuentra por id_us, intentar buscar por userId directamente
        try {
          const directPatient = await ApiClient.request(`${API_CONFIG.ENDPOINTS.PATIENTS}/${userId}`);
          
          if (Array.isArray(directPatient) && directPatient.length > 0) {
            console.log(`Paciente encontrado directamente con ID ${userId}:`, directPatient[0]);
            return directPatient[0];
          } else if (directPatient && typeof directPatient === 'object') {
            console.log(`Paciente encontrado directamente con ID ${userId}:`, directPatient);
            return directPatient;
          }
        } catch (error) {
          console.log(`No se encontró paciente con ID ${userId}, continuando búsqueda...`);
        }
        
        // Si aún no se encuentra, buscar por ID de usuario en la estructura interna de cada paciente
        for (const patient of allPatients) {
          // Algunas APIs pueden tener el ID de usuario dentro de un campo anidado
          if (patient.user && patient.user.id === userId) {
            console.log(`Paciente encontrado por patient.user.id=${userId}:`, patient);
            return patient;
          }
        }
        
        // Si aún no encuentra, lanzar error específico
        throw new Error(`No se encontró un paciente asociado al usuario con ID ${userId}`);
      }
      
      throw new Error('No se pudieron obtener los datos de pacientes');
    } catch (error) {
      console.error('Error al cargar datos del usuario:', error);
      throw error;
    }
  },

  /**
   * Obtiene un paciente por su ID
   * @param id ID del paciente
   * @returns Información del paciente
   */
  async getPatientById(id: number): Promise<Patient> {
    try {
      const response = await ApiClient.request(`${API_CONFIG.ENDPOINTS.PATIENTS}/${id}`);
      
      // La API devuelve un array para un solo paciente, verificamos y procesamos
      if (Array.isArray(response) && response.length > 0) {
        return response[0];
      } else if (response && typeof response === 'object') {
        return response as Patient;
      }
      
      throw new Error(`No se encontró el paciente con ID ${id}`);
    } catch (error) {
      console.error(`Error al cargar paciente con ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * Actualiza el perfil del paciente
   * @param data Datos a actualizar
   * @returns Perfil actualizado
   */
  async updateProfile(data: Partial<Patient>): Promise<Patient> {
    try {
      // Obtener el perfil actual primero para obtener el ID correcto del paciente
      const currentProfile = await this.getMyProfile();
      
      // Usar el ID del paciente, no el ID del usuario
      const patientId = currentProfile.id_pc;
      
      if (!patientId) {
        throw new Error('No se pudo obtener el ID del paciente');
      }
      
      // Validar campos numéricos para evitar valores Infinity o NaN
      const validatedData = { ...data };
      
      // Validar edad
      if (validatedData.age !== undefined) {
        if (!Number.isFinite(validatedData.age) || validatedData.age <= 0) {
          console.error('Valor de edad inválido:', validatedData.age);
          delete validatedData.age; // Eliminar valor inválido
        }
      }
      
      // Validar peso
      if (validatedData.weight !== undefined) {
        if (!Number.isFinite(validatedData.weight) || validatedData.weight <= 0) {
          console.error('Valor de peso inválido:', validatedData.weight);
          delete validatedData.weight; // Eliminar valor inválido
        }
      }
      
      // Validar altura
      if (validatedData.height !== undefined) {
        if (!Number.isFinite(validatedData.height) || validatedData.height <= 0) {
          console.error('Valor de altura inválido:', validatedData.height);
          delete validatedData.height; // Eliminar valor inválido
        }
      }
      
      // Validar que haya al menos un campo válido para actualizar
      if (Object.keys(validatedData).length === 0) {
        throw new Error('No hay datos válidos para actualizar');
      }
      
      return await ApiClient.request(`${API_CONFIG.ENDPOINTS.PATIENTS}/${patientId}`, {
        method: 'PUT',
        body: JSON.stringify(validatedData)
      });
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      throw error;
    }
  },

  /**
   * Obtiene todos los pacientes (solo disponible para doctores)
   * @returns Lista de pacientes
   */
  async getAllPatients(): Promise<Patient[]> {
    try {
      const response = await ApiClient.request(API_CONFIG.ENDPOINTS.PATIENTS);
      
      if (Array.isArray(response)) {
        return response;
      }
      
      return [];
    } catch (error) {
      console.error('Error al cargar todos los pacientes:', error);
      throw error;
    }
  }
}; 