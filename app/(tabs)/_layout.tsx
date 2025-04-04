import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../components/AuthContext';

import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}) {
  return <Ionicons size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { userRole } = useAuth();
  
  console.log('LAYOUT TABS - Rol usuario:', userRole);
  
  // Mostrar diferentes pestañas según el rol del usuario
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
          },
          default: {},
        }),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      
      {/* Vista de citas para doctores */}
      <Tabs.Screen
        name="citas-dashboard"
        options={{
          title: 'Citas',
          tabBarIcon: ({ color }) => <TabBarIcon name="calendar" color={color} />,
          // Solo visible para doctores
          href: userRole === 'doctor' ? undefined : null,
        }}
      />
      
      {/* Vista de citas para pacientes */}
      <Tabs.Screen
        name="citas/index"
        options={{
          title: 'Citas',
          tabBarIcon: ({ color }) => <TabBarIcon name="calendar" color={color} />,
          // Solo visible para pacientes
          href: userRole === 'patient' ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="citas/agendar"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="dispositivos/index"
        options={{
          title: userRole === 'doctor' ? 'IoT' : 'Dispositivos',
          tabBarIcon: ({ color }) => 
            userRole === 'doctor' 
              ? <TabBarIcon name="hardware-chip" color={color} />
              : <TabBarIcon name="phone-portrait" color={color} />,
          // Siempre visible, pero con diferente nombre según el rol
        }}
      />
      <Tabs.Screen
        name="reportes/index"
        options={{
          title: 'Reportes',
          tabBarIcon: ({ color }) => <TabBarIcon name="bar-chart" color={color} />,
          // Solo visible para pacientes
          href: userRole === 'doctor' ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <TabBarIcon name="person" color={color} />,
          // Solo visible para pacientes
          href: userRole === 'doctor' ? null : undefined,
        }}
      />
    </Tabs>
  );
} 