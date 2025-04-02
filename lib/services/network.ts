import { API_CONFIG } from '../config';

export const NetworkService = {
  async testApiConnection(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('Verificando conexión al servidor API...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos de timeout
      
      // En lugar de usar HEAD (que no siempre es aceptado), verificamos si el servidor responde
      // usando una solicitud simple que solo comprueba que la URL base sea accesible
      const response = await fetch(`${API_CONFIG.BASE_URL}`, {
        method: 'GET',
        signal: controller.signal,
        // No incluimos headers porque solo queremos verificar la conectividad básica
      });
      
      clearTimeout(timeoutId);
      
      // Cualquier respuesta (incluso 404) indica que el servidor está en línea
      // y respondiendo a solicitudes, lo que es suficiente para verificar conectividad
      return { 
        success: true, 
        message: 'Conexión exitosa al servidor API' 
      };
    } catch (error: any) {
      // Los errores de red (como el servidor no disponible) se capturarán aquí
      if (error.name === 'AbortError') {
        return { 
          success: false, 
          message: 'Tiempo de espera agotado al conectar con el servidor API' 
        };
      }
      
      return { 
        success: false, 
        message: `Error de conexión: ${error.message || 'Error desconocido'}` 
      };
    }
  },
  
  // Puedes usarlo para verificar la disponibilidad de internet en general
  async hasInternetConnection(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('https://www.google.com', {
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}; 