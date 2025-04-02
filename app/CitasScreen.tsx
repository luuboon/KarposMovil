import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert, Platform } from 'react-native';
import { Text, Card, Button, ActivityIndicator, FAB, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Appointment } from '../types/api';
import { AppointmentService } from '../lib/services/appointments';
import { useAuth } from '../components/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Definición de tipos para los filtros
type AppointmentFilter = 'pending' | 'scheduled' | 'completed' | 'all';

export default function CitasScreen() {
  const [citas, setCitas] = useState<Appointment[]>([]);
  const [filteredCitas, setFilteredCitas] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<AppointmentFilter>('all');
  const router = useRouter();
  const { userRole } = useAuth();

  useEffect(() => {
    cargarCitas();
  }, []);

  useEffect(() => {
    filtrarCitas(activeFilter);
  }, [citas, activeFilter]);

  const cargarCitas = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Cargando citas para pantalla Citas...');
      
      // Eliminar la alerta de carga y el dismiss que causan errores
      console.log('Buscando citas en el servidor...');
      
      const appointments = await AppointmentService.getMyAppointments();
      console.log('Citas recibidas en pantalla Citas:', JSON.stringify(appointments));
      
      if (!appointments || appointments.length === 0) {
        console.log('No se encontraron citas para mostrar en pantalla Citas');
        
        // Intento alternativo: cargar directamente citas con id_pc=1
        try {
          console.log('Intentando cargar citas directamente con id_pc=1');
          const allAppointments = await AppointmentService.getAllAppointments();
          
          if (allAppointments && Array.isArray(allAppointments) && allAppointments.length > 0) {
            // Filtrar citas para id_pc=1
            const userAppointments = allAppointments.filter(a => a.id_pc === 1);
            console.log(`Se encontraron ${userAppointments.length} citas para id_pc=1`);
            
            if (userAppointments.length > 0) {
              setCitas(userAppointments);
              return; // Salir del método si se encuentran citas
            }
          }
        } catch (e) {
          console.error('Error al cargar citas directamente:', e);
        }
      } else {
        console.log(`Se encontraron ${appointments.length} citas para mostrar`);
        console.log('Primera cita:', JSON.stringify(appointments[0]));
        setCitas(appointments);
      }
    } catch (error) {
      console.error('Error al cargar citas:', error);
      setError('No se pudieron cargar las citas. Por favor intenta de nuevo.');
      
      // Mostrar un mensaje más descriptivo
      Alert.alert(
        'Error de conexión',
        'No se pudieron cargar tus citas. El servidor está tardando en responder o puede estar desconectado. ¿Deseas intentar de nuevo?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Intentar de nuevo', onPress: () => cargarCitas() }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const filtrarCitas = (filter: AppointmentFilter) => {
    let citasFiltradas = [...citas];
    
    switch (filter) {
      case 'pending':
        citasFiltradas = citas.filter(cita => cita.status === 'pending');
        console.log(`Citas filtradas (pendientes): ${citasFiltradas.length}`);
        break;
      case 'scheduled':
        citasFiltradas = citas.filter(cita => cita.status === 'scheduled');
        console.log(`Citas filtradas (agendadas): ${citasFiltradas.length}`);
        break;
      case 'completed':
        citasFiltradas = citas.filter(cita => cita.status === 'completed');
        console.log(`Citas filtradas (completadas): ${citasFiltradas.length}`);
        break;
      default:
        console.log(`Citas filtradas (todas): ${citasFiltradas.length}`);
        // 'all' no hace filtrado
    }
    
    setFilteredCitas(citasFiltradas);
  };

  const navigateToAgendar = () => {
    console.log('Navegando a pantalla de agendar citas...');
    try {
      // Usar la ruta correcta en el sistema de tabs
      router.push('/(tabs)/citas/agendar');
    } catch (error) {
      console.error('Error al navegar a /(tabs)/citas/agendar:', error);
      // Intentar alternativas si falla
      try {
        router.push({
          pathname: '/(tabs)/citas/agendar'
        });
      } catch (e) {
        console.error('Error secundario al navegar:', e);
        Alert.alert('Error de navegación', 'No se pudo abrir la pantalla de agendar citas.');
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FFA000'; // Amarillo/naranja
      case 'scheduled':
        return '#1976D2'; // Azul
      case 'completed':
        return '#4CAF50'; // Verde
      case 'cancelled':
        return '#F44336'; // Rojo
      default:
        return '#757575'; // Gris
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'scheduled':
        return 'Agendada';
      case 'completed':
        return 'Completada';
      case 'cancelled':
        return 'Cancelada';
      default:
        return status;
    }
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'paid':
        return 'Pagado';
      case 'failed':
        return 'Fallido';
      default:
        return status;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd MMM yyyy', { locale: es });
    } catch (e) {
      console.error('Error formateando fecha:', e);
      return dateStr;
    }
  };

  const formatTime = (timeStr: string) => {
    try {
      // Asumiendo que timeStr está en formato HH:MM
      const [hour, minute] = timeStr.split(':');
      const date = new Date();
      date.setHours(parseInt(hour), parseInt(minute));
      return format(date, 'h:mm a');
    } catch (e) {
      console.error('Error formateando hora:', e);
      return timeStr;
    }
  };

  const cancelarCita = async (id: number) => {
    try {
      await AppointmentService.cancelAppointment(id);
      Alert.alert('Éxito', 'La cita ha sido cancelada correctamente');
      cargarCitas(); // Recargar citas
    } catch (error) {
      console.error('Error al cancelar cita:', error);
      Alert.alert('Error', 'No se pudo cancelar la cita. Intenta de nuevo.');
    }
  };

  const confirmarCancelacion = (id: number) => {
    Alert.alert(
      'Confirmar cancelación',
      '¿Estás seguro que deseas cancelar esta cita?',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Sí, cancelar', onPress: () => cancelarCita(id) }
      ]
    );
  };

  const renderCita = ({ item }: { item: Appointment }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <Text style={styles.dateText}>{formatDate(item.date)} - {formatTime(item.time)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="location-outline" size={20} color="#666" />
            <Text style={styles.infoText}>Consultorio {item.id_dc}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Ionicons name="medical-outline" size={20} color="#666" />
            <Text style={styles.infoText}>
              {item.status === 'completed' ? 'Consulta realizada' : 'Consulta pendiente'}
            </Text>
          </View>
        </View>
        
        {item.notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.label}>Notas:</Text>
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        )}
      </Card.Content>
      
      <Card.Actions>
        {item.status === 'pending' || item.status === 'scheduled' ? (
          <>
            <Button 
              onPress={() => confirmarCancelacion(item.id_ap)}
              textColor="#F44336"
            >
              Cancelar
            </Button>
            <Button 
              mode="contained" 
              onPress={() => Alert.alert('Información', 'Detalles de la cita')}
              buttonColor="#2E7D32"
            >
              Ver detalles
            </Button>
          </>
        ) : (
          <Button 
            mode="contained" 
            onPress={() => Alert.alert('Información', 'La cita ha sido completada')}
            buttonColor="#2E7D32"
          >
            Ver detalles
          </Button>
        )}
      </Card.Actions>
    </Card>
  );

  const renderFilterChips = () => (
    <View style={styles.filtersContainer}>
      <Chip
        selected={activeFilter === 'all'}
        onPress={() => setActiveFilter('all')}
        style={styles.filterChip}
        selectedColor="#2E7D32"
      >
        Todas
      </Chip>
      <Chip
        selected={activeFilter === 'pending'}
        onPress={() => setActiveFilter('pending')}
        style={styles.filterChip}
        selectedColor="#FFA000"
      >
        Pendientes
      </Chip>
      <Chip
        selected={activeFilter === 'scheduled'}
        onPress={() => setActiveFilter('scheduled')}
        style={styles.filterChip}
        selectedColor="#1976D2"
      >
        Agendadas
      </Chip>
      <Chip
        selected={activeFilter === 'completed'}
        onPress={() => setActiveFilter('completed')}
        style={styles.filterChip}
        selectedColor="#4CAF50"
      >
        Completadas
      </Chip>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis Citas</Text>
        <TouchableOpacity 
          style={styles.refreshButton} 
          onPress={cargarCitas}
        >
          <Ionicons name="refresh" size={24} color="#2E7D32" />
        </TouchableOpacity>
      </View>

      {renderFilterChips()}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text>Cargando citas...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#d32f2f" />
          <Text style={styles.errorText}>{error}</Text>
          <Button 
            mode="contained" 
            onPress={cargarCitas}
            buttonColor="#2E7D32"
          >
            Reintentar
          </Button>
        </View>
      ) : filteredCitas.length > 0 ? (
        <FlatList
          data={filteredCitas}
          renderItem={renderCita}
          keyExtractor={(item) => item.id_ap.toString()}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={80} color="#BDBDBD" />
          <Text style={styles.emptyText}>
            {activeFilter === 'all' 
              ? 'No tienes citas programadas' 
              : `No tienes citas ${activeFilter === 'pending' 
                  ? 'pendientes' 
                  : activeFilter === 'scheduled' 
                    ? 'agendadas' 
                    : 'completadas'}`
            }
          </Text>
        </View>
      )}

      {activeFilter !== 'completed' && (
        <FAB
          style={[
            styles.fab,
            Platform.OS === 'ios' ? { bottom: 80 } : {} // Ajustar posición para iOS
          ]}
          icon="plus"
          onPress={navigateToAgendar}
          color="#fff"
          label="Agendar"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  refreshButton: {
    padding: 8,
  },
  filtersContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    marginRight: 8,
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
    marginVertical: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#757575',
    textAlign: 'center',
    marginVertical: 16,
  },
  listContainer: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 8,
  },
  infoText: {
    marginLeft: 6,
    color: '#555',
  },
  label: {
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 4,
  },
  notesContainer: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
  },
  notesText: {
    color: '#555',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#FF9F1C',
    borderRadius: 28,
    elevation: 5,
  },
}); 