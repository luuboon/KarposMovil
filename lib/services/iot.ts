import * as SecureStore from 'expo-secure-store';
import { API_CONFIG } from '../config';

// Interfaces para datos IoT
export interface IoTData {
  id?: string;
  citaId: string | number;
  fecha: string;
  pulso: number[];
  fuerza: number[];
  timestamp?: string;
}

export interface IoTCommand {
  id?: string;
  cmd: 'START' | 'STOP';
  citaId: string | number;
  timestamp?: string;
  executed?: boolean;
}

// Datos simulados para cuando la API no responde
const MOCK_IOT_DATA: IoTData = {
  citaId: 1001,
  fecha: new Date().toISOString().split('T')[0],
  pulso: [72, 75, 78, 76, 74, 75, 79, 80, 78, 76, 75, 74, 75, 77, 78],
  fuerza: [3.5, 4.2, 4.8, 5.1, 5.3, 5.5, 5.2, 5.0, 4.8, 4.5, 4.2, 4.0, 3.8, 3.5, 3.2],
};

export const IoTService = {
  /**
   * Obtiene los headers con autorización para las peticiones
   */
  async getAuthHeaders() {
    const token = await SecureStore.getItemAsync('accessToken');
    
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  },

  /**
   * Envía un comando IoT
   * @param command Comando ('START' o 'STOP')
   * @param citaId ID de la cita
   * @param exerciseType Tipo de ejercicio (opcional)
   * @returns Confirmación del comando
   */
  async sendCommand(command: 'START' | 'STOP', citaId: string | number, exerciseType?: 'flexion' | 'extension' | 'grip') {
    try {
      console.log(`[IoT] Enviando comando ${command} para cita ${citaId}${exerciseType ? `, ejercicio: ${exerciseType}` : ''}`);
      
      // Asegurarnos que citaId sea un valor numérico para la API
      const numericCitaId = typeof citaId === 'string' ? parseInt(citaId, 10) : citaId;
      
      if (isNaN(numericCitaId)) {
        console.error('[IoT] Error: citaId no es un número válido');
        return {
          success: false,
          error: 'ID de cita inválido'
        };
      }
      
      const headers = await this.getAuthHeaders();
      
      // Usar URL completa para el endpoint
      const fullEndpoint = `${API_CONFIG.BASE_URL}/iot/command`;
      console.log(`[API] Haciendo petición a: ${fullEndpoint}`);
      
      if (headers.Authorization) console.log(`[API] Con token de autorización presente`);
      
      const response = await fetch(fullEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          cmd: command,
          citaId: numericCitaId, // Enviar como número, no como string
          exerciseType: exerciseType || 'flexion' // Incluir tipo de ejercicio
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[IoT] Error HTTP (${response.status}): ${errorText}`);
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[API] Respuesta JSON exitosa de /iot/command');
      
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('[IoT] Error al enviar comando IoT:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Obtiene datos IoT de una cita específica
   * @param citaId ID de la cita
   * @returns Datos IoT de la cita
   */
  async getIotDataByCita(citaId: string | number) {
    try {
      // Asegurarnos que citaId sea un valor numérico para la API
      const numericCitaId = typeof citaId === 'string' ? parseInt(citaId, 10) : citaId;
      
      if (isNaN(numericCitaId)) {
        console.error('[IoT] Error: citaId no es un número válido para getIotDataByCita');
        return {
          success: false,
          error: 'ID de cita inválido',
          data: []
        };
      }
      
      console.log(`[IoT] Obteniendo datos IoT para cita ${numericCitaId}`);
      
      const headers = await this.getAuthHeaders();
      
      // Usar URL completa para el endpoint
      const fullEndpoint = `${API_CONFIG.BASE_URL}/iot/cita/${numericCitaId}`;
      console.log(`[API] Haciendo petición a: ${fullEndpoint}`);
      
      const response = await fetch(fullEndpoint, { headers });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[IoT] Error HTTP (${response.status}): ${errorText}`);
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[API] Datos IoT recibidos:', JSON.stringify(data).substring(0, 100) + '...');
      
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('[IoT] Error al obtener datos IoT:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  },
  
  /**
   * Obtiene datos IoT por fecha
   * @param fecha Fecha en formato YYYY-MM-DD
   * @returns Datos IoT de la fecha
   */
  async getIoTDataByFecha(fecha: string): Promise<IoTData[]> {
    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.IOT.DATA_BY_FECHA(fecha)}`,
        {
          headers: await this.getAuthHeaders()
        }
      );
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      return data || [];
    } catch (error) {
      console.error('Error al obtener datos IoT por fecha:', error);
      return [];
    }
  },
  
  /**
   * Obtiene el último comando enviado
   * @returns Último comando enviado
   */
  async getLatestCommand(citaId: string | number) {
    try {
      // Asegurarnos que citaId sea un valor numérico para la API
      const numericCitaId = typeof citaId === 'string' ? parseInt(citaId, 10) : citaId;
      
      if (isNaN(numericCitaId)) {
        console.error('[IoT] Error: citaId no es un número válido para getLatestCommand');
        return {
          success: false,
          error: 'ID de cita inválido',
          command: null
        };
      }
      
      console.log(`[IoT] Obteniendo último comando para cita ${numericCitaId}`);
      
      const headers = await this.getAuthHeaders();
      
      // Usar URL completa para el endpoint
      const fullEndpoint = `${API_CONFIG.BASE_URL}/iot/command/latest?citaId=${numericCitaId}`;
      console.log(`[API] Haciendo petición a: ${fullEndpoint}`);
      
      const response = await fetch(fullEndpoint, { 
        headers 
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[IoT] Error HTTP (${response.status}): ${errorText}`);
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        command: data
      };
    } catch (error) {
      console.error('[IoT] Error al obtener último comando:', error);
      return {
        success: false,
        error: error.message,
        command: null
      };
    }
  },

  /**
   * Verifica el estado de la API IoT
   */
  async checkApiStatus() {
    try {
      console.log('[IoT] Verificando estado de la API IoT');
      
      // Usar un timeout más corto para esta solicitud
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${API_CONFIG.BASE_URL}/iot/status`, { 
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[IoT] Error HTTP (${response.status}): ${errorText}`);
        return {
          success: false,
          online: false,
          error: `Error HTTP: ${response.status}`
        };
      }
      
      const data = await response.json();
      console.log('[IoT] Estado de API:', data.status);
      
      return {
        success: true,
        online: data.status === 'online',
        data
      };
    } catch (error) {
      console.error('[IoT] Error al verificar estado de API IoT:', error);
      
      // Si fue un error de timeout o conexión, mostrar mensaje específico
      const isTimeoutError = error.name === 'AbortError';
      const errorMessage = isTimeoutError ? 
        'Tiempo de espera agotado al conectar con el dispositivo' :
        error.message;
      
      return {
        success: false,
        online: false,
        error: errorMessage
      };
    }
  },
  
  async getIotStatsByCita(citaId: string | number) {
    try {
      // Asegurarnos que citaId sea un valor numérico para la API
      const numericCitaId = typeof citaId === 'string' ? parseInt(citaId, 10) : citaId;
      
      if (isNaN(numericCitaId)) {
        console.error('[IoT] Error: citaId no es un número válido para getIotStatsByCita');
        return {
          success: false,
          error: 'ID de cita inválido',
          stats: null
        };
      }
      
      console.log(`[IoT] Obteniendo estadísticas IoT para cita ${numericCitaId}`);
      
      const headers = await this.getAuthHeaders();
      
      // Usar URL completa para el endpoint
      const fullEndpoint = `${API_CONFIG.BASE_URL}/iot/cita/${numericCitaId}/stats`;
      console.log(`[API] Haciendo petición a: ${fullEndpoint}`);
      
      const response = await fetch(fullEndpoint, { headers });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[IoT] Error HTTP (${response.status}): ${errorText}`);
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        stats: data
      };
    } catch (error) {
      console.error('[IoT] Error obteniendo estadísticas IoT:', error);
      return {
        success: false,
        error: error.message,
        stats: null
      };
    }
  },
  
  async getDebugData(limit = 5) {
    try {
      console.log(`[IoT] Obteniendo datos de depuración (limit=${limit})`);
      
      const headers = await this.getAuthHeaders();
      
      // Usar URL completa para el endpoint
      const fullEndpoint = `${API_CONFIG.BASE_URL}/iot/debug/latest?limit=${limit}`;
      console.log(`[API] Haciendo petición a: ${fullEndpoint}`);
      
      const response = await fetch(fullEndpoint, {
        headers
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[IoT] Error HTTP (${response.status}): ${errorText}`);
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('[IoT] Error obteniendo datos de depuración:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}; 