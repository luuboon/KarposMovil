import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { AuthResponse, Appointment, Patient, Doctor, MedicalRecord } from '../types/api';
import { API_CONFIG } from './config';

// Usamos la URL base de la configuración
const API_URL = API_CONFIG.BASE_URL;

async function getTokens() {
  const accessToken = await SecureStore.getItemAsync('accessToken');
  const refreshToken = await SecureStore.getItemAsync('refreshToken');
  return { accessToken, refreshToken };
}

async function setTokens(tokens: AuthResponse) {
  await SecureStore.setItemAsync('accessToken', tokens.accessToken);
  await SecureStore.setItemAsync('refreshToken', tokens.refreshToken);
}

async function clearTokens() {
  await SecureStore.deleteItemAsync('accessToken');
  await SecureStore.deleteItemAsync('refreshToken');
}

async function refreshTokens(refreshToken: string): Promise<AuthResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${refreshToken}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error('Error al refrescar el token');
    }

    const tokens = await response.json();
    await setTokens(tokens);
    return tokens;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const { accessToken, refreshToken } = await getTokens();
  
  // Aseguramos que siempre tengamos los headers correctos
  const headers = {
    'Content-Type': 'application/json',
    ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
    ...options.headers,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

  try {
    console.log(`Intentando conectar a: ${API_URL}${endpoint}`);
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // Si el token expiró y tenemos un refresh token, intentamos renovar
    if (response.status === 401 && refreshToken) {
      try {
        const newTokens = await refreshTokens(refreshToken);
        // Reintentamos la petición con el nuevo token
        const retryResponse = await fetch(`${API_URL}${endpoint}`, {
          ...options,
          headers: {
            ...headers,
            'Authorization': `Bearer ${newTokens.accessToken}`,
          },
          signal: controller.signal
        });

        if (!retryResponse.ok) {
          throw new Error('Error en la petición después de refrescar el token');
        }

        return retryResponse.json();
      } catch (error) {
        await clearTokens();
        throw new Error('Sesión expirada');
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
    }

    return response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      console.error(`La petición a ${endpoint} ha excedido el tiempo límite de espera`);
      throw new Error('Tiempo de espera agotado. Verifica tu conexión a internet.');
    }

    console.error('Error detallado en la petición:', {
      endpoint,
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack
    });

    if (error.message.includes('Network request failed')) {
      throw new Error('No se pudo conectar al servidor. Verifica que el servidor esté en funcionamiento y que estés conectado a la red correcta.');
    }

    throw error;
  }
} 