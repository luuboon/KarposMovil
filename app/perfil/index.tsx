import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Avatar, Card, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../components/AuthContext';

export default function PerfilScreen() {
  const { userRole, userEmail, userId, logout } = useAuth();
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Avatar.Text 
            size={80} 
            label={userEmail ? userEmail.substring(0, 2).toUpperCase() : '??'} 
            style={styles.avatar}
          />
          <Text variant="headlineMedium" style={styles.title}>
            Mi Perfil
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            {userEmail}
          </Text>
          <Text variant="bodySmall" style={styles.roleBadge}>
            {userRole === 'doctor' ? 'Doctor' : 'Paciente'}
          </Text>
        </View>
        
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Información de la cuenta
            </Text>
            <Divider style={styles.divider} />
            
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.infoLabel}>ID:</Text>
              <Text variant="bodyMedium">{userId}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.infoLabel}>Email:</Text>
              <Text variant="bodyMedium">{userEmail}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.infoLabel}>Rol:</Text>
              <Text variant="bodyMedium">{userRole === 'doctor' ? 'Doctor' : 'Paciente'}</Text>
            </View>
          </Card.Content>
        </Card>
        
        <Button 
          mode="contained" 
          onPress={logout}
          style={styles.logoutButton}
          buttonColor="#F44336"
        >
          Cerrar sesión
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  avatar: {
    marginBottom: 16,
    backgroundColor: '#2E7D32',
  },
  title: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#757575',
    marginTop: 4,
  },
  roleBadge: {
    marginTop: 8,
    backgroundColor: '#E8F5E9',
    color: '#2E7D32',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  card: {
    margin: 16,
    elevation: 2,
  },
  sectionTitle: {
    color: '#2E7D32',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  divider: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  infoLabel: {
    width: 80,
    fontWeight: 'bold',
    color: '#616161',
  },
  logoutButton: {
    margin: 16,
    marginTop: 0,
  },
});
