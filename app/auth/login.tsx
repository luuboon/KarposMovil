import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, Alert, ScrollView } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { useAuth } from '../../components/AuthContext';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NetworkService } from '../../lib/services/network';
import { LoginDTO } from '../../lib/services/auth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  // Verificar conexión en segundo plano al cargar, sin logs innecesarios
  useEffect(() => {
    // Solo verificamos la conexión a internet general, sin logs
    NetworkService.hasInternetConnection();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor ingresa tu correo y contraseña');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Crear objeto de credenciales en el formato correcto
      const credentials: LoginDTO = {
        email: email.trim(),
        password: password
      };
      
      // Intentar login
      await login(credentials);
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('Error en login:', err);
      
      // Mensaje de error más claro basado en el tipo de error
      if (err.message && err.message.includes('tiempo')) {
        Alert.alert('Error de conexión', 'No se pudo conectar al servidor. Verifica tu conexión a internet e intenta nuevamente.');
      } else if (err.message && err.message.includes('credenciales')) {
        Alert.alert('Error', 'Credenciales incorrectas. Verifica tu email y contraseña.');
      } else {
        Alert.alert('Error', err.message || 'No se pudo iniciar sesión');
      }
    } finally {
      setLoading(false);
    }
  };

  // Solo mostrar errores si hay uno específico que no sea de conexión
  const renderErrorMessage = () => {
    if (!error || error.includes('conexión')) return null;
    
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.appName}>Karpos</Text>
          </View>

          <Text style={styles.title}>Inicio de sesión</Text>

          {renderErrorMessage()}

          <View style={styles.formContainer}>
            <TextInput
              label="Correo Electrónico"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              outlineColor="#2E7D32"
              activeOutlineColor="#2E7D32"
              left={<TextInput.Icon icon="email" color="#2E7D32" />}
            />

            <TextInput
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              style={styles.input}
              secureTextEntry={secureTextEntry}
              outlineColor="#2E7D32"
              activeOutlineColor="#2E7D32"
              left={<TextInput.Icon icon="lock" color="#2E7D32" />}
              right={
                <TextInput.Icon
                  icon={secureTextEntry ? 'eye' : 'eye-off'}
                  color="#2E7D32"
                  onPress={() => setSecureTextEntry(!secureTextEntry)}
                />
              }
            />

            <Button
              mode="contained"
              onPress={handleLogin}
              style={styles.button}
              loading={loading}
              disabled={loading}
            >
              Iniciar Sesión
            </Button>

            <View style={styles.infoContainer}>
              <Text style={styles.infoText}>
                Esta aplicación es solo para usuarios registrados. Si necesitas una cuenta, 
                contacta al administrador o registrate en la plataforma web de Karpos.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 10,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#333',
  },
  formContainer: {
    width: '100%',
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  button: {
    marginTop: 24,
    paddingVertical: 8,
    backgroundColor: '#2E7D32',
  },
  infoContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  infoText: {
    color: '#2E7D32',
    textAlign: 'center',
    fontSize: 14,
  },
  errorContainer: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#FFECEC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorText: {
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: 8,
  },
}); 