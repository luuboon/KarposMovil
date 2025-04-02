import { Redirect, useRootNavigationState, useSegments, useRouter } from 'expo-router';
import { useEffect, useState, createContext, useContext } from 'react';

// Crear un contexto para la autenticación
interface AuthContextType {
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
});

// Hook personalizado para usar el contexto de autenticación
export const useAuth = () => useContext(AuthContext);

// Proveedor de autenticación
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  // Función para iniciar sesión
  const login = () => {
    console.log("Iniciando sesión...");
    setIsAuthenticated(true);
  };

  // Función para cerrar sesión
  const logout = () => {
    console.log("Cerrando sesión...");
    setIsAuthenticated(false);
    router.replace('/auth/login');
  };

  useEffect(() => {
    // Simular la verificación de autenticación
    const checkAuth = async () => {
      // En una app real, aquí verificarías si hay un token válido
      // Por ahora, simplemente simulamos que no hay usuario autenticado
      setIsAuthenticated(false);
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  useEffect(() => {
    if (!navigationState?.key || isLoading) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!isAuthenticated && !inAuthGroup) {
      // Si el usuario no está autenticado y no está en el grupo de autenticación,
      // redirigir a la pantalla de inicio de sesión
      router.replace('/auth/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Si el usuario está autenticado y está en el grupo de autenticación,
      // redirigir a la pantalla principal
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments, navigationState?.key, isLoading]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Componente de guardia de autenticación
export default function AuthGuard() {
  return null;
} 