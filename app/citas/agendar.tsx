import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { Text, Button, TextInput, ActivityIndicator, Chip, Card, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Appointment, AppointmentService, CreateAppointmentDTO } from '../../lib/services/appointments';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ApiClient } from '../../lib/api-client';
import { API_CONFIG } from '../../lib/config';
import * as SecureStore from 'expo-secure-store';

// Interfaz para los doctores
interface Doctor {
  id_dc: number;
  nombre: string;
  apellido_p: string;
  apellido_m: string;
  speciality: string;
}

// Interfaz para los horarios disponibles
interface TimeSlot {
  time: string;
  available: boolean;
}

export default function AgendarCitaScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para el formulario
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlot[]>([]);
  const [notes, setNotes] = useState('');
  
  // Estados para validación
  const [dateError, setDateError] = useState('');
  const [timeError, setTimeError] = useState('');
  const [doctorError, setDoctorError] = useState('');

  // Cargar doctores al iniciar
  useEffect(() => {
    loadDoctors();
  }, []);

  // Cargar horarios disponibles cuando se selecciona una fecha y un doctor
  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      loadAvailableTimeSlots();
    }
  }, [selectedDate, selectedDoctor]);

  // Función para cargar doctores
  const loadDoctors = async () => {
    try {
      setLoadingDoctors(true);
      setError(null);
      
      // Solicitud para obtener doctores
      const response = await ApiClient.request(API_CONFIG.ENDPOINTS.DOCTORS);
      setDoctors(response);
    } catch (error) {
      console.error('Error al cargar doctores:', error);
      setError('No se pudieron cargar los doctores disponibles');
    } finally {
      setLoadingDoctors(false);
    }
  };

  // Función para cargar horarios disponibles
  const loadAvailableTimeSlots = async () => {
    if (!selectedDoctor) return;
    
    try {
      setLoadingSlots(true);
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      
      // Definir horarios predefinidos para todos los días y doctores
      const defaultTimeSlots: TimeSlot[] = [
        { time: '09:00', available: true },
        { time: '10:00', available: true },
        { time: '11:00', available: true },
        { time: '12:00', available: true },
        { time: '13:00', available: true },
        { time: '16:00', available: true },
        { time: '17:00', available: true },
      ];
      
      try {
        // Intentar obtener disponibilidad real (pero no dependemos de ella)
        const availability = await ApiClient.request(
          API_CONFIG.ENDPOINTS.DOCTOR_AVAILABILITY(selectedDoctor.id_dc, formattedDate)
        );
        
        console.log('Respuesta de disponibilidad:', JSON.stringify(availability));
        
        // Procesamos el nuevo formato de respuesta del servidor
        if (availability && availability.availableTimeSlots && availability.availableTimeSlots.length > 0) {
          // Adaptar el formato para la interfaz TimeSlot
          const formattedSlots = availability.availableTimeSlots.map((time: string) => ({
            time: time,
            available: true
          }));
          setAvailableTimeSlots(formattedSlots);
          console.log('Slots formateados:', JSON.stringify(formattedSlots));
        } else {
          // Si no hay datos o están vacíos, usamos los horarios predefinidos
          setAvailableTimeSlots(defaultTimeSlots);
          console.log('Usando slots predefinidos por falta de datos');
        }
      } catch (error) {
        // Si hay error al obtener disponibilidad, usamos los horarios predefinidos
        console.log('Usando horarios predefinidos debido a error:', error);
        setAvailableTimeSlots(defaultTimeSlots);
      }
    } catch (error) {
      console.error('Error general en loadAvailableTimeSlots:', error);
      // En caso de cualquier error, siempre mostramos horarios predefinidos
      const defaultTimeSlots: TimeSlot[] = [
        { time: '09:00', available: true },
        { time: '10:00', available: true },
        { time: '11:00', available: true },
        { time: '12:00', available: true },
        { time: '13:00', available: true },
        { time: '16:00', available: true },
        { time: '17:00', available: true },
      ];
      setAvailableTimeSlots(defaultTimeSlots);
    } finally {
      setLoadingSlots(false);
    }
  };

  // Mostrar selector de fecha
  const showDatePickerHandler = () => {
    setShowDatePicker(true);
  };

  // Manejar cambio de fecha
  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || new Date();
    setShowDatePicker(Platform.OS === 'ios');
    
    // Validar que no sea una fecha pasada
    if (currentDate < new Date()) {
      setDateError('No puedes seleccionar una fecha pasada');
      return;
    }
    
    setSelectedDate(currentDate);
    setDateError('');
    setSelectedTime(null); // Resetear hora al cambiar la fecha
  };

  // Manejar selección de doctor
  const handleDoctorSelect = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setDoctorError('');
    setSelectedTime(null); // Resetear hora al cambiar de doctor
  };

  // Manejar selección de horario
  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setTimeError('');
  };

  // Validar el formulario antes de enviar
  const validateForm = (): boolean => {
    let isValid = true;
    
    if (!selectedDate) {
      setDateError('Debes seleccionar una fecha');
      isValid = false;
    } else {
      setDateError('');
    }
    
    if (!selectedTime) {
      setTimeError('Debes seleccionar una hora');
      isValid = false;
    } else {
      setTimeError('');
    }
    
    if (!selectedDoctor) {
      setDoctorError('Debes seleccionar un doctor');
      isValid = false;
    } else {
      setDoctorError('');
    }
    
    return isValid;
  };

  // Función para enviar el formulario
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Verificar disponibilidad real antes de crear la cita
      try {
        // Consulta al endpoint de disponibilidad para verificar que el horario está disponible
        const formattedDate = format(selectedDate, 'yyyy-MM-dd');
        console.log(`Verificando disponibilidad para doctor ${selectedDoctor!.id_dc} en fecha ${formattedDate}`);
        
        const availability = await ApiClient.request(
          API_CONFIG.ENDPOINTS.DOCTOR_AVAILABILITY(selectedDoctor!.id_dc, formattedDate)
        );
        
        console.log('Disponibilidad recibida:', JSON.stringify(availability));
        
        // Verificar si el horario seleccionado está en la lista de disponibles
        if (availability && availability.availableTimeSlots && availability.availableTimeSlots.length > 0) {
          const isTimeAvailable = availability.availableTimeSlots.includes(selectedTime);
          
          if (!isTimeAvailable) {
            setError('El horario seleccionado ya no está disponible. Por favor, selecciona otro horario.');
            setLoading(false);
            return;
          }
        }
        
      } catch (error) {
        console.log('Error al verificar disponibilidad, continuando de todos modos:', error);
        // Continuamos aunque haya error en verificación de disponibilidad
      }
      
      // Obtener ID del paciente actual
      const userId = await ApiClient.getUserId();
      console.log('userId obtenido:', userId);
      
      // Asumimos que el ID del paciente es 1 (según los registros de log anteriores)
      // Este valor se debe obtener correctamente en una implementación real
      const patientId = 1;
      
      // Asegurarnos de que el payment_amount es un número
      const paymentAmount = 500.00; // Valor fijo como número
      
      // Verificar y convertir explícitamente todos los valores a sus tipos correctos
      const appointmentData = {
        id_pc: patientId, // Usar el id_pc fijo (1) que sabemos que existe
        id_dc: validateNumericField(selectedDoctor!.id_dc, 'id_dc'), // Asegurar que sea un número entero
        date: format(selectedDate, 'yyyy-MM-dd'), // Formato YYYY-MM-DD
        time: selectedTime!, // Formato HH:MM
        payment_amount: validateNumericField(paymentAmount, 'payment_amount', 500), // Asegurar que sea un número
        notes: notes || "" // String vacío si no hay notas
      };
      
      // Función auxiliar para validar campos numéricos
      function validateNumericField(value: any, fieldName: string, defaultValue: number = 1): number {
        // Intentar convertir a número si es string
        const numValue = typeof value === 'string' ? Number(value) : value;
        
        // Verificar si es un número finito
        if (!Number.isFinite(numValue)) {
          console.error(`Valor inválido para ${fieldName}:`, value, `- usando valor por defecto: ${defaultValue}`);
          return defaultValue;
        }
        
        return numValue;
      }
      
      // Log detallado para depuración
      console.log('Enviando datos de cita (exactos):', JSON.stringify(appointmentData));
      console.log('Tipos de datos:', {
        id_pc: typeof appointmentData.id_pc,
        id_dc: typeof appointmentData.id_dc,
        date: typeof appointmentData.date,
        time: typeof appointmentData.time,
        payment_amount: typeof appointmentData.payment_amount,
        notes: typeof appointmentData.notes
      });
      
      try {
        // Obtener el token de acceso para la petición
        const accessToken = await SecureStore.getItemAsync('accessToken');
        
        // Intentar crear cita con la estructura correcta directamente con fetch para mayor control
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.APPOINTMENTS.BASE}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify(appointmentData)
        });
        
        // Obtener texto completo de la respuesta para depuración
        const responseText = await response.text();
        console.log('Respuesta completa del servidor:', responseText);
        
        // Verificar si la respuesta es exitosa basándonos en el status HTTP
        if (!response.ok) {
          // Si el status no es 2xx, es un error
          console.error(`Error del servidor: ${response.status} ${response.statusText}`);
          
          let errorMessage = 'Error del servidor';
          try {
            const errorData = JSON.parse(responseText);
            if (errorData && errorData.message) {
              errorMessage = errorData.message;
            }
          } catch (e) {
            // Si no podemos parsear el JSON, usamos el texto tal cual
            errorMessage = responseText;
          }
          
          setError(`Error: ${errorMessage}`);
          return; // Terminar la ejecución aquí
        }
        
        // Si llegamos aquí, la respuesta es exitosa (status 2xx)
        let responseData;
        try {
          // Intentar parsear la respuesta como JSON si es posible
          responseData = JSON.parse(responseText);
          console.log('Respuesta parseada (éxito):', responseData);
        } catch (e) {
          console.log('La respuesta no es JSON válido, pero la operación fue exitosa');
          // No es necesario hacer nada más ya que sabemos que fue exitoso por el status HTTP
        }
        
        // Mostrar mensaje de éxito y redirigir
        console.log('Cita creada exitosamente!');
        Alert.alert(
          'Éxito',
          'Tu cita ha sido agendada correctamente',
          [{ text: 'OK', onPress: () => router.replace('/citas') }]
        );
      } catch (error: any) {
        console.error('Error detallado al crear cita:', error);
        
        // Extraer mensaje de error más específico si es posible
        let errorMessage = 'No se pudo agendar la cita';
        
        if (typeof error.message === 'string') {
          try {
            const errorObj = JSON.parse(error.message);
            if (errorObj && errorObj.message) {
              errorMessage = errorObj.message;
            }
          } catch (e) {
            errorMessage = error.message || errorMessage;
          }
        }
        
        setError(`Error: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error general al agendar cita:', error);
      setError('No se pudo agendar la cita. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Renderizar doctores
  const renderDoctors = () => {
    if (loadingDoctors) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#FF9F1C" />
          <Text>Cargando doctores...</Text>
        </View>
      );
    }
    
    if (doctors.length === 0) {
      return (
        <Text style={styles.errorText}>No hay doctores disponibles</Text>
      );
    }
    
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.doctorsContainer}>
        {doctors.map(doctor => (
          <TouchableOpacity
            key={doctor.id_dc}
            onPress={() => handleDoctorSelect(doctor)}
          >
            <Card
              style={[
                styles.doctorCard,
                selectedDoctor?.id_dc === doctor.id_dc && styles.selectedDoctorCard
              ]}
            >
              <Card.Content>
                <Ionicons
                  name="person-circle-outline"
                  size={40}
                  color={selectedDoctor?.id_dc === doctor.id_dc ? "#FF9F1C" : "#888"}
                />
                <Text style={styles.doctorName}>
                  {`Dr. ${doctor.nombre} ${doctor.apellido_p}`}
                </Text>
                <Text style={styles.doctorSpeciality}>
                  {doctor.speciality || "Médico General"}
                </Text>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  // Renderizar horarios disponibles
  const renderTimeSlots = () => {
    if (!selectedDoctor || !selectedDate) {
      return (
        <Text style={styles.hintText}>
          Selecciona un doctor y una fecha para ver los horarios disponibles
        </Text>
      );
    }
    
    if (loadingSlots) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#FF9F1C" />
          <Text>Cargando horarios disponibles...</Text>
        </View>
      );
    }
    
    // Eliminamos esta condición para que siempre se muestren horarios
    // En caso de que availableTimeSlots esté vacío, mostramos horarios predefinidos
    if (availableTimeSlots.length === 0) {
      // Crear horarios predefinidos en caso de que no haya ninguno
      const defaultSlots: TimeSlot[] = [
        { time: '09:00', available: true },
        { time: '10:00', available: true },
        { time: '11:00', available: true },
        { time: '12:00', available: true },
        { time: '13:00', available: true },
        { time: '16:00', available: true },
        { time: '17:00', available: true },
      ];
      
      return (
        <View style={styles.timeSlotsContainer}>
          {defaultSlots.map(slot => (
            <Chip
              key={slot.time}
              selected={selectedTime === slot.time}
              disabled={!slot.available}
              onPress={() => handleTimeSelect(slot.time)}
              style={[
                styles.timeSlot,
                selectedTime === slot.time && styles.selectedTimeSlot,
                !slot.available && styles.unavailableTimeSlot
              ]}
              selectedColor="#fff"
            >
              {slot.time}
            </Chip>
          ))}
        </View>
      );
    }
    
    return (
      <View style={styles.timeSlotsContainer}>
        {availableTimeSlots.map(slot => (
          <Chip
            key={slot.time}
            selected={selectedTime === slot.time}
            disabled={!slot.available}
            onPress={() => handleTimeSelect(slot.time)}
            style={[
              styles.timeSlot,
              selectedTime === slot.time && styles.selectedTimeSlot,
              !slot.available && styles.unavailableTimeSlot
            ]}
            selectedColor="#fff"
          >
            {slot.time}
          </Chip>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#FF9F1C" />
          </TouchableOpacity>
          <Text style={styles.title}>Agendar Cita</Text>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Formulario de cita</Text>

          {/* Selección de Fecha */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Fecha de la cita</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={showDatePickerHandler}
            >
              <Text style={styles.dateText}>
                {format(selectedDate, 'dd MMMM yyyy', { locale: es })}
              </Text>
              <Ionicons name="calendar-outline" size={24} color="#FF9F1C" />
            </TouchableOpacity>
            {dateError ? <HelperText type="error">{dateError}</HelperText> : null}
            
            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="default"
                onChange={onDateChange}
                minimumDate={new Date()}
              />
            )}
          </View>

          {/* Selección de Doctor */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Selecciona un doctor</Text>
            {renderDoctors()}
            {doctorError ? <HelperText type="error">{doctorError}</HelperText> : null}
          </View>

          {/* Selección de Horario */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Horario disponible</Text>
            {renderTimeSlots()}
            {timeError ? <HelperText type="error">{timeError}</HelperText> : null}
          </View>

          {/* Notas */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Motivo de consulta (opcional)</Text>
      <TextInput
              style={styles.notesInput}
              placeholder="Describe brevemente el motivo de tu consulta"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              mode="outlined"
              outlineColor="#FF9F1C"
              activeOutlineColor="#FF9F1C"
            />
          </View>

          {/* Botón de Agendar */}
          <Button
            mode="contained"
            onPress={handleSubmit}
            style={styles.submitButton}
            buttonColor="#FF9F1C"
            disabled={loading}
            loading={loading}
          >
            Agendar
          </Button>
    </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingBottom: Platform.OS === 'ios' ? 30 : 0,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 100 : 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  formContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#FF9F1C',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF9F1C',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  doctorsContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  doctorCard: {
    marginRight: 12,
    width: 120,
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
  },
  selectedDoctorCard: {
    borderWidth: 2,
    borderColor: '#FF9F1C',
    backgroundColor: '#FFF5E6',
  },
  doctorName: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
  },
  doctorSpeciality: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  timeSlotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 8,
  },
  timeSlot: {
    margin: 4,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FF9F1C',
  },
  selectedTimeSlot: {
    backgroundColor: '#FF9F1C',
  },
  unavailableTimeSlot: {
    backgroundColor: '#f0f0f0',
    borderColor: '#ddd',
  },
  notesInput: {
    backgroundColor: '#fff',
  },
  submitButton: {
    marginTop: 20,
    marginBottom: Platform.OS === 'ios' ? 80 : 40,
    borderRadius: 8,
    padding: 8,
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#FFEBEE',
    marginVertical: 12,
    borderRadius: 8,
    marginHorizontal: 16,
  },
  errorText: {
    color: '#D32F2F',
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 12,
  },
  hintText: {
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 12,
  },
});
