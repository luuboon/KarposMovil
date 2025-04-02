import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';

export default function ExpedienteMedicoScreen() {
  return (
    <ThemedView style={styles.container}>
      <Header title="Expediente Médico" />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        <Card title="Información General" style={styles.card}>
          <ThemedView style={styles.infoRow}>
            <ThemedText style={styles.label}>Tipo de Sangre:</ThemedText>
            <ThemedText>O+</ThemedText>
          </ThemedView>
          
          <ThemedView style={styles.infoRow}>
            <ThemedText style={styles.label}>Altura:</ThemedText>
            <ThemedText>175 cm</ThemedText>
          </ThemedView>
          
          <ThemedView style={styles.infoRow}>
            <ThemedText style={styles.label}>Peso:</ThemedText>
            <ThemedText>68 kg</ThemedText>
          </ThemedView>
          
          <ThemedView style={styles.infoRow}>
            <ThemedText style={styles.label}>IMC:</ThemedText>
            <ThemedText>22.2 (Normal)</ThemedText>
          </ThemedView>
        </Card>
        
        <Card title="Alergias" style={styles.card}>
          <ThemedView style={styles.listItem}>
            <ThemedText>• Penicilina</ThemedText>
          </ThemedView>
          <ThemedView style={styles.listItem}>
            <ThemedText>• Nueces</ThemedText>
          </ThemedView>
        </Card>
        
        <Card title="Condiciones Médicas" style={styles.card}>
          <ThemedView style={styles.listItem}>
            <ThemedText>• Hipertensión (Diagnosticada: 2020)</ThemedText>
          </ThemedView>
          <ThemedView style={styles.listItem}>
            <ThemedText>• Asma leve (Diagnosticada: 2015)</ThemedText>
          </ThemedView>
        </Card>
        
        <Card title="Medicamentos Actuales" style={styles.card}>
          <ThemedView style={styles.medicationItem}>
            <ThemedText type="subtitle">Losartán 50mg</ThemedText>
            <ThemedText>1 tableta diaria</ThemedText>
            <ThemedText style={styles.medicationNote}>Para hipertensión</ThemedText>
          </ThemedView>
          
          <ThemedView style={styles.medicationItem}>
            <ThemedText type="subtitle">Salbutamol Inhalador</ThemedText>
            <ThemedText>Según sea necesario</ThemedText>
            <ThemedText style={styles.medicationNote}>Para asma</ThemedText>
          </ThemedView>
        </Card>
        
        <Card title="Historial de Cirugías" style={styles.card}>
          <ThemedView style={styles.surgeryItem}>
            <ThemedText type="subtitle">Apendicectomía</ThemedText>
            <ThemedText>Fecha: 12/05/2018</ThemedText>
            <ThemedText>Hospital General</ThemedText>
          </ThemedView>
        </Card>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  label: {
    fontWeight: 'bold',
    width: 120,
  },
  listItem: {
    paddingVertical: 4,
  },
  medicationItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  medicationNote: {
    fontStyle: 'italic',
    opacity: 0.7,
    marginTop: 4,
  },
  surgeryItem: {
    paddingVertical: 8,
  },
});
