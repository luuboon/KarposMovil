import { Stack, useRouter, useSegments } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { useColorScheme } from '@/hooks/useColorScheme';
import Colors from '@/constants/Colors';
import { AuthProvider, useAuth } from '../components/AuthContext';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { Alert } from 'react-native';

// Mantener la pantalla de splash visible mientras inicializamos
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { userRole, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Ocultar la pantalla de splash cuando la app esté lista
    SplashScreen.hideAsync();
  }, []);

  // Protección de rutas
  useEffect(() => {
    if (loading) return; // No hacer nada mientras está cargando
    
    // Verificar si el usuario está intentando acceder a una ruta protegida
    if (userRole !== 'doctor') {
      // Obtener el primer segmento de la ruta (/dispositivos, /reportes, etc.)
      const segment = segments[0];
      
      // Lista de rutas que solo pueden acceder los doctores
      const doctorOnlyRoutes = ['dispositivos', 'reportes'];
      
      // Si el usuario intenta acceder a una ruta solo para doctores
      if (doctorOnlyRoutes.includes(segment)) {
        console.log('Usuario paciente intentando acceder a ruta protegida:', segment);
        
        // Mostrar alerta y redirigir
        Alert.alert(
          'Acceso restringido',
          'Esta sección solo está disponible para médicos',
          [{ text: 'Entendido', onPress: () => router.replace('/(tabs)') }]
        );
      }
    }
  }, [segments, userRole, loading]);

  console.log('RootLayoutNav - Renderizando con rol:', userRole);

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors[colorScheme ?? 'light'].background,
        },
        headerTintColor: Colors[colorScheme ?? 'light'].tint,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerShown: false,
      }}
    >
      {/* Rutas principales */}
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      
      {/* Rutas de autenticación */}
      <Stack.Screen name="auth/login" />
      <Stack.Screen name="auth/register" />
      
      {/* Rutas de citas */}
      <Stack.Screen name="citas/index" />
      <Stack.Screen name="citas/agendar" />
      <Stack.Screen name="citas/historial" />
      
      {/* Rutas de perfil */}
      <Stack.Screen name="perfil/index" />
      <Stack.Screen name="perfil/expediente" />
      <Stack.Screen name="perfil/facturas" />
      
      {/* Rutas para roles específicos - solo se declaran si el usuario es doctor */}
      {userRole === 'doctor' && (
        <>
          <Stack.Screen name="dispositivos/index" />
          <Stack.Screen name="reportes/index" />
        </>
      )}
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <PaperProvider>
        <RootLayoutNav />
      </PaperProvider>
    </AuthProvider>
  );
}
