import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { IoTService } from '../../lib/services/iot';

interface DoctorIoTControlProps {
  citaId: number;
}

const DoctorIoTControl: React.FC<DoctorIoTControlProps> = ({ citaId }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verificar si hay una grabación en curso al cargar el componente
  useEffect(() => {
    const checkRecordingStatus = async () => {
      try {
        const latestCommand = await IoTService.getLatestCommand();
        if (latestCommand.citaId === citaId) {
          setIsRecording(latestCommand.cmd === 'START');
        }
      } catch (error) {
        console.error('Error al verificar estado de grabación:', error);
      }
    };

    checkRecordingStatus();
  }, [citaId]);

  const handleStartStop = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const command = isRecording ? 'STOP' : 'START';
      console.log(`Enviando comando IoT: ${command} para cita: ${citaId}`);
      
      await IoTService.sendCommand(command, citaId);
      
      setIsRecording(!isRecording);
    } catch (error) {
      console.error('Error al controlar dispositivo IoT:', error);
      setError('Error al controlar el dispositivo. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Control de Dispositivo</Text>
      
      {error && <Text style={styles.error}>{error}</Text>}
      
      <Button
        mode="contained"
        onPress={handleStartStop}
        loading={loading}
        disabled={loading}
        style={[
          styles.button,
          isRecording ? styles.stopButton : styles.startButton
        ]}
        icon={isRecording ? 'stop' : 'play'}
      >
        {isRecording ? 'Detener Medición' : 'Iniciar Medición'}
      </Button>
      
      {isRecording && (
        <Text style={styles.recordingText}>Grabando datos del paciente...</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 10,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  button: {
    paddingVertical: 8,
    borderRadius: 8,
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#F44336',
  },
  recordingText: {
    color: '#F44336',
    marginTop: 12,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  error: {
    color: '#D32F2F',
    marginBottom: 10,
  },
});

export default DoctorIoTControl; 