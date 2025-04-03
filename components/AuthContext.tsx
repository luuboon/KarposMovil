import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { AuthResponse, LoginDTO, RegisterDTO, Role } from '../types/api';
import { AuthService, LoginDTO as AuthServiceLoginDTO, RegisterPatientDTO } from '../lib/services/auth';
import { jwtDecode } from 'jwt-decode';
import { router } from 'expo-router';

interface JwtPayload {
  sub: number;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

interface AuthContextType {
  isAuthenticated: boolean;
  userRole: Role | null;
  userId: number | null;
  userEmail: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (userData: RegisterDTO) => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  userRole: null,
  userId: null,
  userEmail: null,
  loading: true,
  login: async () => false,
  logout: async () => {},
  register: async () => {},
  error: null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setLoading(true);
      const accessToken = await SecureStore.getItemAsync('accessToken');
      
      if (!accessToken) {
        return;
      }
      
      try {
        const decoded = jwtDecode<JwtPayload>(accessToken);
        
        const currentTime = Date.now() / 1000;
        if (decoded.exp < currentTime) {
          await logout();
          return;
        }
        
        // Código de depuración para verificar el rol al cargar la aplicación
        console.log('=== Verificación de token existente ===');
        console.log('Token sub (ID):', decoded.sub);
        console.log('Token email:', decoded.email);
        console.log('Token role (original) [TIPO]:', typeof decoded.role);
        console.log('Token role (original) [VALOR]:', JSON.stringify(decoded.role));
        console.log('Token expiración:', new Date(decoded.exp * 1000).toLocaleString());
        console.log('====================================');
        
        // Usar el rol del token directamente
        const role = decoded.role as Role;
        console.log('Rol asignado desde el token:', role);
        
        setUserRole(role);
        setUserId(decoded.sub);
        setUserEmail(decoded.email);
        setIsAuthenticated(true);
        
        console.log('Sesión restaurada, rol asignado:', role);
      } catch (error) {
        console.error('Error al decodificar token:', error);
        await logout();
      }
    } catch (error) {
      console.error('Error al verificar autenticación:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError("");
      
      console.log("[AuthContext] Iniciando sesión con:", { email });
      
      const result = await AuthService.login(email, password);
      
      if (result.success) {
        // Actualizar el estado y guardar la información del usuario
        setIsAuthenticated(true);
        setUserRole(result.user.role);
        setUserId(result.user.id);
        
        console.log("[AuthContext] Sesión iniciada exitosamente como:", result.user.role);
        return true;
      } else {
        setError(result.error || "Error de autenticación");
        console.error("[AuthContext] Error al iniciar sesión:", result.error);
        return false;
      }
    } catch (err) {
      console.error("[AuthContext] Error inesperado en login:", err);
      setError("Error al conectar con el servidor");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: RegisterDTO) => {
    try {
      console.log('AuthContext: Intentando registro con rol:', userData.role);
      console.log('AuthContext: Datos completos de registro:', JSON.stringify(userData));
      
      // Llamar al servicio de registro
      const result = await AuthService.register(userData as RegisterDTO);
      console.log('Registro exitoso:', result);
      
      return result;
    } catch (error) {
      console.error('Error en registro:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log("[AuthContext] Cerrando sesión");
      
      const result = await AuthService.logout();
      
      // Incluso si la operación falla a nivel de API, limpiamos la sesión local
      setIsAuthenticated(false);
      setUserRole(null);
      setUserId(null);
      setUserEmail(null);
      
      console.log("[AuthContext] Sesión cerrada correctamente");
    } catch (err) {
      console.error("[AuthContext] Error al cerrar sesión:", err);
      // Incluso con error, cerramos la sesión local
      setIsAuthenticated(false);
      setUserRole(null);
      setUserId(null);
      setUserEmail(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userRole,
        userId,
        userEmail,
        loading,
        login,
        logout,
        register,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 