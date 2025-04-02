import { API_CONFIG } from '../config';
import { ApiClient } from '../api-client';
import { TokenManager } from '../token-manager';
import { Role } from '../../types/api';

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
  async login(credentials: LoginDTO): Promise<AuthResponse> {
    try {
      console.log('Iniciando sesión con:', credentials);
      
      // Asegurarnos de que credentials es un objeto plano y no una cadena JSON
      const credentialsObj = typeof credentials === 'string' 
        ? JSON.parse(credentials) 
        : credentials;
      
      // Hacemos log del email para diagnóstico
      console.log('Email para login:', credentialsObj.email);
      
      const response = await ApiClient.request(API_CONFIG.ENDPOINTS.AUTH.LOGIN, {
        method: 'POST',
        body: JSON.stringify(credentialsObj)
      });
      
      if (response.accessToken && response.refreshToken) {
        await TokenManager.saveTokens(
          response.accessToken.toString(),
          response.refreshToken.toString()
        );
      }
      
      return response;
    } catch (error) {
      console.error('Error en AuthService.login:', error);
      throw error;
    }
  },

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      console.log('Refrescando token...');
      return await ApiClient.request(API_CONFIG.ENDPOINTS.AUTH.REFRESH, {
        method: 'POST',
        body: JSON.stringify({ refreshToken })
      });
    } catch (error) {
      console.error('Error en AuthService.refreshToken:', error);
      throw error;
    }
  },

  async logout(): Promise<void> {
    try {
      // Indicar que no esperamos una respuesta JSON
      await ApiClient.request(API_CONFIG.ENDPOINTS.AUTH.LOGOUT, {
        method: 'POST'
      }, false);
      
      console.log('Sesión cerrada correctamente');
      // Limpiar tokens locales incluso si la API falla
      await TokenManager.clearTokens();
    } catch (error) {
      console.error('Error en AuthService.logout:', error);
      // Asegurarnos de limpiar tokens locales incluso si falla la petición
      await TokenManager.clearTokens();
    }
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