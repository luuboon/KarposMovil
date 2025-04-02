import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { TextInput, Button, Text, RadioButton, SegmentedButtons } from 'react-native-paper';
import { useAuth } from '../../components/AuthContext';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Role, RegisterDTO } from '../../types/api';

export default function Register() {
  const [formData, setFormData] = useState<Partial<RegisterDTO>>({
    email: '',
    password: '',
    role: 'patient',
    nombre: '',
    apellido_p: '',
    apellido_m: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const { register } = useAuth();
  const router = useRouter();

  const updateFormData = (field: keyof RegisterDTO, value: any) => {
    // Para campos numéricos, validar que no sean NaN o Infinity
    if (field === 'age' || field === 'weight' || field === 'height') {
      // Convertir string a número
      const numValue = typeof value === 'string' ? Number(value) : value;
      
      // Si no es un número válido, no actualizar el campo
      if (!Number.isFinite(numValue)) {
        console.error(`Valor inválido para ${field}:`, value);
        return;
      }
      
      // Si es un número válido pero negativo o cero, establecer un valor mínimo
      if (numValue <= 0) {
        const minValues = { age: 1, weight: 1, height: 1 };
        const minValue = minValues[field] || 1;
        setFormData(prev => ({ ...prev, [field]: minValue }));
        return;
      }
    }
    
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRegister = async () => {
    // Validación básica
    if (!formData.email || !formData.password || !confirmPassword || !formData.nombre || 
        !formData.apellido_p || !formData.apellido_m) {
      Alert.alert('Error', 'Todos los campos marcados con * son obligatorios');
      return;
    }

    if (formData.password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    // Validación específica según el rol
    if (formData.role === 'patient') {
      if (!formData.age || !formData.weight || !formData.height || !formData.gender || !formData.blood_type) {
        Alert.alert('Error', 'Todos los campos de paciente son obligatorios');
        return;
      }
    } else if (formData.role === 'doctor') {
      if (!formData.prof_id) {
        Alert.alert('Error', 'La cédula profesional es obligatoria');
        return;
      }
    }

    try {
      setLoading(true);
      console.log('Registro: Enviando datos con rol:', formData.role);
      console.log('Registro: Información completa:', JSON.stringify(formData));
      await register(formData as RegisterDTO);
      Alert.alert('Éxito', 'Registro exitoso', [
        { text: 'OK', onPress: () => router.replace('/auth/login') }
      ]);
    } catch (error) {
      console.error('Error en registro:', error);
      Alert.alert('Error', 'No se pudo completar el registro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Crear Cuenta</Text>
          <Text style={styles.subtitle}>Completa tus datos para registrarte</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Información de la cuenta</Text>
          
          <TextInput
            label="Correo electrónico *"
            value={formData.email}
            onChangeText={(value) => updateFormData('email', value)}
            mode="outlined"
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            label="Contraseña *"
            value={formData.password}
            onChangeText={(value) => updateFormData('password', value)}
            mode="outlined"
            style={styles.input}
            secureTextEntry={secureTextEntry}
            right={
              <TextInput.Icon
                icon={secureTextEntry ? 'eye' : 'eye-off'}
                onPress={() => setSecureTextEntry(!secureTextEntry)}
              />
            }
          />

          <TextInput
            label="Confirmar Contraseña *"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            mode="outlined"
            style={styles.input}
            secureTextEntry={secureTextEntry}
          />

          <Text style={styles.sectionTitle}>Información personal</Text>
          
          <TextInput
            label="Nombre(s) *"
            value={formData.nombre}
            onChangeText={(value) => updateFormData('nombre', value)}
            mode="outlined"
            style={styles.input}
          />
          
          <TextInput
            label="Apellido Paterno *"
            value={formData.apellido_p}
            onChangeText={(value) => updateFormData('apellido_p', value)}
            mode="outlined"
            style={styles.input}
          />
          
          <TextInput
            label="Apellido Materno *"
            value={formData.apellido_m}
            onChangeText={(value) => updateFormData('apellido_m', value)}
            mode="outlined"
            style={styles.input}
          />

          <Text style={styles.roleLabel}>Tipo de usuario: *</Text>
          <RadioButton.Group 
            onValueChange={(value) => updateFormData('role', value as Role)} 
            value={formData.role || 'patient'}
          >
            <View style={styles.radioOption}>
              <RadioButton value="patient" />
              <Text>Paciente</Text>
            </View>
            <View style={styles.radioOption}>
              <RadioButton value="doctor" />
              <Text>Doctor</Text>
            </View>
          </RadioButton.Group>

          {formData.role === 'patient' && (
            <View style={styles.roleSpecificFields}>
              <Text style={styles.sectionTitle}>Información médica</Text>
              
              <TextInput
                label="Edad *"
                value={formData.age?.toString() || ''}
                onChangeText={(value) => updateFormData('age', parseInt(value) || 0)}
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
              />
              
              <TextInput
                label="Peso (kg) *"
                value={formData.weight?.toString() || ''}
                onChangeText={(value) => updateFormData('weight', parseFloat(value) || 0)}
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
              />
              
              <TextInput
                label="Altura (cm) *"
                value={formData.height?.toString() || ''}
                onChangeText={(value) => updateFormData('height', parseFloat(value) || 0)}
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
              />
              
              <Text style={styles.inputLabel}>Género: *</Text>
              <SegmentedButtons
                value={formData.gender || 'male'}
                onValueChange={(value) => updateFormData('gender', value as 'male' | 'female' | 'other')}
                buttons={[
                  { value: 'male', label: 'Masculino' },
                  { value: 'female', label: 'Femenino' },
                  { value: 'other', label: 'Otro' }
                ]}
                style={styles.segmentedButton}
              />
              
              <TextInput
                label="Tipo de sangre *"
                value={formData.blood_type || ''}
                onChangeText={(value) => updateFormData('blood_type', value)}
                mode="outlined"
                style={styles.input}
              />
            </View>
          )}

          {formData.role === 'doctor' && (
            <View style={styles.roleSpecificFields}>
              <Text style={styles.sectionTitle}>Información profesional</Text>
              
              <TextInput
                label="Cédula Profesional *"
                value={formData.prof_id || ''}
                onChangeText={(value) => updateFormData('prof_id', value)}
                mode="outlined"
                style={styles.input}
              />
            </View>
          )}

          <Button
            mode="contained"
            onPress={handleRegister}
            style={styles.button}
            loading={loading}
            disabled={loading}
          >
            Registrarse
          </Button>

          <View style={styles.loginContainer}>
            <Text>¿Ya tienes una cuenta? </Text>
            <Link href="/auth/login" asChild>
              <TouchableOpacity>
                <Text style={styles.loginText}>Iniciar Sesión</Text>
              </TouchableOpacity>
            </Link>
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
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  subtitle: {
    fontSize: 16,
    color: '#757575',
    marginTop: 5,
  },
  formContainer: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#2E7D32',
  },
  input: {
    marginBottom: 15,
  },
  roleLabel: {
    fontSize: 16,
    marginBottom: 10,
    marginTop: 10,
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 10,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  roleSpecificFields: {
    marginTop: 10,
  },
  segmentedButton: {
    marginBottom: 15,
  },
  button: {
    marginTop: 20,
    paddingVertical: 8,
    backgroundColor: '#2E7D32',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  loginText: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
}); 