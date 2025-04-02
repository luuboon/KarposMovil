import { API_CONFIG } from './config';
import * as SecureStore from 'expo-secure-store';
import { jwtDecode } from 'jwt-decode';

interface JwtPayload {
  sub: number;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

// Timeout para peticiones en milisegundos (20 segundos)
const REQUEST_TIMEOUT = 20000;

export const ApiClient = {
  /**
   * Realizar una petición HTTP a la API
   * @param endpoint Endpoint relativo (sin incluir la URL base)
   * @param options Opciones adicionales para fetch
   * @returns Promesa con la respuesta en formato JSON
   */
  async request(endpoint: string, options: RequestInit = {}) {
    try {
      // Obtener token de autenticación
      const accessToken = await SecureStore.getItemAsync('accessToken');
      
      // Opciones por defecto
      const defaultOptions: RequestInit = {
        headers: {
          'Authorization': accessToken ? `Bearer ${accessToken}` : '',
          'Content-Type': 'application/json',
        },
        ...options
      };
      
      const apiUrl = endpoint.startsWith('http') 
        ? endpoint 
        : `${API_CONFIG.BASE_URL}${endpoint}`;
      
      console.log('[API] Haciendo petición a:', apiUrl);
      
      // Verificar si hay autorización
      if (accessToken) {
        console.log('[API] Con token de autorización presente');
      } else {
        console.log('[API] Sin token de autorización');
      }
      
      // Usar el timeout configurado en API_CONFIG
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), API_CONFIG.TIMEOUT);
      
      const response = await fetch(apiUrl, {
        ...defaultOptions,
        signal: abortController.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[API] Error en la respuesta (${response.status}):`, errorText);
        
        // Si es un error 401, intentar refrescar el token automáticamente
        if (response.status === 401 && !options.headers?.['refresh-attempt']) {
          console.log('[API] Intentando refrescar el token automáticamente...');
          const tokenRefreshed = await this.refreshTokens();
          
          if (tokenRefreshed) {
            console.log('[API] Token refrescado exitosamente, reintentando petición original');
            // Modificar las opciones para indicar que es un reintento después de refrescar el token
            const retryOptions = {
              ...options,
              headers: {
                ...options.headers,
                'refresh-attempt': 'true'
              }
            };
            // Reintentar la petición original con el nuevo token
            return this.request(endpoint, retryOptions);
          }
        }
        
        throw {
          status: response.status,
          message: errorText,
          endpoint
        };
      }
      
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const jsonResponse = await response.json();
          console.log(`[API] Respuesta JSON exitosa de ${endpoint}`);
          return jsonResponse;
        } else {
          const text = await response.text();
          try {
            // Intentar parsear como JSON incluso si el Content-Type no es correcto
            const jsonData = JSON.parse(text);
            console.log(`[API] Respuesta parseada como JSON (aunque no tenía el Content-Type correcto) de ${endpoint}`);
            return jsonData;
          } catch (e) {
            // Si no es JSON, retornar el texto
            console.log(`[API] Respuesta de texto exitosa de ${endpoint}`);
            return text;
          }
        }
      } catch (error) {
        console.error('[API] Error al procesar la respuesta:', error);
        throw error;
      }
    } catch (error) {
      console.error('[API] Error detallado en la petición:', JSON.stringify({
        endpoint,
        errorName: error.name,
        errorMessage: error.message,
        stack: error.stack
      }));
      throw error;
    }
  },
  
  /**
   * Obtener ID del usuario autenticado
   * @returns ID del usuario o null si no hay sesión
   */
  async getUserId(): Promise<number | null> {
    try {
      const accessToken = await SecureStore.getItemAsync('accessToken');
      if (!accessToken) {
        console.log('[AUTH] No hay token de acceso almacenado');
        return null;
      }
      
      const decoded = jwtDecode<JwtPayload>(accessToken);
      
      const userId = decoded.sub;
      console.log('[AUTH] userId obtenido del token:', userId);
      console.log('[AUTH] role obtenido del token:', decoded.role);
      
      // Verificar la validez del token
      const currentTime = Date.now() / 1000;
      if (decoded.exp < currentTime) {
        console.log('[AUTH] El token ha expirado, intentando refrescar...');
        const tokenRefreshed = await this.refreshTokens();
        
        if (tokenRefreshed) {
          // Si el token se refrescó correctamente, intentar obtener el ID de nuevo
          return this.getUserId();
        } else {
          console.log('[AUTH] No se pudo refrescar el token expirado');
          return null;
        }
      }
      
      return userId;
    } catch (error) {
      console.error('[AUTH] Error al obtener userId:', error);
      return null;
    }
  },

  /**
   * Obtener el rol del usuario autenticado
   * @returns Rol del usuario o null si no hay sesión
   */
  async getUserRole(): Promise<string | null> {
    try {
      const accessToken = await SecureStore.getItemAsync('accessToken');
      if (!accessToken) return null;
      
      const decoded = jwtDecode<JwtPayload>(accessToken);
      return decoded.role;
    } catch (error) {
      console.error('[AUTH] Error al obtener rol del usuario:', error);
      return null;
    }
  },

  // Funciones de manejo de tokens
  async getTokens() {
    const accessToken = await SecureStore.getItemAsync('accessToken');
    const refreshToken = await SecureStore.getItemAsync('refreshToken');
    return { accessToken, refreshToken };
  },

  async setTokens(accessToken: string, refreshToken: string) {
    await SecureStore.setItemAsync('accessToken', accessToken);
    await SecureStore.setItemAsync('refreshToken', refreshToken);
  },

  async clearTokens() {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
  },

  async refreshTokens() {
    const { refreshToken } = await this.getTokens();
    if (!refreshToken) {
      console.log('[AUTH] No hay refreshToken para refrescar');
      return false;
    }

    try {
      console.log('[AUTH] Intentando refrescar token con refreshToken');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
      
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.REFRESH}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error('[AUTH] Error al refrescar token:', response.status, response.statusText);
        
        // Si el error es de token inválido o expirado, limpiar tokens
        if (response.status === 401) {
          console.log('[AUTH] El refreshToken es inválido o expiró, limpiando tokens...');
          await this.clearTokens();
        }
        
        return false;
      }

      const data = await response.json();
      console.log('[AUTH] Token refrescado exitosamente');
      await this.setTokens(data.accessToken, data.refreshToken);
      return true;
    } catch (error) {
      console.error('[AUTH] Error refreshing tokens:', error);
      await this.clearTokens();
      return false;
    }
  }
}; 