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
  login: (credentials: AuthServiceLoginDTO) => Promise<void>;
  logout: () => Promise<void>;
  register: (userData: RegisterDTO) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  userRole: null,
  userId: null,
  userEmail: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  register: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

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

  const login = async (credentials: AuthServiceLoginDTO) => {
    try {
      const loginData: AuthServiceLoginDTO = {
        email: credentials.email,
        password: credentials.password
      };
      
      console.log('AuthContext: Intentando login con:', loginData);
      
      const authData = await AuthService.login(loginData);
      
      await SecureStore.setItemAsync('accessToken', authData.accessToken);
      await SecureStore.setItemAsync('refreshToken', authData.refreshToken);
      
      const decoded = jwtDecode<JwtPayload>(authData.accessToken);
      
      // Código de depuración para identificar el problema de roles
      console.log('=== Información del token decodificado ===');
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
      
      console.log('Login exitoso, rol asignado:', role);
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
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
      await AuthService.logout();
    } catch (error) {
      console.error('Error en logout (API):', error);
    }
    
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    
    setIsAuthenticated(false);
    setUserRole(null);
    setUserId(null);
    setUserEmail(null);
    
    router.replace('/auth/login');
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 