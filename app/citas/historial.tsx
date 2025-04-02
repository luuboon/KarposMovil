import React from 'react';
import { StyleSheet, FlatList } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Header } from '@/components/Header';

// Datos de ejemplo para el historial de citas
const citasHistorial = [
  { id: '1', fecha: '10/02/2024', doctor: 'Dr. Martínez', especialidad: 'Cardiología', estado: 'Completada' },
  { id: '2', fecha: '15/01/2024', doctor: 'Dra. Rodríguez', especialidad: 'Dermatología', estado: 'Completada' },
  { id: '3', fecha: '05/12/2023', doctor: 'Dr. Sánchez', especialidad: 'Neurología', estado: 'Cancelada' },
  { id: '4', fecha: '20/11/2023', doctor: 'Dra. López', especialidad: 'Oftalmología', estado: 'Completada' },
];

export default function HistorialCitasScreen() {
  return (
    <ThemedView style={styles.container}>
      <Header title="Historial de Citas" />
      
      <FlatList
        data={citasHistorial}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ThemedView style={styles.citaItem}>
            <ThemedText type="subtitle">{item.fecha}</ThemedText>
            <ThemedText>{item.doctor} - {item.especialidad}</ThemedText>
            <ThemedView 
              style={[
                styles.estadoBadge, 
                item.estado === 'Completada' ? styles.completada : styles.cancelada
              ]}
            >
              <ThemedText style={styles.estadoTexto}>{item.estado}</ThemedText>
            </ThemedView>
          </ThemedView>
        )}
        contentContainerStyle={styles.listContainer}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 16,
  },
  listContainer: {
    padding: 16,
  },
  citaItem: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  estadoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  completada: {
    backgroundColor: '#4CAF50',
  },
  cancelada: {
    backgroundColor: '#F44336',
  },
  estadoTexto: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
});
