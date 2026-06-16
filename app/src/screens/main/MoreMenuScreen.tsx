import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, FontFamily, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { Typography } from '@/components/ui/Typography';

export const MoreMenuScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const menuItems = [
    {
      id: 'payments',
      title: 'Registros de Pagos',
      subtitle: 'Historial detallado de ingresos y egresos',
      icon: 'receipt',
      onPress: () => navigation.navigate('PaymentRecords')
    },
    {
      id: 'contacts',
      title: 'Contactos',
      subtitle: 'Gestionar mis contactos y calificaciones',
      icon: 'people',
      onPress: () => navigation.navigate('Contactos')
    },
    {
      id: 'recurring',
      title: 'Repetir Tickets',
      subtitle: 'Configurar cobros y pagos recurrentes',
      icon: 'repeat',
      onPress: () => navigation.navigate('RecurringTickets'),
    },
    {
      id: 'videos',
      title: 'Videos',
      subtitle: 'Información clara para tomar mejores decisiones',
      icon: 'play-circle',
      onPress: () => navigation.navigate('Videos')
    },
    {
      id: 'settings',
      title: 'Configuración',
      subtitle: 'Ajustes de la cuenta y preferencias',
      icon: 'settings',
      onPress: () => navigation.navigate('Settings')
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Typography variant="headingH2">Más opciones</Typography>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.menuGrid}>
          {menuItems.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={styles.menuItem}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <Ionicons name={item.icon as any} size={22} color={Colors.primary} />
              </View>
              <View style={styles.itemInfo}>
                <Typography variant="bodyLargeStrong">{item.title}</Typography>
                <Typography variant="labelSmall" color="secondary">{item.subtitle}</Typography>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  menuGrid: {
    gap: 2, // Spacing between rows if needed, or use borders
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.strokeSubtle,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
});
