import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Card, Button, Icon } from '@rneui/themed';
import IoTService, { IoTDevice } from '../../lib/services/iot';

interface IoTDeviceControlProps {
  deviceId: string;
  onDataReceived?: (data: any) => void;
  minimal?: boolean;
}

export default function IoTDeviceControl({ deviceId, onDataReceived, minimal = false }: IoTDeviceControlProps) {
  const [device, setDevice] = useState<IoTDevice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isCollecting, setIsCollecting] = useState(false);

  useEffect(() => {
    loadDeviceInfo();
  }, [deviceId]);

  const loadDeviceInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const deviceData = await IoTService.getDeviceById(deviceId);
      
      if (deviceData) {
        setDevice(deviceData);
      } else {
        setError('No se pudo obtener información del dispositivo');
      }
    } catch (err) {
      console.error('Error al cargar dispositivo:', err);
      setError('Error al cargar la información del dispositivo');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      
      // Enviar comando para conectar el dispositivo
      const success = await IoTService.sendCommand(deviceId, 'connect');
      
      if (success) {
        // Actualizar el estado del dispositivo localmente
        setDevice(prev => prev ? { ...prev, status: 'online' } : null);
        Alert.alert('Conectado', `Dispositivo ${device?.name} conectado exitosamente`);
      } else {
        Alert.alert('Error', 'No se pudo conectar al dispositivo');
      }
    } catch (err) {
      console.error('Error al conectar dispositivo:', err);
      Alert.alert('Error', 'Ocurrió un error al intentar conectar el dispositivo');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsConnecting(true);
      
      // Enviar comando para desconectar el dispositivo
      const success = await IoTService.sendCommand(deviceId, 'disconnect');
      
      if (success) {
        // Actualizar el estado del dispositivo localmente
        setDevice(prev => prev ? { ...prev, status: 'offline' } : null);
        Alert.alert('Desconectado', `Dispositivo ${device?.name} desconectado exitosamente`);
      } else {
        Alert.alert('Error', 'No se pudo desconectar el dispositivo');
      }
    } catch (err) {
      console.error('Error al desconectar dispositivo:', err);
      Alert.alert('Error', 'Ocurrió un error al intentar desconectar el dispositivo');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleStartCollection = async () => {
    try {
      setIsCollecting(true);
      
      // Enviar comando para iniciar la recolección de datos
      const success = await IoTService.sendCommand(deviceId, 'startCollection');
      
      if (success) {
        Alert.alert('Iniciado', 'La recolección de datos ha comenzado');
        
        // Simular entrega de datos en entorno de desarrollo
        if (process.env.NODE_ENV === 'development' && onDataReceived) {
          const mockData = await IoTService.getDeviceReadings(deviceId, 1);
          
          if (mockData && mockData.length > 0) {
            onDataReceived(mockData[0]);
          }
        }
      } else {
        Alert.alert('Error', 'No se pudo iniciar la recolección de datos');
      }
    } catch (err) {
      console.error('Error al iniciar recolección:', err);
      Alert.alert('Error', 'Ocurrió un error al intentar iniciar la recolección de datos');
    } finally {
      setIsCollecting(false);
    }
  };

  const handleStopCollection = async () => {
    try {
      setIsCollecting(false);
      
      // Enviar comando para detener la recolección de datos
      const success = await IoTService.sendCommand(deviceId, 'stopCollection');
      
      if (success) {
        Alert.alert('Detenido', 'La recolección de datos se ha detenido');
      } else {
        Alert.alert('Error', 'No se pudo detener la recolección de datos');
      }
    } catch (err) {
      console.error('Error al detener recolección:', err);
      Alert.alert('Error', 'Ocurrió un error al intentar detener la recolección de datos');
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0066ff" />
        <Text style={styles.loaderText}>Cargando dispositivo...</Text>
      </View>
    );
  }

  if (error || !device) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || 'No se pudo cargar el dispositivo'}</Text>
        <Button
          title="Reintentar"
          onPress={loadDeviceInfo}
          buttonStyle={styles.retryButton}
        />
      </View>
    );
  }

  if (minimal) {
    return (
      <TouchableOpacity 
        style={[styles.minimalContainer, { borderColor: device.status === 'online' ? '#4CAF50' : '#9E9E9E' }]}
        onPress={device.status === 'online' ? handleStartCollection : handleConnect}
        disabled={isConnecting || isCollecting}
      >
        <Text style={styles.deviceName}>{device.name}</Text>
        <View style={styles.minimalStatusContainer}>
          <View style={[styles.statusIndicator, { backgroundColor: device.status === 'online' ? '#4CAF50' : '#9E9E9E' }]} />
          <Text style={styles.statusText}>{device.status === 'online' ? 'Conectado' : 'Desconectado'}</Text>
        </View>
        {isConnecting && <ActivityIndicator size="small" color="#0066ff" style={styles.miniLoader} />}
      </TouchableOpacity>
    );
  }

  return (
    <Card containerStyle={styles.cardContainer}>
      <Card.Title>{device.name}</Card.Title>
      <Card.Divider />
      
      <View style={styles.deviceInfo}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Estado:</Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusIndicator, { backgroundColor: device.status === 'online' ? '#4CAF50' : '#9E9E9E' }]} />
            <Text style={styles.statusText}>{device.status === 'online' ? 'Conectado' : 'Desconectado'}</Text>
          </View>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Tipo:</Text>
          <Text style={styles.infoValue}>{getDeviceTypeLabel(device.type)}</Text>
        </View>
        
        {device.lastReading && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Última lectura:</Text>
            <Text style={styles.infoValue}>
              {device.lastReading.value} {device.lastReading.unit}
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.buttonContainer}>
        {device.status === 'offline' ? (
          <Button
            title="Conectar"
            icon={<Icon name="bluetooth-connect" type="material-community" color="#ffffff" size={20} style={styles.buttonIcon} />}
            buttonStyle={styles.connectButton}
            onPress={handleConnect}
            loading={isConnecting}
          />
        ) : (
          <>
            <Button
              title="Tomar Lectura"
              icon={<Icon name="pulse" type="ionicon" color="#ffffff" size={20} style={styles.buttonIcon} />}
              buttonStyle={styles.readButton}
              onPress={handleStartCollection}
              loading={isCollecting}
            />
            <Button
              title="Desconectar"
              icon={<Icon name="bluetooth-off" type="material-community" color="#ffffff" size={20} style={styles.buttonIcon} />}
              buttonStyle={styles.disconnectButton}
              onPress={handleDisconnect}
              loading={isConnecting}
            />
          </>
        )}
      </View>
    </Card>
  );
}

// Función auxiliar para obtener etiquetas amigables de los tipos de dispositivos
function getDeviceTypeLabel(type: string): string {
  const types: Record<string, string> = {
    ecg: 'Electrocardiograma',
    bloodPressure: 'Presión arterial',
    glucose: 'Glucómetro',
    oximeter: 'Oxímetro',
    thermometer: 'Termómetro',
    stethoscope: 'Estetoscopio digital'
  };
  
  return types[type] || type;
}

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
  },
  deviceInfo: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#555',
  },
  infoValue: {
    fontSize: 15,
    color: '#333',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    color: '#555',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  connectButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 15,
  },
  disconnectButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 15,
  },
  readButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 15,
  },
  loaderContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    marginTop: 8,
    color: '#666',
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#D32F2F',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 15,
  },
  minimalContainer: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  deviceName: {
    fontSize: 15,
    fontWeight: '600',
  },
  minimalStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniLoader: {
    marginLeft: 8,
  },
}); 