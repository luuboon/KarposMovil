import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { IoTService } from '../../lib/services/iot';

interface IoTSessionControlProps {
  citaId: string | number;
  patientName: string;
  exerciseType?: 'flexion' | 'extension' | 'grip';
  onSessionChange?: (isActive: boolean) => void;
}

const IoTSessionControl: React.FC<IoTSessionControlProps> = ({ 
  citaId, 
  patientName,
  exerciseType = 'flexion',
  onSessionChange 
}) => {
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    // Verificar el estado del dispositivo inicialmente
    checkApiStatus();
    
    // Verificar si ya hay una sesión activa al cargar
    checkExistingSession();
    
    // Configurar un intervalo para verificar el estado periódicamente
    const statusInterval = setInterval(checkApiStatus, 10000); // Cada 10 segundos
    
    // Limpiar temporizadores al desmontar
    return () => {
      if (timer) clearInterval(timer);
      clearInterval(statusInterval);
    };
  }, []);

  const checkApiStatus = async () => {
    setApiStatus('checking');
    const status = await IoTService.checkApiStatus();
    
    if (status.success && status.online) {
      setApiStatus('online');
    } else {
      console.log(`[IoT] Dispositivo fuera de línea: ${status.error || 'Sin respuesta del servidor'}`);
      setApiStatus('offline');
    }
  };

  const checkExistingSession = async () => {
    try {
      const result = await IoTService.getLatestCommand(citaId);
      
      if (result.success && result.command) {
        // Si el último comando fue START y no hay un STOP posterior, la sesión está activa
        if (result.command.cmd === 'START') {
          setIsActive(true);
          startTimer();
        }
      }
    } catch (error) {
      console.error('Error al verificar sesión existente:', error);
    }
  };

  const startTimer = () => {
    const interval = setInterval(() => {
      setSessionTime(prev => prev + 1);
    }, 1000);
    setTimer(interval);
  };

  const stopTimer = () => {
    if (timer) {
      clearInterval(timer);
      setTimer(null);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleSession = async () => {
    if (apiStatus !== 'online') {
      Alert.alert(
        'Dispositivo desconectado',
        'No se puede conectar con el dispositivo IoT. Asegúrate de que esté encendido y conectado a la red WiFi.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Verificar conexión', onPress: checkApiStatus }
        ]
      );
      return;
    }

    try {
      setLoading(true);
      
      const command = isActive ? 'STOP' : 'START';
      const result = await IoTService.sendCommand(command, citaId, exerciseType);
      
      if (result.success) {
        if (!isActive) { // Iniciando sesión
          Alert.alert(
            'Sesión Iniciada',
            `Se ha iniciado una sesión de rehabilitación (${exerciseType}) para ${patientName}.\n\nEl dispositivo está registrando datos.`
          );
          startTimer();
        } else { // Finalizando sesión
          Alert.alert(
            'Sesión Finalizada',
            'La sesión ha finalizado. Los datos han sido guardados correctamente.'
          );
          stopTimer();
          setSessionTime(0);
        }
        
        setIsActive(!isActive);
        if (onSessionChange) {
          onSessionChange(!isActive);
        }
      } else {
        Alert.alert('Error', `No se pudo ${isActive ? 'detener' : 'iniciar'} la sesión IoT`);
      }
    } catch (error) {
      console.error('Error en el control de sesión:', error);
      Alert.alert('Error', 'Ocurrió un problema al comunicarse con el dispositivo IoT');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card style={styles.container}>
      <Card.Title title="Control de Dispositivo IoT" subtitle={`Ejercicio: ${exerciseType}`} />
      <Card.Content>
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusIndicator,
            apiStatus === 'online' ? styles.statusOnline :
            apiStatus === 'offline' ? styles.statusOffline :
            styles.statusChecking
          ]} />
          <Text style={styles.statusText}>
            {apiStatus === 'online' ? 'Dispositivo en línea' :
             apiStatus === 'offline' ? 'Dispositivo fuera de línea - Verifica la conexión WiFi' :
             'Comprobando conexión...'}
          </Text>
          {apiStatus === 'offline' && (
            <TouchableOpacity 
              onPress={checkApiStatus}
              style={styles.refreshButton}
            >
              <Text style={styles.refreshText}>Actualizar</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {isActive && (
          <View style={styles.timerContainer}>
            <Text style={styles.timerLabel}>Tiempo de sesión:</Text>
            <Text style={styles.timerValue}>{formatTime(sessionTime)}</Text>
          </View>
        )}
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              isActive ? styles.stopButton : styles.startButton,
              (loading || apiStatus !== 'online') && styles.disabledButton
            ]}
            onPress={toggleSession}
            disabled={loading || apiStatus !== 'online'}
          >
            {loading ? (
              <ActivityIndicator size="large" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {isActive ? 'DETENER SESIÓN' : 'INICIAR SESIÓN'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
    elevation: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusOnline: {
    backgroundColor: '#4CAF50',
  },
  statusOffline: {
    backgroundColor: '#F44336',
  },
  statusChecking: {
    backgroundColor: '#FFC107',
  },
  statusText: {
    fontSize: 14,
  },
  timerContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  timerLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  timerValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  buttonContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  button: {
    width: '100%',
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#FF9F1C',
  },
  stopButton: {
    backgroundColor: '#E63946',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  refreshButton: {
    backgroundColor: '#FF9F1C',
    padding: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  refreshText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default IoTSessionControl; 