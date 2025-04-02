import React from 'react';
import { StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Header } from '@/components/Header';
import { Button } from '@/components/Button';

// Datos de ejemplo para las facturas
const facturas = [
  { id: '1', fecha: '15/03/2024', concepto: 'Consulta Cardiología', monto: '$1,200.00', pagada: true },
  { id: '2', fecha: '28/02/2024', concepto: 'Análisis de Sangre', monto: '$850.00', pagada: true },
  { id: '3', fecha: '10/01/2024', concepto: 'Consulta Dermatología', monto: '$1,000.00', pagada: true },
  { id: '4', fecha: '05/12/2023', concepto: 'Radiografía', monto: '$1,500.00', pagada: false },
];

export default function FacturasScreen() {
  const descargarFactura = (id: string) => {
    console.log(`Descargando factura ${id}`);
    // Aquí iría la lógica para descargar la factura
  };

  const pagarFactura = (id: string) => {
    console.log(`Pagando factura ${id}`);
    // Aquí iría la lógica para pagar la factura
  };

  return (
    <ThemedView style={styles.container}>
      <Header title="Mis Facturas" />
      
      <FlatList
        data={facturas}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ThemedView style={styles.facturaItem}>
            <ThemedView style={styles.facturaHeader}>
              <ThemedText type="subtitle">{item.fecha}</ThemedText>
              <ThemedView 
                style={[
                  styles.estadoBadge, 
                  item.pagada ? styles.pagada : styles.pendiente
                ]}
              >
                <ThemedText style={styles.estadoTexto}>
                  {item.pagada ? 'Pagada' : 'Pendiente'}
                </ThemedText>
              </ThemedView>
            </ThemedView>
            
            <ThemedText>{item.concepto}</ThemedText>
            <ThemedText style={styles.monto}>{item.monto}</ThemedText>
            
            <ThemedView style={styles.botonesContainer}>
              <Button 
                title="Descargar PDF" 
                variant="outline"
                size="small"
                onPress={() => descargarFactura(item.id)}
                style={styles.boton}
              />
              
              {!item.pagada && (
                <Button 
                  title="Pagar ahora" 
                  variant="primary"
                  size="small"
                  onPress={() => pagarFactura(item.id)}
                  style={styles.boton}
                />
              )}
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
  },
  listContainer: {
    padding: 16,
  },
  facturaItem: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  facturaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  estadoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  pagada: {
    backgroundColor: '#4CAF50',
  },
  pendiente: {
    backgroundColor: '#FFC107',
  },
  estadoTexto: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  monto: {
    fontWeight: 'bold',
    fontSize: 18,
    marginVertical: 8,
  },
  botonesContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  boton: {
    marginLeft: 8,
  },
});
