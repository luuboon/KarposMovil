import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Card, Button, Icon } from '@rneui/themed';
import IoTService, { IoTReading } from '../../lib/services/iot';

interface IoTDataVisualizerProps {
  deviceId: string;
  readingLimit?: number;
  height?: number;
  showRefresh?: boolean;
  onNewReading?: (reading: IoTReading) => void;
}

export default function IoTDataVisualizer({
  deviceId,
  readingLimit = 10,
  height = 220,
  showRefresh = true,
  onNewReading
}: IoTDataVisualizerProps) {
  const [readings, setReadings] = useState<IoTReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Ancho de la pantalla para el gráfico
  const screenWidth = Dimensions.get('window').width - 32;

  useEffect(() => {
    loadReadings();
    loadDeviceInfo();
  }, [deviceId]);

  const loadReadings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await IoTService.getDeviceReadings(deviceId, readingLimit);
      
      // Ordenar por timestamp (más antiguo primero)
      const sortedData = [...data].sort((a, b) => {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      });
      
      setReadings(sortedData);
      
      // Notificar de la lectura más reciente si existe un callback
      if (onNewReading && sortedData.length > 0) {
        onNewReading(sortedData[sortedData.length - 1]);
      }
    } catch (err) {
      console.error('Error al cargar lecturas:', err);
      setError('Error al cargar las lecturas del dispositivo');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadDeviceInfo = async () => {
    try {
      const deviceData = await IoTService.getDeviceById(deviceId);
      setDeviceInfo(deviceData);
    } catch (err) {
      console.error('Error al cargar información del dispositivo:', err);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadReadings();
  };

  const formatTimestamp = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    } catch (err) {
      return '';
    }
  };

  const getChartData = () => {
    if (!readings || readings.length === 0) {
      return {
        labels: [],
        datasets: [{ data: [0] }],
      };
    }

    return {
      labels: readings.map(r => formatTimestamp(r.timestamp)),
      datasets: [
        {
          data: readings.map(r => r.value),
          color: (opacity = 1) => `rgba(0, 102, 255, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    };
  };

  const getDeviceTypeColor = (type: string) => {
    switch (type) {
      case 'ecg':
        return '#F44336';
      case 'bloodPressure':
        return '#2196F3';
      case 'glucose':
        return '#4CAF50';
      case 'oximeter':
        return '#FF9800';
      default:
        return '#673AB7';
    }
  };

  const getDeviceUnit = (type: string) => {
    switch (type) {
      case 'ecg':
        return 'bpm';
      case 'bloodPressure':
        return 'mmHg';
      case 'glucose':
        return 'mg/dL';
      case 'oximeter':
        return '%';
      case 'thermometer':
        return '°C';
      default:
        return '';
    }
  };

  const getDeviceTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      ecg: 'Electrocardiograma',
      bloodPressure: 'Presión arterial',
      glucose: 'Glucómetro',
      oximeter: 'Oxímetro',
      thermometer: 'Termómetro',
      stethoscope: 'Estetoscopio digital'
    };
    
    return types[type] || type;
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0066ff" />
        <Text style={styles.loaderText}>Cargando datos...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Button
          title="Reintentar"
          onPress={loadReadings}
          buttonStyle={styles.retryButton}
        />
      </View>
    );
  }

  if (readings.length === 0) {
    return (
      <View style={styles.noDataContainer}>
        <Icon name="analytics-outline" type="ionicon" size={40} color="#9E9E9E" />
        <Text style={styles.noDataText}>No hay datos disponibles</Text>
        {showRefresh && (
          <Button
            title="Actualizar"
            onPress={handleRefresh}
            buttonStyle={styles.refreshButton}
            loading={refreshing}
          />
        )}
      </View>
    );
  }

  // Calcular valores estadísticos
  const values = readings.map(r => r.value);
  const latestReading = readings[readings.length - 1];
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
  
  // Determinar el tipo de dispositivo para colorear y formatear adecuadamente
  const deviceType = deviceInfo?.type || (readings.length > 0 ? readings[0].type : '');
  const chartColor = getDeviceTypeColor(deviceType);
  const unit = getDeviceUnit(deviceType);

  return (
    <Card containerStyle={styles.cardContainer}>
      <Card.Title>
        Datos: {deviceInfo?.name || getDeviceTypeLabel(deviceType)}
      </Card.Title>
      <Card.Divider />
      
      {latestReading && (
        <View style={styles.latestContainer}>
          <Text style={styles.latestLabel}>Última lectura:</Text>
          <Text style={styles.latestValue}>
            {latestReading.value} <Text style={styles.unitText}>{unit}</Text>
          </Text>
          <Text style={styles.timestampText}>
            {new Date(latestReading.timestamp).toLocaleTimeString()}
          </Text>
        </View>
      )}
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <LineChart
          data={getChartData()}
          width={Math.max(screenWidth, readings.length * 50)}
          height={height}
          yAxisSuffix={` ${unit}`}
          chartConfig={{
            backgroundColor: "#fff",
            backgroundGradientFrom: "#fff",
            backgroundGradientTo: "#fff",
            decimalPlaces: 1,
            color: (opacity = 1) => chartColor || `rgba(0, 102, 255, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: "4",
              strokeWidth: "2",
              stroke: chartColor || "#0066ff",
            },
          }}
          bezier
          style={styles.chart}
        />
      </ScrollView>
      
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Máximo</Text>
          <Text style={styles.statValue}>{maxValue.toFixed(1)} {unit}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Mínimo</Text>
          <Text style={styles.statValue}>{minValue.toFixed(1)} {unit}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Promedio</Text>
          <Text style={styles.statValue}>{avgValue.toFixed(1)} {unit}</Text>
        </View>
      </View>
      
      {showRefresh && (
        <Button
          title="Actualizar Datos"
          icon={<Icon name="refresh" type="material" color="#ffffff" size={18} style={styles.buttonIcon} />}
          onPress={handleRefresh}
          buttonStyle={styles.refreshButton}
          loading={refreshing}
        />
      )}
    </Card>
  );
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
    padding: 12,
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
  noDataContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataText: {
    marginTop: 12,
    marginBottom: 16,
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
  },
  latestContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  latestLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#555',
  },
  latestValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  unitText: {
    fontSize: 14,
    color: '#777',
    fontWeight: 'normal',
  },
  timestampText: {
    fontSize: 12,
    color: '#999',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 10,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  refreshButton: {
    backgroundColor: '#2196F3',
    marginTop: 8,
  },
  retryButton: {
    backgroundColor: '#2196F3',
  },
  buttonIcon: {
    marginRight: 8,
  },
}); 