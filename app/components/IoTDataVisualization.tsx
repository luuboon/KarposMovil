import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Dimensions, ScrollView } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { LineChart } from 'react-native-chart-kit';
import { IoTService, IoTData } from '../../lib/services/iot';

interface IoTDataVisualizationProps {
  citaId: number;
  autoUpdate?: boolean;
}

const IoTDataVisualization: React.FC<IoTDataVisualizationProps> = ({ 
  citaId,
  autoUpdate = true
}) => {
  const [data, setData] = useState<IoTData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const screenWidth = Dimensions.get('window').width - 40;
  
  useEffect(() => {
    loadData();
    
    // Si autoUpdate está activado, actualizar cada 5 segundos
    if (autoUpdate) {
      intervalRef.current = setInterval(loadData, 5000);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [citaId, autoUpdate]);

  const loadData = async () => {
    try {
      // No mostrar loading en actualizaciones automáticas después de la primera carga
      if (!data) {
        setLoading(true);
      }
      
      setError(null);
      
      const iotDataList = await IoTService.getIoTDataByCita(citaId);
      
      if (iotDataList && iotDataList.length > 0) {
        setData(iotDataList[0]); // Tomamos el primer registro (el más reciente)
      } else {
        if (!data) {
          setError('No hay datos disponibles para esta cita');
        }
      }
    } catch (error) {
      console.error('Error al cargar datos IoT:', error);
      setError('Error al cargar los datos de sensores');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={{ marginTop: 16 }}>Cargando datos...</Text>
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!data || (!data.pulso.length && !data.fuerza.length)) {
    return (
      <View style={styles.centeredContainer}>
        <Text>No hay datos disponibles para esta cita</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Datos de Medición</Text>
      <Text style={styles.subtitle}>Fecha: {data.fecha}</Text>
      
      {data.pulso && data.pulso.length > 0 && (
        <Card style={styles.chartContainer}>
          <Card.Content>
            <Text style={styles.chartTitle}>Pulso (BPM)</Text>
            <LineChart
              data={{
                labels: [...Array(Math.min(6, data.pulso.length)).keys()].map(
                  i => `${Math.floor((i * data.pulso.length) / 6) + 1}`
                ),
                datasets: [{ data: data.pulso }],
              }}
              width={screenWidth}
              height={220}
              chartConfig={{
                backgroundColor: '#e6f7ff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#f0f9ff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(0, 102, 204, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: '4',
                  strokeWidth: '2',
                  stroke: '#0066cc',
                },
              }}
              bezier
              style={{
                marginVertical: 8,
                borderRadius: 16,
              }}
            />
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Mínimo</Text>
                <Text style={styles.statValue}>
                  {Math.min(...data.pulso)}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Promedio</Text>
                <Text style={styles.statValue}>
                  {Math.round(data.pulso.reduce((a, b) => a + b, 0) / data.pulso.length)}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Máximo</Text>
                <Text style={styles.statValue}>
                  {Math.max(...data.pulso)}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      )}
      
      {data.fuerza && data.fuerza.length > 0 && (
        <Card style={styles.chartContainer}>
          <Card.Content>
            <Text style={styles.chartTitle}>Fuerza (kg)</Text>
            <LineChart
              data={{
                labels: [...Array(Math.min(6, data.fuerza.length)).keys()].map(
                  i => `${Math.floor((i * data.fuerza.length) / 6) + 1}`
                ),
                datasets: [{ data: data.fuerza }],
              }}
              width={screenWidth}
              height={220}
              chartConfig={{
                backgroundColor: '#fff9e6',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#fff9ec',
                decimalPlaces: 1,
                color: (opacity = 1) => `rgba(230, 125, 34, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: '4',
                  strokeWidth: '2',
                  stroke: '#e67d22',
                },
              }}
              bezier
              style={{
                marginVertical: 8,
                borderRadius: 16,
              }}
            />
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Mínimo</Text>
                <Text style={styles.statValue}>
                  {Math.min(...data.fuerza).toFixed(1)}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Promedio</Text>
                <Text style={styles.statValue}>
                  {(data.fuerza.reduce((a, b) => a + b, 0) / data.fuerza.length).toFixed(1)}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Máximo</Text>
                <Text style={styles.statValue}>
                  {Math.max(...data.fuerza).toFixed(1)}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      )}
      
      <Text style={styles.updateInfo}>
        {autoUpdate ? 'Actualización automática cada 5 segundos' : ''}
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  centeredContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 16,
    color: '#666',
  },
  chartContainer: {
    marginBottom: 20,
    borderRadius: 8,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  errorText: {
    color: '#D32F2F',
    textAlign: 'center',
  },
  updateInfo: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 20,
  },
});

export default IoTDataVisualization; 