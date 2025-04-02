import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Chip } from '@rneui/themed';
import AppointmentService from '../../lib/services/appointments';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../../constants/Colors';

export default function CitasScreen() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);
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
      
      let citasData = [];
      
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

  const navigateToCitaDetails = (id) => {
    router.push(`/citas/${id}`);
  };

  const getStatusChip = (status) => {
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

  const formatDate = (dateString) => {
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

  const renderAppointmentItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.appointmentCard}
      onPress={() => navigateToCitaDetails(item.id_ap)}
    >
      <View style={styles.appointmentHeader}>
        <Text style={styles.dateText}>{formatDate(item.date)}</Text>
        {getStatusChip(item.status)}
      </View>
      
      <View style={styles.appointmentDetails}>
        <Text style={styles.timeText}>Hora: {item.time}</Text>
        
        {userRole === 'doctor' && item.patient && (
          <Text style={styles.patientText}>
            Paciente: {item.patient.name || 'No disponible'}
          </Text>
        )}
        
        {userRole === 'patient' && item.doctor && (
          <Text style={styles.doctorText}>
            Doctor: {item.doctor.name || 'No disponible'}
          </Text>
        )}
      </View>
    </TouchableOpacity>
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
        keyExtractor={(item) => item.id_ap.toString()}
        renderItem={renderAppointmentItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
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
});
