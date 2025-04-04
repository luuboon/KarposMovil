import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Chip, Button } from '@rneui/themed';
import { AppointmentService, Appointment } from '../../lib/services/appointments';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../../constants/Colors';

export default function CitasScreen() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const router = useRouter();

  const getUserRole = async () => {
    try {
      const role = await AsyncStorage.getItem('userRole');
      setUserRole(role);
      return role;
    } catch (error) {
      console.error('Error al obtener el rol del usuario:', error);
      return null;
    }
  };

  const loadCitas = useCallback(async () => {
    try { 
      setError(null);
      
      // Determinar el rol del usuario
      const role = await getUserRole();
      
      let citasData: Appointment[] = [];
      
      // Cargar citas según el rol
      if (role === 'doctor') {
        citasData = await AppointmentService.getMyAppointmentsAsDoctor();
      } else {
        // Por defecto, asumimos rol de paciente
        citasData = await AppointmentService.getMyAppointments();
      }
      
      console.log(`Citas cargadas (${citasData.length}):`, JSON.stringify(citasData));
      setAppointments(citasData);
      
    } catch (error) {
      console.error('Error al cargar citas:', error);
      setError('No se pudieron cargar las citas. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCitas();
  }, [loadCitas]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCitas();
  }, [loadCitas]);

  // Función para actualizar el estado de una cita
  const handleUpdateAppointmentStatus = async (appointmentId: number, newStatus: string) => {
    try {
      setLoading(true);
      
      await AppointmentService.updateAppointmentStatus(appointmentId, newStatus);
      
      // Mostrar mensaje de éxito
      const message = newStatus === 'scheduled' 
        ? 'La cita ha sido agendada exitosamente.'
        : 'La cita ha sido marcada como completada.';
      
      Alert.alert('Éxito', message);
      
      // Recargar las citas
      loadCitas();
    } catch (error) {
      console.error(`Error al cambiar estado de cita a ${newStatus}:`, error);
      Alert.alert('Error', `No se pudo cambiar el estado de la cita a ${newStatus === 'scheduled' ? 'agendada' : 'completada'}.`);
      setLoading(false);
    }
  };

  // Función para confirmar cambio de estado a completada
  const confirmCompleteAppointment = (appointmentId: number) => {
    Alert.alert(
      'Completar Cita',
      '¿Está seguro que desea marcar esta cita como completada?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Completar',
          onPress: () => handleUpdateAppointmentStatus(appointmentId, 'completed') 
        }
      ]
    );
  };

  const navigateToCitaDetails = (id: number | undefined) => {
    if (id) {
      router.push(`/citas/${id}`);
    }
  };

  const getStatusChip = (status: string | undefined) => {
    let color = Colors.light.tint;
    let label = 'Pendiente';

    switch (status?.toLowerCase()) {
      case 'completed':
        color = 'green';
        label = 'Completada';
        break;
      case 'cancelled':
        color = 'red';
        label = 'Cancelada';
        break;
      case 'scheduled':
        color = 'orange';
        label = 'Programada';
        break;
      default:
        break;
    }

    return (
      <Chip
        title={label}
        type="solid"
        containerStyle={styles.chipContainer}
        titleStyle={styles.chipText}
        buttonStyle={{ backgroundColor: color }}
      />
    );
  };

  const formatDate = (dateString: string | undefined) => {
    try {
      if (!dateString) return 'Fecha no disponible';
      
      // Asegurarse de que dateString sea una fecha válida
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Fecha inválida';
      
      return format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
    } catch (error) {
      console.error('Error al formatear fecha:', error, dateString);
      return 'Error en fecha';
    }
  };

  const renderAppointmentItem = ({ item }: { item: Appointment }) => (
    <View style={styles.appointmentCard}>
      <TouchableOpacity 
        style={styles.appointmentHeader}
        onPress={() => navigateToCitaDetails(item.id_ap)}
      >
        <Text style={styles.dateText}>{formatDate(item.date)}</Text>
        {getStatusChip(item.status)}
      </TouchableOpacity>
      
      <View style={styles.appointmentDetails}>
        <Text style={styles.timeText}>Hora: {item.time}</Text>
        
        {userRole === 'doctor' && (
          <Text style={styles.patientText}>
            Paciente: {item.patient 
              ? `${item.patient.nombre || ''} ${item.patient.apellido_p || ''}`.trim() 
              : 'No disponible'}
          </Text>
        )}
        
        {userRole === 'patient' && item.doctor && (
          <Text style={styles.doctorText}>
            Doctor: {item.doctor.nombre 
              ? `${item.doctor.nombre || ''} ${item.doctor.apellido_p || ''}`.trim() 
              : 'No disponible'}
          </Text>
        )}
        
        {/* Botones de acción para doctor */}
        {userRole === 'doctor' && (
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity 
              style={styles.detailsButton}
              onPress={() => navigateToCitaDetails(item.id_ap)}
            >
              <Text style={styles.detailsButtonText}>Ver detalles</Text>
            </TouchableOpacity>
            
            {item.status?.toLowerCase() === 'pending' && (
              <TouchableOpacity 
                style={styles.scheduleButton}
                onPress={() => item.id_ap && handleUpdateAppointmentStatus(item.id_ap, 'scheduled')}
              >
                <Text style={styles.actionButtonText}>Agendar</Text>
              </TouchableOpacity>
            )}
            
            {item.status?.toLowerCase() === 'scheduled' && (
              <TouchableOpacity 
                style={styles.completeButton}
                onPress={() => item.id_ap && confirmCompleteAppointment(item.id_ap)}
              >
                <Text style={styles.actionButtonText}>Completar</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
        <Text style={styles.loadingText}>Cargando citas...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadCitas}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (appointments.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.noAppointmentsText}>
          No tienes citas programadas.
        </Text>
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={appointments}
        keyExtractor={(item) => item.id_ap?.toString() || Math.random().toString()}
        renderItem={renderAppointmentItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
      
      {userRole === 'doctor' && (
        <TouchableOpacity 
          style={styles.floatingButton}
          onPress={() => router.push('/citas/agendar')}
        >
          <Text style={styles.floatingButtonText}>+ Nueva Cita</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  listContent: {
    padding: 16,
  },
  appointmentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textTransform: 'capitalize',
  },
  appointmentDetails: {
    gap: 6,
  },
  timeText: {
    fontSize: 15,
    color: '#555',
  },
  patientText: {
    fontSize: 15,
    color: '#555',
  },
  doctorText: {
    fontSize: 15,
    color: '#555',
  },
  chipContainer: {
    marginLeft: 8,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#777',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  noAppointmentsText: {
    fontSize: 16,
    color: '#777',
    textAlign: 'center',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 8,
  },
  detailsButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  scheduleButton: {
    backgroundColor: '#17a2b8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  completeButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  detailsButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#2E7D32',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  floatingButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
