import React, { useEffect, useState } from 'react';
import { View, StyleSheet, RefreshControl, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Surface, ActivityIndicator, Button, Card, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../components/AuthContext';
import ProgressCircle from '../components/ProgressCircle';
import { PatientService, Patient } from '../../lib/services/patients';
import { AppointmentService, Appointment } from '../../lib/services/appointments';
import { DoctorService, Doctor } from '../../lib/services/doctors';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function HomeScreen() {
  const { userRole, userEmail, userId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [nextAppointment, setNextAppointment] = useState<Appointment | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<Doctor | null>(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (userRole === 'patient') {
        // VISTA DE PACIENTE
        console.log('Cargando datos del paciente...');

        try {
          // Cargar perfil del paciente
          const patientData = await PatientService.getMyProfile();
          console.log('Datos del paciente cargados:', JSON.stringify(patientData));
          
          // Asignar un valor de progreso por defecto si no existe
          if (patientData && (patientData as any).progress === undefined) {
            (patientData as any).progress = 0.4; // Valor por defecto para la visualización
          }
          
          setPatient(patientData);
        } catch (error) {
          console.error('Error al cargar datos del paciente:', error);
          setError('No se pudieron cargar los datos del paciente. Por favor, intenta de nuevo.');
        }
        
        try {
          // Cargar próxima cita
          const appointmentData = await AppointmentService.getNextAppointment();
          setNextAppointment(appointmentData);
        } catch (error) {
          console.error('Error al cargar próxima cita:', error);
        }
      } else if (userRole === 'doctor') {
        // VISTA DE DOCTOR
        try {
          console.log('**** INICIO DE CARGA DE DATOS DE DOCTOR ****');
          console.log('Role actual:', userRole);
          console.log('ID de usuario:', userId);
          
          // Obtener datos reales del doctor
          try {
            console.log('Intentando obtener perfil del doctor...');
            const doctor = await DoctorService.getMyProfile();
            console.log('Perfil del doctor cargado exitosamente:', JSON.stringify(doctor));
            setDoctorProfile(doctor);
          } catch (doctorError) {
            console.error('Error al cargar perfil de doctor:', doctorError);
            setError('No se pudo cargar el perfil del doctor. Por favor, intenta de nuevo.');
            return; // Detenemos la carga si no podemos obtener el perfil del doctor
          }
          
          // Cargar citas del doctor
          try {
            console.log('Intentando obtener citas del doctor...');
            const appointments = await DoctorService.getUpcomingAppointments();
            console.log('Citas del doctor cargadas exitosamente:', JSON.stringify(appointments));
            
            // Limitar a 3 citas
            setUpcomingAppointments(appointments.slice(0, 3));
          } catch (appointmentsError) {
            console.error('Error al cargar citas del doctor:', appointmentsError);
            setError('No se pudieron cargar las citas. Por favor, intenta de nuevo.');
          }
        } catch (error) {
          console.error('Error general al cargar datos del doctor:', error);
          setError('No se pudieron cargar los datos. Por favor, intenta de nuevo.');
        }
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
      setError('Error al cargar los datos. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatAppointmentDate = (appointment: Appointment) => {
    try {
      const date = new Date(`${appointment.date}T${appointment.time}`);
      return format(date, "d 'de' MMMM, yyyy - HH:mm", { locale: es });
    } catch (error) {
      console.error('Error al formatear fecha:', error);
      return 'Fecha no disponible';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  const renderPatientContent = () => {
    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Button mode="contained" onPress={loadData} style={styles.retryButton}>
            Intentar de nuevo
          </Button>
        </View>
      );
    }

    // Si no hay datos del paciente pero tampoco hay error, mostrar un mensaje
    if (!patient) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.infoText}>No se encontraron datos del paciente.</Text>
          <Button mode="contained" onPress={loadData} style={styles.retryButton}>
            Intentar de nuevo
          </Button>
        </View>
      );
    }

    return (
      <>
        {/* Nombre del paciente */}
        <Text style={styles.patientName}>
          {`${patient.nombre || ''} ${patient.apellido_p || ''} ${patient.apellido_m || ''}`.trim()}
        </Text>

        <View style={styles.content}>
          <View style={styles.row}>
            {/* Gráfica de progreso */}
            <Surface style={styles.progressContainer} elevation={2}>
              <ProgressCircle progress={(patient as any)?.progress || 0} />
              <Text style={styles.progressText}>Progreso Total</Text>
            </Surface>

            {/* Información para el paciente */}
            <Surface style={styles.infoContainer} elevation={2}>
              <Text style={styles.infoTitle}>Información</Text>
              <Text style={styles.infoText}>
                {(patient as any)?.progress && (patient as any).progress > 0.7
                  ? 'Tu progreso va muy bien. Continúa con tus ejercicios diarios para mejorar tu condición.'
                  : 'Mantén la constancia en tus ejercicios para mejorar tu progreso.'}
              </Text>
            </Surface>
          </View>

          {/* Próxima cita */}
          <Surface style={styles.appointmentContainer} elevation={2}>
            <Text style={styles.appointmentTitle}>
              {nextAppointment ? 'Tu próxima cita es el:' : 'No tienes citas programadas'}
            </Text>
            {nextAppointment && (
              <>
                <Text style={styles.appointmentDate}>
                  {formatAppointmentDate(nextAppointment)}
                </Text>
                {nextAppointment.doctor && (
                  <Text style={styles.doctorName}>
                    Dr. {nextAppointment.doctor.nombre} {nextAppointment.doctor.apellido_p}
                  </Text>
                )}
              </>
            )}
          </Surface>
        </View>
      </>
    );
  };

  const renderDoctorContent = () => {
    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Button mode="contained" onPress={loadData} style={styles.retryButton}>
            Intentar de nuevo
          </Button>
        </View>
      );
    }

    // Formatear nombre completo del doctor
    const doctorName = doctorProfile 
      ? `Dr. ${doctorProfile.nombre} ${doctorProfile.apellido_p}` 
      : 'Doctor';

    return (
      <>
        <Text style={styles.welcomeDoctor}>
          ¡Bienvenido!, {doctorName}
        </Text>

        <View style={styles.content}>
          <Surface style={styles.doctorAppointmentsContainer} elevation={2}>
            <Text style={styles.doctorAppointmentsTitle}>
              Tus próximas citas son (max 3):
            </Text>
            
            {upcomingAppointments.length === 0 ? (
              <Text style={styles.noCitasText}>No tienes citas programadas</Text>
            ) : (
              upcomingAppointments.map((appointment, index) => (
                <Card key={appointment.id_ap} style={styles.citaCard}>
                  <Card.Content style={styles.citaCardContent}>
                    <View style={styles.citaInfo}>
                      <Text style={styles.citaFecha}>
                        {formatAppointmentDate(appointment)}
                      </Text>
                      <Text style={styles.citaPaciente}>
                        {/* Mostrar información del paciente si está disponible */}
                        {(appointment as any).patient 
                          ? `${(appointment as any).patient.nombre || ''} ${(appointment as any).patient.apellido_p || ''}`.trim()
                          : `Paciente ID: ${appointment.id_pc}`}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.editButton}
                      onPress={() => router.navigate('/citas')}
                    >
                      <Text style={styles.editButtonText}>Editar</Text>
                    </TouchableOpacity>
                  </Card.Content>
                </Card>
              ))
            )}
          </Surface>
        </View>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2E7D32"]} />
        }
      >
        {userRole === 'doctor' ? renderDoctorContent() : renderPatientContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#d32f2f',
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#2E7D32',
    marginTop: 10,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  patientName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    padding: 16,
    backgroundColor: 'white',
  },
  row: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  progressContainer: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  progressText: {
    marginTop: 8,
    fontSize: 16,
    color: '#2E7D32',
    textAlign: 'center',
  },
  infoContainer: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    backgroundColor: 'white',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  appointmentContainer: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: 'white',
  },
  appointmentTitle: {
    fontSize: 18,
    color: '#2E7D32',
    marginBottom: 8,
  },
  appointmentDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  doctorName: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },

  // Estilos para la vista del doctor
  welcomeDoctor: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    padding: 16,
    backgroundColor: 'white',
  },
  doctorAppointmentsContainer: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: 'white',
  },
  doctorAppointmentsTitle: {
    fontSize: 18,
    color: '#2E7D32',
    marginBottom: 16,
  },
  noCitasText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  citaCard: {
    marginBottom: 12,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  citaCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  citaInfo: {
    flex: 1,
  },
  citaFecha: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  citaPaciente: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  editButton: {
    backgroundColor: '#FF9F1C',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
