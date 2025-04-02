import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../components/AuthContext';
import { router } from 'expo-router';

export default function ReportesScreen() {
  const { userRole } = useAuth();
  
  // Redirigir automáticamente si no es doctor
  useEffect(() => {
    if (userRole !== 'doctor') {
      router.replace('/(tabs)');
    }
  }, [userRole]);
  
  // No mostrar nada si no es doctor
  if (userRole !== 'doctor') {
    return null;
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Reportes
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Análisis y estadísticas de pacientes
        </Text>
      </View>
      
      <View style={styles.content}>
        <Text variant="bodyLarge">
          Esta sección está en construcción
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#757575',
    marginTop: 8,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
