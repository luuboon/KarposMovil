import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button, Card, Divider, Icon, Chip } from '@rneui/themed';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppointmentService from '../../lib/services/appointments';
import PatientService from '../../lib/services/patients';
import IoTService from '../../lib/services/iot';
import IoTDeviceControl from '../components/IoTDeviceControl';
import IoTDataVisualizer from '../components/IoTDataVisualizer';
import Colors from '../../constants/Colors';

export default function DetallesCitaScreen() {
  const { id } = useLocalSearchParams();
  const [cita, setCita] = useState(null);
  const [paciente, setPaciente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [iotDevices, setIotDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showIoTData, setShowIoTData] = useState(false);
  const router = useRouter();

  const getUserRole = async () => {
    try {
      const role = await AsyncStorage.getItem('userRole');
      setUserRole(role);
      return role;
    } catch (error) {
      console.error('Error al obtener rol de usuario:', error);
      return null;
    }
  };

  const loadCitaData = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const citaId = typeof id === 'string' ? parseInt(id, 10) : id;
      console.log(`Cargando detalles de cita ID: ${citaId}`);
      
      const citaData = await AppointmentService.getAppointmentById(citaId);
      console.log('Datos de cita cargados:', JSON.stringify(citaData));
      
      if (citaData) {
        // Procesar la respuesta para asegurar la estructura esperada
        const processedData = procesarDatosCita(citaData);
        setCita(processedData);
        
        // Si el usuario es doctor, cargar datos del paciente
        const role = await getUserRole();
        if (role === 'doctor' && processedData.id_pc) {
          try {
            let pacienteData = null;
            
            // Si ya tenemos los datos del paciente en la respuesta, usarlos
            if (processedData.patient) {
              pacienteData = processedData.patient;
            } else {
              // Si no, cargarlos desde la API
              pacienteData = await PatientService.getPatientById(processedData.id_pc);
            }
            
            console.log('Datos del paciente:', JSON.stringify(pacienteData));
            setPaciente(pacienteData);
            
            // Cargar dispositivos IoT asociados al paciente
            if (pacienteData) {
              const devices = await IoTService.getDevicesByPatient(pacienteData.id_pc);
              setIotDevices(devices);
              
              // Seleccionar el primer dispositivo por defecto si hay alguno
              if (devices && devices.length > 0) {
                setSelectedDevice(devices[0].id);
              }
            }
          } catch (err) {
            console.error('Error al cargar datos del paciente:', err);
          }
        }
      } else {
        setError('No se pudo cargar la información de la cita');
      }
    } catch (err) {
      console.error('Error al cargar detalles de la cita:', err);
      setError('Error al cargar la información de la cita');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Procesar datos de la cita para manejar diferentes formatos de respuesta
  const procesarDatosCita = (data) => {
    // Si los datos vienen dentro de la propiedad 'appointment', extraerlos
    if (data.appointment) {
      return {
        ...data.appointment,
        patient: data.patient
      };
    }
    // De lo contrario, devolver los datos como están
    return data;
  };

  useEffect(() => {
    loadCitaData();
  }, [loadCitaData]);

  const formatearFecha = (dateString) => {
    try {
      if (!dateString) return 'Fecha no disponible';
      
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Fecha inválida';
      
      return format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
    } catch (error) {
      console.error('Error al formatear fecha:', error);
      return 'Error en fecha';
    }
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

  const handleCancelarCita = () => {
    Alert.alert(
      'Cancelar Cita',
      '¿Estás seguro que deseas cancelar esta cita?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Sí, Cancelar', 
          style: 'destructive',
          onPress: async () => {
            // Aquí iría la lógica para cancelar la cita
            Alert.alert('Cita Cancelada', 'La cita ha sido cancelada con éxito');
            router.back();
          } 
        }
      ]
    );
  };

  const handleCreateExpediente = () => {
    if (cita && paciente) {
      // Navegar a la pantalla de creación de expediente médico
      router.push({
        pathname: `/expedientes/crear`,
        params: { 
          citaId: cita.id_ap,
          pacienteId: paciente.id_pc,
          pacienteNombre: `${paciente.nombre} ${paciente.apellido_p}` 
        }
      });
    }
  };

  const handleIoTDeviceSelect = (deviceId) => {
    setSelectedDevice(deviceId);
    setShowIoTData(true);
  };

  const handleDataReceived = (data) => {
    console.log('Nueva lectura recibida:', data);
    // Aquí puedes implementar lógica adicional cuando se recibe una nueva lectura
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
        <Text style={styles.loadingText}>Cargando detalles de la cita...</Text>
      </View>
    );
  }

  if (error || !cita) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'No se pudo cargar la cita'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadCitaData}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card containerStyle={styles.cardContainer}>
        <Card.Title h4 style={styles.cardTitle}>
          Detalles de la Cita
        </Card.Title>
        
        <View style={styles.dateContainer}>
          <Text style={styles.dateText}>{formatearFecha(cita.date)}</Text>
          <Text style={styles.timeText}>Hora: {cita.time}</Text>
          {getStatusChip(cita.status)}
        </View>
        
        <Divider style={styles.divider} />
        
        {userRole === 'doctor' && paciente ? (
          <View style={styles.patientContainer}>
            <Text style={styles.sectionTitle}>Datos del Paciente</Text>
            
            <View style={styles.patientInfo}>
              <Text style={styles.patientName}>
                {paciente.nombre} {paciente.apellido_p} {paciente.apellido_m}
              </Text>
              <Text style={styles.patientDetail}>
                <Text style={styles.labelText}>ID: </Text>
                {paciente.id_pc}
              </Text>
              {paciente.fecha_nacimiento && (
                <Text style={styles.patientDetail}>
                  <Text style={styles.labelText}>Fecha de Nacimiento: </Text>
                  {formatearFecha(paciente.fecha_nacimiento)}
                </Text>
              )}
              {paciente.telefono && (
                <Text style={styles.patientDetail}>
                  <Text style={styles.labelText}>Teléfono: </Text>
                  {paciente.telefono}
                </Text>
              )}
              {paciente.email && (
                <Text style={styles.patientDetail}>
                  <Text style={styles.labelText}>Email: </Text>
                  {paciente.email}
                </Text>
              )}
            </View>
            
            {iotDevices.length > 0 && (
              <View style={styles.iotSection}>
                <Text style={styles.sectionTitle}>Dispositivos IoT</Text>
                
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.devicesScroll}>
                  {iotDevices.map((device) => (
                    <TouchableOpacity 
                      key={device.id}
                      style={[
                        styles.deviceItem,
                        selectedDevice === device.id && styles.selectedDeviceItem
                      ]}
                      onPress={() => handleIoTDeviceSelect(device.id)}
                    >
                      <Icon 
                        name={device.type === 'ecg' ? 'pulse' : 
                             device.type === 'oximeter' ? 'fitness' :
                             device.type === 'glucose' ? 'water' : 'hardware-chip'} 
                        type="ionicon" 
                        size={20} 
                        color={selectedDevice === device.id ? '#fff' : Colors.light.tint}
                      />
                      <Text style={[
                        styles.deviceName,
                        selectedDevice === device.id && styles.selectedDeviceName
                      ]}>
                        {device.name}
                      </Text>
                      <View style={[
                        styles.statusDot, 
                        { backgroundColor: device.status === 'online' ? '#4CAF50' : '#9E9E9E' }
                      ]} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                
                {selectedDevice && (
                  <View style={styles.iotControlsContainer}>
                    <IoTDeviceControl 
                      deviceId={selectedDevice} 
                      onDataReceived={handleDataReceived} 
                    />
                    
                    {showIoTData && (
                      <IoTDataVisualizer 
                        deviceId={selectedDevice}
                        readingLimit={10}
                      />
                    )}
                  </View>
                )}
              </View>
            )}
            
            <View style={styles.notesContainer}>
              {cita.notes ? (
                <>
                  <Text style={styles.sectionTitle}>Notas</Text>
                  <Text style={styles.notesText}>{cita.notes}</Text>
                </>
              ) : (
                <Text style={styles.noNotesText}>No hay notas para esta cita</Text>
              )}
            </View>
            
            <View style={styles.buttonsContainer}>
              <Button
                title="Crear Expediente"
                icon={<Icon name="file-medical" type="font-awesome-5" color="white" size={16} style={styles.buttonIcon} />}
                buttonStyle={styles.createExpedienteButton}
                onPress={handleCreateExpediente}
              />
            </View>
          </View>
        ) : (
          <View style={styles.patientView}>
            <Text style={styles.sectionTitle}>Detalles</Text>
            
            {cita.doctor && (
              <View style={styles.doctorInfo}>
                <Text style={styles.infoLabel}>Doctor:</Text>
                <Text style={styles.infoValue}>
                  {cita.doctor.nombre} {cita.doctor.apellido_p}
                </Text>
              </View>
            )}
            
            {cita.especialidad && (
              <View style={styles.doctorInfo}>
                <Text style={styles.infoLabel}>Especialidad:</Text>
                <Text style={styles.infoValue}>{cita.especialidad}</Text>
              </View>
            )}
            
            {cita.consultorio && (
              <View style={styles.doctorInfo}>
                <Text style={styles.infoLabel}>Consultorio:</Text>
                <Text style={styles.infoValue}>{cita.consultorio}</Text>
              </View>
            )}
            
            {cita.notes && (
              <View style={styles.notesContainer}>
                <Text style={styles.sectionTitle}>Notas</Text>
                <Text style={styles.notesText}>{cita.notes}</Text>
              </View>
            )}
            
            <View style={styles.buttonsContainer}>
              <Button
                title="Cancelar Cita"
                icon={<Icon name="close-circle-outline" type="ionicon" color="white" size={18} style={styles.buttonIcon} />}
                buttonStyle={styles.cancelButton}
                onPress={handleCancelarCita}
                disabled={['completed', 'cancelled'].includes(cita.status?.toLowerCase())}
              />
            </View>
          </View>
        )}
      </Card>
    </ScrollView>
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
  cardContainer: {
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    color: Colors.light.tint,
    marginBottom: 8,
    textAlign: 'center',
  },
  dateContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  timeText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 8,
  },
  chipContainer: {
    marginTop: 8,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    marginVertical: 16,
    height: 1.5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  patientContainer: {
    marginBottom: 16,
  },
  patientInfo: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  patientDetail: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  labelText: {
    fontWeight: '600',
    color: '#444',
  },
  notesContainer: {
    marginVertical: 16,
  },
  notesText: {
    fontSize: 14,
    color: '#555',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.tint,
  },
  noNotesText: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 12,
  },
  buttonsContainer: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  createExpedienteButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  patientView: {
    marginBottom: 16,
  },
  doctorInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f9f9f9',
    marginBottom: 8,
    borderRadius: 6,
  },
  infoLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#444',
  },
  infoValue: {
    fontSize: 15,
    color: '#333',
  },
  iotSection: {
    marginVertical: 16,
  },
  devicesScroll: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedDeviceItem: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  deviceName: {
    fontSize: 14,
    marginHorizontal: 8,
    color: '#333',
  },
  selectedDeviceName: {
    color: 'white',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 4,
  },
  iotControlsContainer: {
    marginTop: 8,
  },
}); 