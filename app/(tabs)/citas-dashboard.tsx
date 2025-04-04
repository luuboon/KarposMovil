import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chip } from 'react-native-paper';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DoctorService } from '../../lib/services/doctors';
import { AppointmentService, Appointment } from '../../lib/services/appointments';
import { router } from 'expo-router';

// Interfaz para manejar el formato específico de la respuesta de la API
interface ApiAppointmentResponse {
  appointment: {
    id_ap: number;
    id_pc: number;
    id_dc: number;
    date: string;
    time: string;
    status: string;
    payment_status: string;
    payment_amount: number;
    notes: string;
    created_at: string;
    updated_at: string;
    consultorio?: string;
  };
  patient: {
    id: number;
    nombre: string;
    apellido_p: string;
    apellido_m: string;
  };
}

// Estados permitidos por la base de datos
const ESTADOS_PERMITIDOS = {
  PENDIENTE: 'pending',
  COMPLETADO: 'completed',
  CANCELADO: 'cancelled'
};

export default function CitasDashboardScreen() {
  // Estados
  const [activeTab, setActiveTab] = useState<'misCitas' | 'solicitudes'>('misCitas');
  const [misCitas, setMisCitas] = useState<ApiAppointmentResponse[]>([]);
  const [solicitudes, setSolicitudes] = useState<ApiAppointmentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar datos
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Cargando citas del doctor...');
      
      // Obtener todas las citas del doctor (API raw)
      const response = await DoctorService.getUpcomingAppointmentsRaw();
      console.log(`Se encontraron ${response.length} citas en total`);
      
      // Verificar que la respuesta sea un array
      if (!Array.isArray(response)) {
        console.error('La respuesta de la API no es un array:', response);
        setError('Formato de respuesta inválido');
        setLoading(false);
        return;
      }

      // En esta plataforma, consideramos:
      // - Mis Citas: Citas con estado COMPLETADO
      // - Solicitudes: Citas con estado PENDIENTE
      
      // Filtrar citas en estado completed para "Mis Citas" 
      const citasAceptadas = response.filter(cita => 
        cita.appointment?.status?.toLowerCase() === ESTADOS_PERMITIDOS.COMPLETADO
      );
      
      // Filtrar citas en estado pending para "Solicitudes"
      const citasPendientes = response.filter(cita => 
        cita.appointment?.status?.toLowerCase() === ESTADOS_PERMITIDOS.PENDIENTE
      );
      
      console.log(`Citas aceptadas: ${citasAceptadas.length}, Solicitudes pendientes: ${citasPendientes.length}`);
      
      // Ordenar por fecha (más próximas primero)
      const sortByDate = (a: ApiAppointmentResponse, b: ApiAppointmentResponse) => {
        const dateA = new Date(`${a.appointment?.date || '2099-01-01'}T${a.appointment?.time || '00:00'}`);
        const dateB = new Date(`${b.appointment?.date || '2099-01-01'}T${b.appointment?.time || '00:00'}`);
        return dateA.getTime() - dateB.getTime();
      };
      
      setMisCitas(citasAceptadas.sort(sortByDate));
      setSolicitudes(citasPendientes.sort(sortByDate));
      
    } catch (error) {
      console.error('Error al cargar citas:', error);
      setError('No se pudieron cargar los datos. Intenta nuevamente.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Cargar datos al iniciar
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Función para refrescar datos
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // Función para formatear fecha
  const formatFecha = (date?: string, time?: string) => {
    if (!date) return 'Fecha no disponible';
    
    try {
      const dateObj = new Date(`${date}T${time || '00:00'}`);
      return format(dateObj, "d 'de' MMMM, yyyy - HH:mm", { locale: es });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  // Función para obtener el lugar de la cita
  const getLugar = (cita: ApiAppointmentResponse) => {
    if (cita.appointment?.consultorio) {
      return `Consultorio ${cita.appointment.consultorio}`;
    }
    return 'Lugar no especificado';
  };

  // Función para manejar edición de cita
  const handleEditarCita = (citaId: number) => {
    router.push(`/citas/${citaId}`);
  };

  // Función para aceptar una solicitud (cambiamos a 'completed' en lugar de 'scheduled')
  const handleAceptarSolicitud = async (citaId: number) => {
    try {
      setLoading(true);
      
      // En este caso, aceptar significa marcar como completada en el backend
      await AppointmentService.updateAppointmentStatus(citaId, ESTADOS_PERMITIDOS.COMPLETADO);
      
      console.log(`Cita ${citaId} aceptada correctamente`);
      Alert.alert('Éxito', 'La cita ha sido aceptada correctamente');
      loadData(); // Recargar datos
    } catch (error) {
      console.error('Error al aceptar cita:', error);
      setError('No se pudo aceptar la cita. Intenta nuevamente.');
      setLoading(false);
    }
  };

  // Función para rechazar una solicitud
  const handleRechazarSolicitud = async (citaId: number) => {
    try {
      setLoading(true);
      await AppointmentService.updateAppointmentStatus(citaId, ESTADOS_PERMITIDOS.CANCELADO);
      console.log(`Cita ${citaId} rechazada correctamente`);
      Alert.alert('Éxito', 'La cita ha sido rechazada correctamente');
      loadData(); // Recargar datos
    } catch (error) {
      console.error('Error al rechazar cita:', error);
      setError('No se pudo rechazar la cita. Intenta nuevamente.');
      setLoading(false);
    }
  };

  // Renderizar item de cita
  const renderCitaItem = ({ item }: { item: ApiAppointmentResponse }) => (
    <View style={styles.citaItem}>
      <View style={styles.citaInfo}>
        <Text style={styles.fechaHoraLugar}>
          {formatFecha(item.appointment?.date, item.appointment?.time)}
        </Text>
        <Text style={styles.lugarCita}>
          {getLugar(item)}
        </Text>
        <Text style={styles.nombrePaciente}>
          {item.patient 
            ? `${item.patient.nombre || ''} ${item.patient.apellido_p || ''}`.trim()
            : `Paciente ID: ${item.appointment?.id_pc || 'No disponible'}`}
        </Text>
        {item.appointment?.notes && (
          <Text style={styles.notaCita} numberOfLines={1} ellipsizeMode="tail">
            Nota: {item.appointment.notes}
          </Text>
        )}
      </View>
      
      {activeTab === 'misCitas' ? (
        <TouchableOpacity 
          style={[styles.botonAccion, styles.botonEditar]}
          onPress={() => handleEditarCita(item.appointment?.id_ap || 0)}
        >
          <Text style={styles.botonTexto}>Editar</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.botonesAccionesContainer}>
          <TouchableOpacity 
            style={[styles.botonAccion, styles.botonAceptar]}
            onPress={() => item.appointment?.id_ap && handleAceptarSolicitud(item.appointment.id_ap)}
          >
            <Text style={styles.botonTexto}>Aceptar</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.botonAccion, styles.botonRechazar]}
            onPress={() => item.appointment?.id_ap && handleRechazarSolicitud(item.appointment.id_ap)}
          >
            <Text style={styles.botonTexto}>Rechazar</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // Renderizar mensaje si no hay citas
  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        {activeTab === 'misCitas' 
          ? 'No tienes citas aceptadas' 
          : 'No hay solicitudes pendientes'}
      </Text>
    </View>
  );

  // Renderizar contenido de pestaña activa
  const renderActiveTabContent = () => {
    const data = activeTab === 'misCitas' ? misCitas : solicitudes;
    
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      );
    }
    
    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return (
      <FlatList
        data={data}
        renderItem={renderCitaItem}
        keyExtractor={(item) => `${item.appointment?.id_ap || Math.random()}`}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Tabs de navegación */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'misCitas' && styles.activeTab]} 
          onPress={() => setActiveTab('misCitas')}
        >
          <Text style={[styles.tabText, activeTab === 'misCitas' && styles.activeTabText]}>
            Mis citas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'solicitudes' && styles.activeTab]} 
          onPress={() => setActiveTab('solicitudes')}
        >
          <Text style={[styles.tabText, activeTab === 'solicitudes' && styles.activeTabText]}>
            Solicitudes
          </Text>
        </TouchableOpacity>
      </View>

      {/* Contenido */}
      {renderActiveTabContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: 'white',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#2E7D32',
  },
  tabText: {
    fontSize: 16,
    color: '#757575',
  },
  activeTabText: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 16,
    color: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  citaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  citaInfo: {
    flex: 1,
    marginRight: 12,
  },
  fechaHoraLugar: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  lugarCita: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  nombrePaciente: {
    fontSize: 14,
    color: '#555',
    marginBottom: 2,
    fontWeight: '500',
  },
  notaCita: {
    fontSize: 13,
    color: '#777',
    marginTop: 2,
  },
  botonAccion: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  botonEditar: {
    backgroundColor: '#FF9F1C',
  },
  botonAceptar: {
    backgroundColor: '#4CAF50',
  },
  botonTexto: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#757575',
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
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 200,
  },
  emptyText: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  botonRechazar: {
    backgroundColor: '#dc3545',
  },
  botonesAccionesContainer: {
    alignItems: 'center',
    gap: 8,
  },
}); 