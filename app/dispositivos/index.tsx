import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Alert, Modal, TouchableOpacity, Platform } from 'react-native';
import { Text, Chip, Card, Title, Paragraph, Button, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../components/AuthContext';
import { router } from 'expo-router';
import IoTSessionControl from '../components/IoTSessionControl';
import { DoctorService } from '../../lib/services/doctors';
import { AppointmentService, Appointment } from '../../lib/services/appointments';
import { Patient } from '../../lib/services/patients';
import { Ionicons } from '@expo/vector-icons';
import { API_CONFIG } from '../../lib/config';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function DispositivosScreen() {
  const { userRole, userId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [latestAppointment, setLatestAppointment] = useState<Appointment | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [exerciseType, setExerciseType] = useState<'flexion' | 'extension' | 'grip'>('flexion');
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [doctorProfile, setDoctorProfile] = useState<any>(null);

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
      
      // Guardar perfil del doctor para usarlo al agendar citas
      setDoctorProfile(profile);
      
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
        
        // Procesamiento de datos para manejar posibles estructuras anidadas
        let processedPatients: Patient[] = [];
        
        // Si es un array de arrays, aplanarlo
        if (result.patients.length === 1 && Array.isArray(result.patients[0])) {
          console.log('[Dispositivos] Detectado array anidado, aplanando estructura');
          processedPatients = result.patients[0];
        } else if (Array.isArray(result.patients)) {
          // Si es un array normal, usarlo directamente
          processedPatients = result.patients;
        }
        
        // Verificar datos de pacientes
        console.log(`[Dispositivos] Número de pacientes procesados: ${processedPatients.length}`);
        
        // Filtrar pacientes inválidos o arrays anidados
        const filteredPatients = processedPatients.filter(patient => {
          // Verificar que no sea un array
          if (Array.isArray(patient)) {
            console.log('[Dispositivos] Descartando paciente que es un array:', JSON.stringify(patient));
            return false;
          }
          
          // Verificar que tenga datos básicos necesarios
          if (!patient || typeof patient !== 'object') {
            console.log('[Dispositivos] Descartando paciente inválido (no es un objeto)');
            return false;
          }
          
          // Verificar que tenga ID y nombre
          const hasId = patient.id_pc || patient.id;
          const hasName = patient.nombre || patient.name;
          
          if (!hasId || !hasName) {
            console.log('[Dispositivos] Descartando paciente sin ID o nombre:', JSON.stringify(patient));
            return false;
          }
          
          return true;
        });
        
        console.log(`[Dispositivos] Pacientes válidos después de filtrado: ${filteredPatients.length}`);
        
        // Asegurarse de que los pacientes tengan ID
        const validatedPatients = filteredPatients.map(patient => {
          if (!patient.id_pc && patient.id) {
            console.log(`[Dispositivos] Paciente con id=${patient.id} no tiene id_pc, añadiendo`);
            return {
              ...patient,
              id_pc: patient.id
            };
          }
          return patient;
        });
        
        // Eliminar posibles duplicados basados en ID
        const uniquePatients = Array.from(
          new Map(validatedPatients.map(patient => 
            [(patient.id_pc || patient.id), patient]
          )).values()
        );
        
        console.log(`[Dispositivos] Pacientes únicos después de validación: ${uniquePatients.length}`);
        
        setPatients(uniquePatients);
        if (uniquePatients.length > 0) {
          console.log(`[Dispositivos] Seleccionando primer paciente: ${JSON.stringify(uniquePatients[0])}`);
          setSelectedPatient(uniquePatients[0]);
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
        contentContainerStyle={styles.chipContentContainer}
      >
        {patients.map((patient, index) => {
          // Verificar que el paciente sea válido
          if (!patient || typeof patient !== 'object' || Array.isArray(patient)) {
            console.log('[Dispositivos] Saltando paciente inválido en renderizado');
            return null;
          }
          
          // Manejar diferentes campos según la estructura que venga de la API
          const name = patient.name || patient.nombre || '';
          const lastName = patient.last_name || patient.apellido_p || patient.apellido || '';
          const patientId = patient.id_pc || patient.id;
          
          // Verificar que tengamos ID y nombre
          if (!patientId || !name) {
            console.log('[Dispositivos] Saltando paciente sin ID o nombre en renderizado');
            return null;
          }
          
          const isSelected = Boolean(selectedPatient && 
            patientId === (selectedPatient.id_pc || selectedPatient.id));
          
          return (
            <Chip
              key={`patient-${patientId}-${index}`}
              selected={isSelected}
              onPress={() => setSelectedPatient(patient)}
              style={[
                styles.chip,
                isSelected ? styles.selectedChip : undefined
              ]}
              textStyle={isSelected ? styles.selectedChipText : undefined}
              avatar={<Ionicons name="person-circle" size={20} color={isSelected ? "#fff" : "#666"} />}
            >
              {`${name} ${lastName}`.trim()}
            </Chip>
          );
        }).filter(Boolean)}
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

  // Función para manejar el cambio de fecha
  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || new Date();
    setShowDatePicker(Platform.OS === 'ios');
    setSelectedDate(currentDate);
  };

  // Función para manejar el cambio de hora
  const onTimeChange = (event: any, selectedTime?: Date) => {
    const currentTime = selectedTime || new Date();
    setShowTimePicker(Platform.OS === 'ios');
    setSelectedTime(currentTime);
  };

  // Función para crear una nueva cita
  const handleCreateAppointment = async () => {
    if (!selectedPatient || !doctorProfile) {
      Alert.alert('Error', 'No se ha seleccionado un paciente o no se ha cargado el perfil del doctor.');
      return;
    }

    try {
      setSubmitting(true);

      // Formatear la fecha y hora para el API
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const formattedTime = format(selectedTime, 'HH:mm:ss');

      // Obtener el ID del paciente, asegurando que sea un número válido
      const patientId = selectedPatient.id_pc || selectedPatient.id;
      if (!patientId) {
        Alert.alert('Error', 'No se pudo determinar el ID del paciente.');
        setSubmitting(false);
        return;
      }

      // Crear objeto de cita con todos los campos requeridos
      const appointmentData = {
        id_pc: patientId, 
        id_dc: doctorProfile.id_dc,
        date: formattedDate,
        time: formattedTime,
        payment_amount: 0, // Valor por defecto requerido por la API
        notes: notes || 'Cita agendada por el doctor'
      };

      console.log('[Dispositivos] Creando cita con datos:', appointmentData);

      // Llamar al servicio para crear la cita
      const result = await AppointmentService.createAppointment(appointmentData);

      if (result) {
        // Actualizar el estado de la cita a "completed" (aceptada)
        if (result.id_ap) {
          await AppointmentService.updateAppointmentStatus(result.id_ap, 'completed');
        }

        Alert.alert(
          'Éxito',
          'La cita ha sido agendada correctamente.',
          [{ text: 'OK', onPress: () => {
            // Limpiar formulario
            setNotes('');
            setShowModal(false);
            
            // Recargar cita del paciente
            if (patientId) {
              loadLatestAppointment(patientId);
            }
          }}]
        );
      } else {
        Alert.alert('Error', 'No se pudo agendar la cita. Intente nuevamente.');
      }
    } catch (error) {
      console.error('[Dispositivos] Error al crear cita:', error);
      Alert.alert('Error', 'Ha ocurrido un error al intentar agendar la cita. Intente nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  // Función para abrir modal con datos limpios
  const openAppointmentModal = () => {
    // Inicializar fecha para hoy
    setSelectedDate(new Date());
    
    // Inicializar hora para la próxima hora en punto
    const nextHour = new Date();
    nextHour.setHours(nextHour.getHours() + 1);
    nextHour.setMinutes(0);
    nextHour.setSeconds(0);
    setSelectedTime(nextHour);
    
    // Limpiar notas
    setNotes('');
    
    // Mostrar modal
    setShowModal(true);
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
                    onPress={() => setShowModal(true)}
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

      {showModal && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={showModal}
          onRequestClose={() => setShowModal(false)}
        >
          <TouchableOpacity
            style={styles.modalContainer}
            activeOpacity={1}
            onPress={() => setShowModal(false)}
          >
            <View 
              style={styles.modalContent}
              onStartShouldSetResponder={() => true}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              <Text style={styles.modalTitle}>Agendar Cita</Text>
              
              <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Fecha:</Text>
                <Text style={styles.inputValue}>{format(selectedDate, 'dd/MM/yyyy', { locale: es })}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity onPress={() => setShowTimePicker(true)} style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Hora:</Text>
                <Text style={styles.inputValue}>{format(selectedTime, 'HH:mm', { locale: es })}</Text>
              </TouchableOpacity>
              
              <TextInput
                label="Notas para la cita"
                value={notes}
                onChangeText={setNotes}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.notesInput}
              />
              
              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display="default"
                  onChange={onDateChange}
                  minimumDate={new Date()}
                />
              )}
              
              {showTimePicker && (
                <DateTimePicker
                  value={selectedTime}
                  mode="time"
                  display="default"
                  onChange={onTimeChange}
                  minuteInterval={15}
                />
              )}
              
              <View style={styles.buttonRow}>
                <Button
                  mode="outlined"
                  onPress={() => setShowModal(false)}
                  style={styles.cancelButton}
                >
                  Cancelar
                </Button>
                <Button
                  mode="contained"
                  onPress={handleCreateAppointment}
                  style={styles.submitButton}
                  loading={submitting}
                  disabled={submitting}
                >
                  Agendar
                </Button>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
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
  chipContentContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 20,
    width: '90%',
    maxWidth: 500,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#2E7D32',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  inputLabel: {
    fontWeight: 'bold',
    marginRight: 8,
    fontSize: 16,
    color: '#444',
    width: 60,
  },
  inputValue: {
    fontWeight: 'normal',
    fontSize: 16,
    color: '#333',
  },
  notesInput: {
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    marginRight: 10,
    borderColor: '#FF9F1C',
  },
  submitButton: {
    flex: 1,
    marginLeft: 10,
    backgroundColor: '#FF9F1C',
  },
});
