import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Text, Chip, Card, Title, Paragraph, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../components/AuthContext';
import { router } from 'expo-router';
import IoTSessionControl from '../components/IoTSessionControl';
import { DoctorService } from '../../lib/services/doctors';
import { Appointment } from '../../lib/services/appointments';
import { Patient } from '../../lib/services/patients';
import { Ionicons } from '@expo/vector-icons';
import { API_CONFIG } from '../../lib/config';

export default function DispositivosScreen() {
  const { userRole, userId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [latestAppointment, setLatestAppointment] = useState<Appointment | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [exerciseType, setExerciseType] = useState<'flexion' | 'extension' | 'grip'>('flexion');

  // Cargar pacientes al iniciar
  useEffect(() => {
    if (userRole === 'doctor') {
      loadDoctorData();
    } else {
      // Si no es doctor, redirigir al home
      Alert.alert('Acceso restringido', 'Esta sección es solo para doctores.');
      router.replace('/');
    }
  }, [userRole]);

  // Función para cargar los datos del doctor y sus pacientes
  const loadDoctorData = async () => {
    try {
      setLoading(true);
      // Primero obtener el perfil del doctor para tener su ID correcto (id_dc)
      const profile = await DoctorService.getMyProfile();
      console.log(`[Dispositivos] Perfil del doctor obtenido: id_dc=${profile.id_dc}, id_us=${profile.id_us}`);
      
      // Ahora cargar los pacientes usando el id_dc correcto
      await loadPatients(profile.id_dc);
    } catch (error) {
      console.error('[Dispositivos] Error al cargar datos del doctor:', error);
      setLoading(false);
      
      // Mostrar mensaje específico según el tipo de error
      let errorMessage = 'No se pudieron cargar los datos del doctor.';
      
      if (error instanceof Error) {
        // Personalizar mensaje según el texto del error
        if (error.message.includes('No se encontró un doctor')) {
          errorMessage = 'No se encontró un doctor asociado a tu cuenta. Por favor, contacta al administrador para verificar tus permisos.';
        } else if (error.message.includes('No se pudo obtener el perfil')) {
          errorMessage = 'No se pudo obtener tu perfil de doctor. Verifica tu conexión e inténtalo de nuevo.';
        }
      }
      
      Alert.alert('Error', errorMessage);
    }
  };

  // Cuando se selecciona un paciente, buscar su última cita
  useEffect(() => {
    if (!selectedPatient) {
      console.log('[Dispositivos] No hay paciente seleccionado');
      return;
    }
    
    console.log('[Dispositivos] Procesando paciente seleccionado:', JSON.stringify(selectedPatient));
    
    // Usar el ID correcto según la estructura del objeto
    const patientId = selectedPatient.id_pc || selectedPatient.id;
    
    if (patientId) {
      console.log(`[Dispositivos] Usando ID del paciente: ${patientId}`);
      loadLatestAppointment(patientId);
    } else {
      console.error('[Dispositivos] Error: No se pudo determinar el ID del paciente', JSON.stringify(selectedPatient));
      setLatestAppointment(null);
    }
  }, [selectedPatient]);

  // Cargar todos los pacientes asignados al doctor
  const loadPatients = async (doctorId: number) => {
    try {
      console.log(`[Dispositivos] Cargando pacientes para doctor ID (id_dc): ${doctorId}`);
      const result = await DoctorService.getDoctorPatients(doctorId);
      
      if (result.success && result.patients.length > 0) {
        console.log(`[Dispositivos] Se encontraron ${result.patients.length} pacientes`);
        
        // Log completo de TODOS los pacientes
        console.log('[Dispositivos] Lista completa de pacientes (raw): ', JSON.stringify(result.patients));
        
        // Aplanar el array si está anidado
        let processedPatients = result.patients;
        if (result.patients.length === 1 && Array.isArray(result.patients[0])) {
          console.log('[Dispositivos] Detectado array anidado, aplanando estructura');
          processedPatients = result.patients[0];
        }
        
        console.log('[Dispositivos] Pacientes procesados: ', JSON.stringify(processedPatients));
        
        // Asegurarse de que los pacientes tengan ID
        const validatedPatients = processedPatients.map(patient => {
          if (!patient.id_pc && patient.id) {
            console.log(`[Dispositivos] Paciente con id=${patient.id} no tiene id_pc, añadiendo`);
            return {
              ...patient,
              id_pc: patient.id
            };
          }
          return patient;
        });
        
        console.log('[Dispositivos] Pacientes validados: ', JSON.stringify(validatedPatients));
        
        setPatients(validatedPatients);
        if (validatedPatients.length > 0) {
          console.log(`[Dispositivos] Seleccionando paciente: ${JSON.stringify(validatedPatients[0])}`);
          setSelectedPatient(validatedPatients[0]);
        }
      } else {
        console.log('[Dispositivos] No se encontraron pacientes');
        setPatients([]);
        setSelectedPatient(null);
        Alert.alert(
          'Sin pacientes', 
          result.error || 'No tienes pacientes asignados. Consulta con el administrador para verificar tus asignaciones.'
        );
      }
    } catch (error) {
      console.error('[Dispositivos] Error cargando pacientes:', error);
      setPatients([]);
      setSelectedPatient(null);
      Alert.alert(
        'Error', 
        'No se pudieron cargar los pacientes. Verifica tu conexión a internet e inténtalo de nuevo.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Cargar la última cita del paciente seleccionado
  const loadLatestAppointment = async (patientId: number) => {
    try {
      console.log(`[Dispositivos] Cargando última cita para paciente ID: ${patientId}`);
      
      const result = await DoctorService.getLatestAppointment(patientId);
      
      if (result.success && result.appointment) {
        console.log(`[Dispositivos] Cita encontrada: ${JSON.stringify(result.appointment)}`);
        
        // Normalizar la estructura si viene anidada
        const normalized = {
          ...result.appointment,
          id_ap: result.appointment.id_ap || result.appointment.appointment?.id_ap,
          id_pc: result.appointment.id_pc || result.appointment.appointment?.id_pc,
          id_dc: result.appointment.id_dc || result.appointment.appointment?.id_dc,
          date: result.appointment.date || result.appointment.appointment?.date,
          time: result.appointment.time || result.appointment.appointment?.time,
        };
        
        console.log(`[Dispositivos] Cita normalizada: ${JSON.stringify(normalized)}`);
        setLatestAppointment(normalized);
      } else {
        setLatestAppointment(null);
        console.log(`[Dispositivos] No se encontró cita para el paciente: ${result.error || 'Sin citas'}`);
        // No mostramos alerta aquí para no interrumpir al usuario,
        // la interfaz mostrará el mensaje correspondiente
      }
    } catch (error) {
      console.error('[Dispositivos] Error cargando última cita:', error);
      setLatestAppointment(null);
      // No mostramos alerta aquí para no interrumpir al usuario,
      // la interfaz mostrará un mensaje adecuado
    }
  };

  // Manejar cambios en el estado de la sesión IoT
  const handleSessionChange = (isActive: boolean) => {
    setSessionActive(isActive);
  };

  // Renderizar lista de pacientes como chips seleccionables
  const renderPatientChips = () => {
    if (patients.length === 0) {
      return (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No hay pacientes asignados a este doctor</Text>
          <Text style={styles.noDataSubtext}>Para usar el dispositivo IoT, primero debe tener pacientes con citas programadas</Text>
          <Button 
            mode="contained" 
            onPress={() => router.push('/citas')}
            style={styles.scheduleButton}
          >
            Ver Citas
          </Button>
        </View>
      );
    }

    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.chipContainer}
      >
        {patients.map((patient, index) => {
          // Manejar diferentes campos según la estructura que venga de la API
          const name = patient.name || patient.nombre || '';
          const lastName = patient.last_name || patient.apellido_p || patient.apellido || '';
          const patientId = patient.id_pc || patient.id;
          
          return (
            <Chip
              key={patientId || index}
              selected={Boolean(selectedPatient && patientId === (selectedPatient.id_pc || selectedPatient.id))}
              onPress={() => setSelectedPatient(patient)}
              style={[
                styles.chip,
                selectedPatient && patientId === (selectedPatient.id_pc || selectedPatient.id) ? styles.selectedChip : undefined
              ]}
              textStyle={selectedPatient && patientId === (selectedPatient.id_pc || selectedPatient.id) ? styles.selectedChipText : undefined}
              avatar={<Ionicons name="person-circle" size={20} color={selectedPatient && patientId === (selectedPatient.id_pc || selectedPatient.id) ? "#fff" : "#666"} />}
            >
              {`${name} ${lastName}`}
            </Chip>
          );
        })}
      </ScrollView>
    );
  };

  // Renderizar tipos de ejercicios como chips seleccionables
  const renderExerciseTypes = () => {
    return (
      <View style={styles.exerciseTypesContainer}>
        <Text style={styles.sectionTitle}>Tipo de Ejercicio:</Text>
        <View style={styles.exerciseChips}>
          <Chip
            selected={exerciseType === 'flexion'}
            onPress={() => setExerciseType('flexion')}
            style={styles.exerciseChip}
          >
            Flexión
          </Chip>
          <Chip
            selected={exerciseType === 'extension'}
            onPress={() => setExerciseType('extension')}
            style={styles.exerciseChip}
          >
            Extensión
          </Chip>
          <Chip
            selected={exerciseType === 'grip'}
            onPress={() => setExerciseType('grip')}
            style={styles.exerciseChip}
          >
            Puño
          </Chip>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF9F1C" />
        <Text>Cargando pacientes...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>Dispositivo IoT</Text>
          <Text style={styles.subtitle}>Selecciona un paciente para iniciar una sesión</Text>
        </View>

        {renderPatientChips()}

        {selectedPatient && (
          <View style={styles.patientInfoContainer}>
            <Card style={styles.patientCard}>
              <Card.Content>
                <Title>
                  {`${selectedPatient.name || selectedPatient.nombre || ''} ${selectedPatient.last_name || selectedPatient.apellido_p || ''} ${selectedPatient.apellido_m || ''}`}
                </Title>
                <Paragraph>Edad: {selectedPatient.age || selectedPatient.edad || '?'} años</Paragraph>
                {(selectedPatient.gender || selectedPatient.genero) && (
                  <Paragraph>
                    Género: {
                      (selectedPatient.gender || selectedPatient.genero) === 'male' ? 'Masculino' : 
                      (selectedPatient.gender || selectedPatient.genero) === 'female' ? 'Femenino' : 'Otro'
                    }
                  </Paragraph>
                )}
              </Card.Content>
            </Card>

            {renderExerciseTypes()}

            {latestAppointment ? (
              <IoTSessionControl 
                citaId={String(latestAppointment.id_ap || latestAppointment.appointment?.id_ap || "0")}
                patientName={`${selectedPatient.name || selectedPatient.nombre || 'Paciente'} ${selectedPatient.last_name || selectedPatient.apellido_p || ''}`}
                onSessionChange={handleSessionChange}
                exerciseType={exerciseType}
              />
            ) : (
              <Card style={styles.noAppointmentCard}>
                <Card.Content>
                  <Paragraph style={styles.noAppointmentText}>
                    Este paciente no tiene citas programadas. Debe agendar una cita para poder usar el dispositivo IoT.
                  </Paragraph>
                  <Button 
                    mode="contained" 
                    onPress={() => router.push('/citas/agendar')}
                    style={styles.scheduleButton}
                  >
                    Agendar Cita
                  </Button>
                </Card.Content>
              </Card>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  chipContainer: {
    padding: 16,
    flexDirection: 'row',
  },
  chip: {
    marginRight: 8,
    backgroundColor: '#f0f0f0',
  },
  selectedChip: {
    backgroundColor: '#FF9F1C',
  },
  selectedChipText: {
    color: 'white',
  },
  patientInfoContainer: {
    padding: 16,
  },
  patientCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  exerciseTypesContainer: {
    marginBottom: 16,
  },
  exerciseChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  exerciseChip: {
    margin: 4,
  },
  noAppointmentCard: {
    marginTop: 16,
    backgroundColor: '#FFF8E1',
  },
  noAppointmentText: {
    textAlign: 'center',
    marginBottom: 12,
  },
  noDataContainer: {
    padding: 16,
    alignItems: 'center',
    margin: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  noDataText: {
    padding: 16,
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    fontSize: 16,
    fontWeight: 'bold',
  },
  noDataSubtext: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 16,
  },
  scheduleButton: {
    marginTop: 8,
    backgroundColor: '#FF9F1C',
  },
});
