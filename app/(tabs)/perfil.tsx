import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { Text, Button, Avatar, Card, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../components/AuthContext';
import { PatientService, Patient } from '../../lib/services/patients';
import { MedicalRecordService } from '../../lib/services/medicalRecords';
import { PDFService } from '../../lib/services/pdf';
import { router } from 'expo-router';

export default function PerfilTab() {
  const { userRole, userEmail, userId, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  
  useEffect(() => {
    loadPatientData();
  }, []);
  
  const loadPatientData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Iniciando carga de datos de perfil para usuario con ID:', userId);
      
      if (!userId) {
        setError('No se pudo identificar al usuario. Por favor, inicia sesión nuevamente.');
        return;
      }
      
      // Obtener datos del paciente usando el servicio
      const data = await PatientService.getMyProfile();
      
      if (!data) {
        console.log('No se recibieron datos del perfil');
        setError('No se pudieron obtener los datos del perfil');
        return;
      }
      
      console.log('Datos del paciente obtenidos con éxito:', JSON.stringify(data));
      
      // Verificar que los datos pertenecen al usuario autenticado
      if (data.id_us && data.id_us !== userId) {
        console.error(`Error de seguridad: Los datos obtenidos (id_us=${data.id_us}) no coinciden con el usuario autenticado (userId=${userId})`);
        setError('Error de seguridad: Los datos obtenidos no corresponden al usuario autenticado');
        return;
      }
      
      setPatient(data);
    } catch (error: any) {
      console.error('Error al cargar datos del paciente:', error);
      setError(error?.message || 'No se pudieron cargar los datos del perfil');
    } finally {
      setLoading(false);
    }
  };
  
  // Función para mostrar el nombre completo
  const getFullName = () => {
    if (patient) {
      return `${patient.nombre} ${patient.apellido_p} ${patient.apellido_m}`;
    }
    return 'Mi Perfil';
  };
  
  // Función para mostrar el género en texto
  const getGenderText = (gender: string) => {
    switch (gender) {
      case 'male': return 'Masculino';
      case 'female': return 'Femenino';
      case 'other': return 'Otro';
      default: return gender;
    }
  };
  
  // Función para generar y compartir el PDF del expediente médico
  const generateMedicalRecordPDF = async () => {
    if (!patient) {
      Alert.alert('Error', 'No se puede generar el expediente sin datos del paciente');
      return;
    }
    
    try {
      setGeneratingPDF(true);
      
      // 1. Obtener el expediente médico completo
      const patientId = patient.id_pc;
      console.log(`Solicitando expediente médico para paciente ID: ${patientId}`);
      
      try {
        const completeRecord = await MedicalRecordService.getCompleteMedicalRecord(patientId);
        console.log('Expediente médico obtenido:', JSON.stringify(completeRecord));
        
        // Verificar que el expediente pertenece al paciente correcto
        if (completeRecord.patient?.id_pc !== patientId) {
          throw new Error('El expediente obtenido no corresponde al paciente autenticado');
        }
        
        // Mostrar un mensaje de diagnóstico
        console.log(`Datos obtenidos: Paciente: ${completeRecord.patient ? 'SÍ' : 'NO'}, Citas: ${completeRecord.appointments.length}`);
        
        // Verificar si hay citas para generar el expediente
        if (!completeRecord.appointments || completeRecord.appointments.length === 0) {
          Alert.alert(
            'No hay datos suficientes', 
            'No se encontraron citas registradas en la base de datos. Para generar un expediente médico, primero debes tener citas médicas registradas.\n\nPor favor, agenda una cita o contacta con soporte técnico si crees que esto es un error.'
          );
          return;
        }

        // Verificar si alguna cita tiene registro médico
        const hasAnyMedicalRecord = completeRecord.appointments.some(app => app.medicalRecord);
        
        // 2. Generar HTML para el PDF
        const htmlContent = MedicalRecordService.generateMedicalRecordHTML(completeRecord);
        
        // 3. Crear el directorio si no existe
        await PDFService.ensureDirectoryExists('Expedientes');
        
        // 4. Generar el PDF
        const fileName = `Expediente_${patient.nombre}_${patient.apellido_p}_${Date.now()}`;
        const filePath = await PDFService.generatePDF({
          html: htmlContent,
          fileName: fileName,
          directory: 'Expedientes',
        });
        
        // 5. Mostrar mensaje de éxito y compartir el PDF
        const message = hasAnyMedicalRecord 
          ? '¿Deseas compartir el expediente médico?'
          : 'El expediente ha sido generado, pero no contiene registros médicos porque no hay ninguno disponible en la base de datos de Turso. Te recomendamos contactar con el administrador del sistema.';
          
        Alert.alert(
          'Expediente generado',
          message,
          [
            {
              text: 'Cancelar',
              style: 'cancel'
            },
            {
              text: 'Compartir',
              onPress: () => PDFService.sharePDF(filePath, 'Expediente Médico')
            }
          ]
        );
      } catch (error: any) {
        // Manejar el error específicamente
        console.error('Error detallado al generar expediente:', error);
        
        if (error.message && (
            error.message.includes('No se encontraron datos') || 
            error.message.includes('No hay datos del paciente') ||
            error.message.includes('No se encontró información del paciente')
        )) {
          Alert.alert(
            'Base de datos sin información',
            'No se encontraron datos reales para generar el expediente médico. La base de datos de Turso no contiene información médica para este paciente.\n\nPor favor, contacta con el administrador del sistema para verificar que la base de datos esté configurada correctamente.'
          );
        } else {
          Alert.alert('Error', `No se pudo generar el expediente médico: ${error.message}\n\nEsto puede deberse a que la base de datos no contiene información real o a un problema de conexión.`);
        }
      }
    } catch (error: any) {
      console.error('Error al generar expediente en PDF:', error);
      Alert.alert('Error', error?.message || 'No se pudo generar el expediente médico. Inténtalo más tarde.');
    } finally {
      setGeneratingPDF(false);
    }
  };
  
  // Función para manejar el cierre de sesión
  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/auth/login'); // Redireccionar a la pantalla de inicio de sesión
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      Alert.alert('Error', 'No se pudo cerrar la sesión. Intente nuevamente.');
    }
  };
  
  console.log('Renderizando perfil. Estado: loading=', loading, 'error=', error, 'patient=', patient ? 'tiene datos' : 'sin datos');
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2E7D32" />
            <Text>Cargando perfil...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Button 
              mode="contained" 
              onPress={loadPatientData}
              buttonColor="#2E7D32"
            >
              Reintentar
            </Button>
          </View>
        ) : !patient ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>No se encontraron datos del paciente</Text>
            <Button 
              mode="contained" 
              onPress={loadPatientData}
              buttonColor="#2E7D32"
            >
              Reintentar
            </Button>
          </View>
        ) : (
          <>
            <View style={styles.header}>
              <Avatar.Text 
                size={80} 
                label={patient.nombre.substring(0, 1) + patient.apellido_p.substring(0, 1)} 
                style={styles.avatar}
              />
              <Text variant="headlineMedium" style={styles.title}>
                {getFullName()}
              </Text>
              <Text variant="bodyMedium" style={styles.subtitle}>
                {userEmail}
              </Text>
              <Text variant="bodySmall" style={styles.roleBadge}>
                {userRole === 'doctor' ? 'Doctor' : 'Paciente'}
              </Text>
            </View>
            
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Información del paciente
                </Text>
                <Divider style={styles.divider} />
                
                <View style={styles.infoRow}>
                  <Text variant="bodyMedium" style={styles.infoLabel}>ID:</Text>
                  <Text variant="bodyMedium">{patient.id_pc}</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text variant="bodyMedium" style={styles.infoLabel}>Email:</Text>
                  <Text variant="bodyMedium">{userEmail}</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text variant="bodyMedium" style={styles.infoLabel}>Edad:</Text>
                  <Text variant="bodyMedium">{patient.age} años</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text variant="bodyMedium" style={styles.infoLabel}>Peso:</Text>
                  <Text variant="bodyMedium">{patient.weight} kg</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text variant="bodyMedium" style={styles.infoLabel}>Altura:</Text>
                  <Text variant="bodyMedium">{patient.height} cm</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text variant="bodyMedium" style={styles.infoLabel}>Género:</Text>
                  <Text variant="bodyMedium">{getGenderText(patient.gender)}</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text variant="bodyMedium" style={styles.infoLabel}>Tipo de sangre:</Text>
                  <Text variant="bodyMedium">{patient.blood_type}</Text>
                </View>
              </Card.Content>
            </Card>
            
            {userRole === 'patient' && (
              <Button 
                mode="contained" 
                onPress={generateMedicalRecordPDF}
                style={styles.pdfButton}
                buttonColor="#FF9F1C"
                icon="file-document-outline"
                loading={generatingPDF}
                disabled={generatingPDF}
              >
                Exportar Expediente Médico
              </Button>
            )}
            
            <Button 
              mode="contained" 
              onPress={handleLogout}
              style={styles.logoutButton}
              buttonColor="#F44336"
              icon="logout"
            >
              Cerrar sesión
            </Button>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 50,
    minHeight: 300,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 50,
    minHeight: 300,
  },
  errorText: {
    color: '#d32f2f',
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 16,
  },
  header: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  avatar: {
    marginBottom: 16,
    backgroundColor: '#2E7D32',
  },
  title: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#757575',
    marginTop: 4,
  },
  roleBadge: {
    marginTop: 8,
    backgroundColor: '#E8F5E9',
    color: '#2E7D32',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  card: {
    margin: 16,
    elevation: 2,
  },
  sectionTitle: {
    color: '#2E7D32',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  divider: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  infoLabel: {
    width: 100,
    fontWeight: 'bold',
    color: '#616161',
  },
  pdfButton: {
    margin: 16,
    marginBottom: 8,
  },
  logoutButton: {
    margin: 16,
    marginTop: 8,
  },
}); 