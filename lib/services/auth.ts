import * as SecureStore from 'expo-secure-store';
import { API_CONFIG } from '../config';
import { ApiClient } from '../api-client';
import { TokenManager } from '../token-manager';
import { Role } from '../../types/api';
import { jwtDecode } from 'jwt-decode';

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  role: string;
  user: {
    id: number;
    email: string;
  }
}

export const AuthService = {
  /**
   * Inicia sesión con las credenciales proporcionadas
   * @param email Correo electrónico del usuario
   * @param password Contraseña del usuario
   * @returns Resultado de la operación
   */
  async login(email: string, password: string) {
    try {
      console.log('[Auth] Intentando iniciar sesión', { email });
      
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      console.log('[Auth] Respuesta de login:', JSON.stringify(data));
      
      if (!response.ok) {
        console.error('[Auth] Error al iniciar sesión:', data);
        return {
          success: false,
          error: data.message || 'Error al iniciar sesión'
        };
      }
      
      console.log('[Auth] Sesión iniciada con éxito');
      
      // Guardar tokens
      await SecureStore.setItemAsync('accessToken', data.accessToken);
      await SecureStore.setItemAsync('refreshToken', data.refreshToken);
      
      // Extraer información del usuario del token
      try {
        const decoded = jwtDecode(data.accessToken);
        console.log('[Auth] Token decodificado:', JSON.stringify(decoded));
        
        // Guardar información del usuario desde el token
        if (decoded && decoded.sub) {
          await SecureStore.setItemAsync('userId', String(decoded.sub));
          
          // El rol puede estar en decoded.role
          if (decoded.role) {
            await SecureStore.setItemAsync('userRole', String(decoded.role));
          }
          
          // El email puede estar en decoded.email
          if (decoded.email) {
            await SecureStore.setItemAsync('userEmail', String(decoded.email));
          }
          
          return {
            success: true,
            user: {
              id: decoded.sub,
              email: decoded.email || email,
              role: decoded.role || 'patient'
            }
          };
        }
      } catch (decodeError) {
        console.error('[Auth] Error al decodificar token:', decodeError);
      }
      
      // Si no podemos extraer la info del token, intentar usar la respuesta directa
      if (data.user) {
        // La API devuelve user directamente
        await SecureStore.setItemAsync('userId', String(data.user.id));
        await SecureStore.setItemAsync('userRole', String(data.user.role));
        await SecureStore.setItemAsync('userEmail', String(data.user.email || email));
        
        return {
          success: true,
          user: data.user
        };
      }
      
      // Si no hay información de usuario en el token ni en la respuesta, fallar
      console.error('[Auth] No se pudo obtener información del usuario');
      return {
        success: false,
        error: 'No se pudo obtener información del usuario'
      };
    } catch (error) {
      console.error('[Auth] Error inesperado en login:', error);
      return {
        success: false,
        error: 'Error de conexión'
      };
    }
  },
  
  /**
   * Cierra la sesión actual
   * @returns Resultado de la operación
   */
  async logout() {
    try {
      // Intentar llamar al endpoint de logout (pero no es crítico si falla)
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      
      if (refreshToken) {
        try {
          await fetch(`${API_CONFIG.BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken }),
          });
        } catch (error) {
          console.warn('[Auth] Error al llamar logout en servidor:', error);
        }
      }
      
      // Eliminar tokens almacenados localmente (esto es lo realmente importante)
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      await SecureStore.deleteItemAsync('userId');
      await SecureStore.deleteItemAsync('userRole');
      await SecureStore.deleteItemAsync('userEmail');
      
      return { success: true };
    } catch (error) {
      console.error('[Auth] Error en logout:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Refresca el token de acceso usando el token de refresco
   * @returns Nuevo token de acceso
   */
  async refreshToken() {
    try {
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      
      if (!refreshToken) {
        throw new Error('No hay token de refresco disponible');
      }
      
      console.log('[Auth] Intentando refrescar token');
      
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('[Auth] Error al refrescar token:', data);
        // Si el refresh token es inválido, forzar logout
        if (response.status === 401) {
          console.log('[Auth] Token de refresco inválido, forzando logout');
          await this.logout();
        }
        
        throw new Error(data.message || 'Error al refrescar token');
      }
      
      console.log('[Auth] Token refrescado con éxito');
      
      // Guardar nuevo token de acceso
      await SecureStore.setItemAsync('accessToken', data.accessToken);
      
      // Si también devuelve un nuevo refresh token, guardarlo
      if (data.refreshToken) {
        await SecureStore.setItemAsync('refreshToken', data.refreshToken);
      }
      
      return {
        success: true,
        accessToken: data.accessToken
      };
    } catch (error) {
      console.error('[Auth] Error en refreshToken:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Obtiene el token de acceso actual, intentando refrescarlo si es necesario
   * @returns Token de acceso
   */
  async getAccessToken() {
    try {
      const accessToken = await SecureStore.getItemAsync('accessToken');
      
      if (!accessToken) {
        console.log('[Auth] No hay token de acceso, intentando refresh');
        const refreshResult = await this.refreshToken();
        
        if (refreshResult.success) {
          return refreshResult.accessToken;
        }
        
        throw new Error('No se pudo obtener un token de acceso');
      }
      
      return accessToken;
    } catch (error) {
      console.error('[Auth] Error en getAccessToken:', error);
      throw error;
    }
  },
  
  /**
   * Obtiene los encabezados de autorización para las peticiones
   * @returns Encabezados HTTP con el token de acceso
   */
  async getAuthHeaders() {
    try {
      const accessToken = await this.getAccessToken();
      
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      };
    } catch (error) {
      console.error('[Auth] Error al obtener headers de autenticación:', error);
      return {
        'Content-Type': 'application/json'
      };
    }
  },
  
  /**
   * Obtiene el ID del usuario actual
   * @returns ID del usuario
   */
  async getUserId() {
    const userId = await SecureStore.getItemAsync('userId');
    return userId ? parseInt(userId, 10) : null;
  },

  async loginWithGoogle(token: string): Promise<AuthResponse> {
    try {
      console.log('Iniciando sesión con Google');
      return await ApiClient.request(API_CONFIG.ENDPOINTS.AUTH.GOOGLE, {
        method: 'POST',
        body: JSON.stringify({ token })
      });
    } catch (error) {
      console.error('Error en AuthService.loginWithGoogle:', error);
      throw error;
    }
  }
}; 