import React, { useEffect, useState } from 'react';
import { View, StyleSheet, RefreshControl, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Surface, ActivityIndicator, Button, Card, Divider, Chip } from 'react-native-paper';
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
  const { userRole, userEmail, userId, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [nextAppointment, setNextAppointment] = useState<Appointment | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<Doctor | null>(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [showAllAppointments, setShowAllAppointments] = useState(false);
  const [expandedAppointment, setExpandedAppointment] = useState<number | null>(null);
  const [patientAppointments, setPatientAppointments] = useState<Appointment[]>([]);
  const [showAllPatientAppointments, setShowAllPatientAppointments] = useState(false);

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
          
          // Asignar un valor de progreso inicial
          if (patientData) {
            // Usar valor mínimo de 0.2 para que se vea el círculo incluso sin citas
            (patientData as any).progress = 0.2; 
            (patientData as any).completedAppointments = 0;
            (patientData as any).totalAppointments = 0;
            setPatient(patientData);
          }
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
        
        // Cargar todas las citas del paciente
        try {
          const allAppointments = await AppointmentService.getMyAppointments();
          console.log('Todas las citas del paciente cargadas:', JSON.stringify(allAppointments));
          
          // Mostrar todas las citas
          setPatientAppointments(allAppointments);
          console.log(`Se encontraron ${allAppointments.length} citas totales para el paciente`);
          
          // Calcular progreso basado en citas completadas
          if (allAppointments.length > 0 && patient) {
            // Calcular el número de citas completadas
            const completedAppointments = allAppointments.filter(app => 
              app.status?.toLowerCase() === 'completed'
            );
            
            const completedCount = completedAppointments.length;
            const totalCount = allAppointments.length;
            
            // Calcular el progreso (proporción de citas completadas)
            const progress = totalCount > 0 ? completedCount / totalCount : 0;
            console.log(`Progreso calculado: ${completedCount}/${totalCount} = ${progress.toFixed(2)}`);
            
            // Actualizar el progreso en los datos del paciente y actualizar el estado
            (patient as any).progress = progress;
            (patient as any).completedAppointments = completedCount;
            (patient as any).totalAppointments = totalCount;
            setPatient({...patient}); // Actualizar estado para reflejar los cambios
          }
          
          // Si no hay citas, simular algunas para pruebas (solo en desarrollo)
          if (allAppointments.length === 0) {
            console.log('No se encontraron citas reales, creando ejemplos para pruebas...');
            
            // Citas de ejemplo para pruebas
            const exampleAppointments = [
              {
                id_ap: 1001,
                date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // mañana
                time: '10:00',
                status: 'pending',
                doctor: {
                  id_dc: 1,
                  nombre: 'Juan',
                  apellido_p: 'Médico',
                  speciality: 'Traumatología'
                }
              },
              {
                id_ap: 1002,
                date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // en 3 días
                time: '16:30',
                status: 'completed',
                doctor: {
                  id_dc: 2,
                  nombre: 'María',
                  apellido_p: 'Doctora',
                  speciality: 'Fisioterapia'
                }
              },
              {
                id_ap: 1003,
                date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // hace 2 días
                time: '11:15',
                status: 'completed',
                doctor: {
                  id_dc: 1,
                  nombre: 'Juan',
                  apellido_p: 'Médico',
                  speciality: 'Traumatología'
                }
              }
            ];
            
            setPatientAppointments(exampleAppointments as Appointment[]);
            console.log('Citas de ejemplo creadas para visualización');
            
            // Actualizar progreso con datos de ejemplo si tenemos datos del paciente
            if (patient) {
              // 2 de 3 citas completadas (66.7%)
              (patient as any).progress = 2/3;
              (patient as any).completedAppointments = 2;
              (patient as any).totalAppointments = 3;
              setPatient({...patient}); // Actualizar estado para reflejar los cambios
            }
          }
        } catch (error) {
          console.error('Error al cargar todas las citas del paciente:', error);
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
            const appointments = await DoctorService.getUpcomingAppointmentsRaw();
            console.log('Citas obtenidas del servicio:', JSON.stringify(appointments));
            
            if (Array.isArray(appointments) && appointments.length > 0) {
              // Extraer datos de citas si están dentro de un objeto "appointment"
              const processedAppointments = appointments.map(item => {
                if (item.appointment) {
                  return {
                    ...item.appointment,
                    patient: item.patient // mantener la referencia al paciente
                  };
                }
                return item;
              });
              
              // Filtrar solo citas con estado 'completed' sin restricción de fecha
              const completedAppointments = processedAppointments.filter(app => 
                app.status?.toLowerCase() === 'completed'
              );
              
              console.log(`Se encontraron ${completedAppointments.length} citas completadas`);
              setUpcomingAppointments(completedAppointments);
            } else {
              console.log('No se encontraron citas para este doctor');
              setUpcomingAppointments([]);
            }
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

  // Función para navegar a los detalles de una cita
  const navigateToCitaDetails = (appointmentId: number | undefined) => {
    if (appointmentId) {
      console.log(`Navegando a detalles de cita con ID: ${appointmentId}`);
      router.push(`/citas/${appointmentId}`);
    } else {
      console.error('No se puede navegar, el ID de la cita es indefinido');
    }
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

  // Función para manejar el cambio de estado de una cita
  const handleChangeAppointmentStatus = async (appointmentId: number | undefined, newStatus: string) => {
    if (!appointmentId) return;
    
    try {
      setLoading(true);
      
      // Confirmación antes de cambiar el estado
      Alert.alert(
        'Cambiar estado',
        `¿Está seguro que desea cambiar el estado de la cita a ${getStatusText(newStatus)}?`,
        [
          {
            text: 'Cancelar',
            style: 'cancel',
            onPress: () => setLoading(false)
          },
          {
            text: 'Confirmar',
            onPress: async () => {
              try {
                await AppointmentService.updateAppointmentStatus(appointmentId, newStatus);
                Alert.alert('Éxito', `La cita ha sido ${newStatus === 'cancelled' ? 'cancelada' : 'actualizada'} correctamente.`);
                loadData(); // Recargar datos
              } catch (error) {
                console.error('Error al actualizar estado de cita:', error);
                Alert.alert('Error', 'No se pudo actualizar el estado de la cita. Intente de nuevo.');
                setLoading(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error al procesar la solicitud:', error);
      setLoading(false);
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

    // Ordenar citas del paciente por fecha y hora (las más próximas primero)
    const sortedPatientAppointments = [...patientAppointments].sort((a, b) => {
      // Poner primero las citas pendientes
      const statusA = a.status?.toLowerCase() || '';
      const statusB = b.status?.toLowerCase() || '';
      
      // Pendientes primero
      if (statusA === 'pending' && statusB !== 'pending') return -1;
      if (statusA !== 'pending' && statusB === 'pending') return 1;
      
      // Si ambas son pendientes o ambas no lo son, ordenar por fecha
      const dateA = new Date(`${a.date || '2099-01-01'}T${a.time || '00:00'}`);
      const dateB = new Date(`${b.date || '2099-01-01'}T${b.time || '00:00'}`);
      
      // Mostrar próximas citas primero para citas pendientes
      if (statusA === 'pending' && statusB === 'pending') {
        return dateA.getTime() - dateB.getTime();
      }
      
      // Para citas completadas/canceladas, mostrar más recientes primero
      return dateB.getTime() - dateA.getTime();
    });
    
    // Si no se está mostrando todo, limitamos a las 3 primeras citas
    const displayedPatientAppointments = !showAllPatientAppointments 
      ? sortedPatientAppointments.slice(0, 3) 
      : sortedPatientAppointments;

    return (
      <>
        {/* Nombre del paciente */}
        <Text style={styles.patientName}>
          {`${patient.nombre || ''} ${patient.apellido_p || ''} ${patient.apellido_m || ''}`.trim()}
        </Text>

        <View style={styles.content}>
          {/* Fila de información principal */}
          <View style={styles.row}>
            {/* Gráfica de progreso */}
            <Surface style={styles.infoBox} elevation={2}>
              <Text style={styles.infoTitle}>Progreso de Rehabilitación</Text>
              <View style={styles.progressCircleContainer}>
                <ProgressCircle progress={(patient as any)?.progress || 0} />
              </View>
              {(patient as any)?.completedAppointments !== undefined && (
                <Text style={styles.progressDetails}>
                  {(patient as any)?.completedAppointments} de {(patient as any)?.totalAppointments} citas completadas
                </Text>
              )}
              <Text style={styles.infoText}>
                {(patient as any)?.progress && (patient as any).progress > 0.5
                  ? 'Tu progreso va muy bien. Continúa con tus ejercicios diarios.'
                  : 'Mantén la constancia en tus ejercicios para mejorar tu progreso.'}
              </Text>
            </Surface>

            {/* Información mejorada para el paciente */}
            <Surface style={styles.infoBox} elevation={2}>
              <Text style={styles.infoTitle}>Información del Paciente</Text>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>ID:</Text>
                <Text style={styles.infoValue}>{patient.id_pc || patient.id || 'N/A'}</Text>
              </View>
              
              {patient.age && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Edad:</Text>
                  <Text style={styles.infoValue}>{patient.age} años</Text>
                </View>
              )}
              
              {(patient.weight && patient.height) && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Datos:</Text>
                  <Text style={styles.infoValue}>
                    {patient.weight} kg / {patient.height} cm
                  </Text>
                </View>
              )}
              
              {patient.blood_type && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Tipo Sangre:</Text>
                  <Text style={styles.infoValue}>{patient.blood_type}</Text>
                </View>
              )}
              
              {nextAppointment && (
                <View style={[styles.infoRow, styles.nextAppointmentRow]}>
                  <Text style={styles.nextAppointmentLabel}>Próxima cita:</Text>
                  <Text style={styles.nextAppointmentDate}>
                    {formatAppointmentDate(nextAppointment)}
                  </Text>
                </View>
              )}
            </Surface>
          </View>
          
          {/* Citas del paciente */}
          <Surface style={styles.patientAppointmentsContainer} elevation={2}>
            <View style={styles.appointmentsHeader}>
              <Text style={styles.patientAppointmentsTitle}>
                {!showAllPatientAppointments ? 'Tus próximas citas' : 'Todas tus citas'}
              </Text>
              {patientAppointments.length > 3 && (
                <TouchableOpacity
                  style={styles.toggleButton}
                  onPress={() => setShowAllPatientAppointments(!showAllPatientAppointments)}
                >
                  <Text style={styles.toggleButtonText}>
                    {!showAllPatientAppointments ? 'Ver todas' : 'Ver menos'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            
            {displayedPatientAppointments.length === 0 ? (
              <View style={styles.noCitasContainer}>
                <Text style={styles.noCitasText}>No tienes citas programadas</Text>
                <Button 
                  mode="outlined" 
                  onPress={() => router.push('/citas/agendar')}
                  style={styles.scheduleButton}
                >
                  Agendar Cita
                </Button>
              </View>
            ) : (
              displayedPatientAppointments.map((appointment) => (
                <Card 
                  key={appointment.id_ap} 
                  style={styles.citaCard}
                >
                  <Card.Content>
                    <View style={styles.citaCardContent}>
                      <View style={styles.citaInfo}>
                        <Text style={styles.citaFecha}>
                          {formatAppointmentDate(appointment)}
                        </Text>
                        {appointment.doctor && (
                          <Text style={styles.citaDoctor}>
                            Dr. {appointment.doctor.nombre} {appointment.doctor.apellido_p}
                          </Text>
                        )}
                      </View>
                      <View style={styles.statusContainer}>
                        <Chip 
                          style={[styles.statusChip, { backgroundColor: getStatusColor(appointment.status) }]}
                        >
                          <Text style={styles.statusText}>
                            {getStatusText(appointment.status)}
                          </Text>
                        </Chip>
                      </View>
                    </View>
                  </Card.Content>
                </Card>
              ))
            )}
            
            <TouchableOpacity 
              style={styles.verTodasCitasButton}
              onPress={() => router.push('/citas')}
            >
              <Ionicons name="calendar-outline" size={20} color="white" />
              <Text style={styles.verTodasCitasButtonText}>Ver todas mis citas</Text>
            </TouchableOpacity>
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

    // Ordenar citas por fecha y hora (las más próximas primero)
    const sortedAppointments = [...upcomingAppointments].sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateA.getTime() - dateB.getTime();
    });
    
    // Si no se está mostrando todo, limitamos a las 3 primeras citas
    const displayedAppointments = !showAllAppointments 
      ? sortedAppointments.slice(0, 3) 
      : sortedAppointments;

    const toggleAppointmentDetails = (appointmentId: number | undefined) => {
      if (!appointmentId) return;
      
      if (expandedAppointment === appointmentId) {
        setExpandedAppointment(null); // Colapsar si ya está expandido
      } else {
        setExpandedAppointment(appointmentId); // Expandir el seleccionado
      }
    };

    return (
      <>
        <Text style={styles.welcomeDoctor}>
          ¡Bienvenido!, {doctorName}
        </Text>

        <View style={styles.content}>
          <Surface style={styles.doctorAppointmentsContainer} elevation={2}>
            <View style={styles.appointmentsHeader}>
              <Text style={styles.doctorAppointmentsTitle}>
                {!showAllAppointments ? 'Tus próximas citas aceptadas' : 'Todas tus citas aceptadas'}
              </Text>
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => setShowAllAppointments(!showAllAppointments)}
              >
                <Text style={styles.toggleButtonText}>
                  {!showAllAppointments ? 'Ver todas' : 'Ver menos'}
                </Text>
              </TouchableOpacity>
            </View>
            
            {displayedAppointments.length === 0 ? (
              <View style={styles.noCitasContainer}>
                <Text style={styles.noCitasText}>No tienes citas agendadas</Text>
                <Button 
                  mode="outlined" 
                  onPress={loadData}
                  style={styles.refreshButton}
                >
                  Actualizar
                </Button>
              </View>
            ) : (
              displayedAppointments.map((appointment) => (
                <Card 
                  key={appointment.id_ap} 
                  style={styles.citaCard}
                >
                  <Card.Content>
                    <View style={styles.citaCardContent}>
                      <View style={styles.citaInfo}>
                        <Text style={styles.citaFecha}>
                          {formatAppointmentDate(appointment)}
                        </Text>
                        <Text style={styles.citaPaciente}>
                          {/* Mostrar información del paciente si está disponible */}
                          {(appointment.patient) 
                            ? `${appointment.patient.nombre || ''} ${appointment.patient.apellido_p || ''}`.trim()
                            : appointment.id_pc 
                              ? `Paciente ID: ${appointment.id_pc}` 
                              : 'Paciente no especificado'}
                        </Text>
                      </View>
                      <View style={styles.statusContainer}>
                        <Chip 
                          style={[styles.statusChip, { backgroundColor: getStatusColor(appointment.status) }]}
                        >
                          <Text style={styles.statusText}>
                            {getStatusText(appointment.status)}
                          </Text>
                        </Chip>
                        
                        <TouchableOpacity 
                          style={styles.verDetallesButton}
                          onPress={() => toggleAppointmentDetails(appointment.id_ap)}
                        >
                          <Text style={styles.verDetallesButtonText}>
                            {expandedAppointment === appointment.id_ap ? 'Ocultar detalles' : 'Ver detalles'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    
                    {/* Área expandible con detalles */}
                    {expandedAppointment === appointment.id_ap && (
                      <View style={styles.expandedDetails}>
                        <Divider style={styles.divider} />
                        <Text style={styles.detailTitle}>Detalles de la cita:</Text>
                        
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Fecha:</Text>
                          <Text style={styles.detailValue}>{appointment.date}</Text>
                        </View>
                        
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Hora:</Text>
                          <Text style={styles.detailValue}>{appointment.time}</Text>
                        </View>
                        
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Estado:</Text>
                          <Text style={styles.detailValue}>{getStatusText(appointment.status)}</Text>
                        </View>
                        
                        {appointment.patient && (
                          <>
                            <Text style={styles.detailTitle}>Datos del paciente:</Text>
                            
                            <View style={styles.detailRow}>
                              <Text style={styles.detailLabel}>Nombre:</Text>
                              <Text style={styles.detailValue}>
                                {`${appointment.patient.nombre || ''} ${appointment.patient.apellido_p || ''} ${appointment.patient.apellido_m || ''}`.trim()}
                              </Text>
                            </View>
                            
                            {appointment.patient && (appointment.patient as any).email && (
                              <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Email:</Text>
                                <Text style={styles.detailValue}>{(appointment.patient as any).email}</Text>
                              </View>
                            )}
                          </>
                        )}
                        
                        {(appointment as any).description && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Descripción:</Text>
                            <Text style={styles.detailValue}>{(appointment as any).description}</Text>
                          </View>
                        )}

                        {/* Botones de acción */}
                        <View style={styles.actionButtonsContainer}>
                          {appointment.status?.toLowerCase() === 'completed' && (
                            <TouchableOpacity 
                              style={[styles.actionButton, styles.cancelButton]}
                              onPress={() => handleChangeAppointmentStatus(appointment.id_ap, 'cancelled')}
                            >
                              <Ionicons name="close-circle-outline" size={16} color="white" style={styles.actionButtonIcon} />
                              <Text style={styles.actionButtonText}>Cancelar Cita</Text>
                            </TouchableOpacity>
                          )}
                          
                          {appointment.status?.toLowerCase() === 'cancelled' && (
                            <TouchableOpacity 
                              style={[styles.actionButton, styles.completeButton]}
                              onPress={() => handleChangeAppointmentStatus(appointment.id_ap, 'completed')}
                            >
                              <Ionicons name="checkmark-circle-outline" size={16} color="white" style={styles.actionButtonIcon} />
                              <Text style={styles.actionButtonText}>Marcar como Completada</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    )}
                  </Card.Content>
                </Card>
              ))
            )}
            
            <TouchableOpacity 
              style={styles.verTodasCitasButton}
              onPress={() => router.push('/citas-dashboard')}
            >
              <Ionicons name="calendar-outline" size={20} color="white" />
              <Text style={styles.verTodasCitasButtonText}>Ir a gestión de citas</Text>
            </TouchableOpacity>
          </Surface>
        </View>
      </>
    );
  };

  // Función para obtener el color según el estado de la cita
  const getStatusColor = (status: string | undefined): string => {
    if (!status) return '#999';
    
    switch (status.toLowerCase()) {
      case 'completed':
        return '#28a745';
      case 'pending':
        return '#ffc107';
      case 'scheduled':
        return '#17a2b8';
      case 'cancelled':
        return '#dc3545';
      default:
        return '#999';
    }
  };
  
  // Función para obtener el texto del estado de la cita
  const getStatusText = (status: string | undefined): string => {
    if (!status) return 'No definido';
    
    switch (status.toLowerCase()) {
      case 'completed':
        return 'Completada';
      case 'pending':
        return 'Pendiente';
      case 'scheduled':
        return 'Programada';
      case 'cancelled':
        return 'Cancelada';
      default:
        return 'No definido';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Botón de cierre de sesión - solo visible para doctores */}
      {userRole === 'doctor' && (
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={24} color="#2E7D32" />
        </TouchableOpacity>
      )}
      
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
  infoBox: {
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
  progressCircleContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  progressDetails: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#555',
    width: 100,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  nextAppointmentRow: {
    marginTop: 8,
  },
  nextAppointmentLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  nextAppointmentDate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
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
  appointmentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  doctorAppointmentsTitle: {
    fontSize: 18,
    color: '#2E7D32',
  },
  toggleButton: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  toggleButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  noCitasContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  noCitasText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 16,
  },
  refreshButton: {
    borderColor: '#2E7D32',
    borderWidth: 1,
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
  statusContainer: {
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  statusChip: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  verDetallesButton: {
    backgroundColor: '#FF9F1C',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
  },
  verDetallesButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  verTodasCitasButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E7D32',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  verTodasCitasButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  
  // Estilo para el botón de cierre de sesión
  logoutButton: {
    position: 'absolute',
    top: 10,
    right: 15,
    zIndex: 10,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  divider: {
    marginVertical: 10,
  },
  expandedDetails: {
    marginTop: 10,
    paddingTop: 5,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginVertical: 5,
  },
  detailRow: {
    flexDirection: 'row',
    marginVertical: 3,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#555',
    width: 100,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  actionButtonsContainer: {
    marginTop: 15,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginHorizontal: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#dc3545',
  },
  completeButton: {
    backgroundColor: '#28a745',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  actionButtonIcon: {
    marginRight: 8,
  },
  patientAppointmentsContainer: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: 'white',
    marginTop: 16,
  },
  patientAppointmentsTitle: {
    fontSize: 18,
    color: '#2E7D32',
  },
  citaDoctor: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  scheduleButton: {
    borderColor: '#2E7D32',
    borderWidth: 1,
  },
});
