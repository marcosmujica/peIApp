import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Typography } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';

export const TermsAndConditionsScreen: React.FC = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Typography variant="headingH3">Términos y Condiciones</Typography>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Typography variant="labelSmall" color="secondary" style={{ marginBottom: Spacing.md }}>
          Última actualización: 5 de Mayo, 2026
        </Typography>

        <Typography variant="headingH4" style={styles.sectionTitle}>1. Aceptación de los Términos</Typography>
        <Typography variant="bodyBase" color="secondary" style={styles.paragraph}>
          Al descargar o utilizar la aplicación PeiApp, estos términos se aplicarán automáticamente a usted; por lo tanto, debe asegurarse de leerlos cuidadosamente antes de usar la aplicación. No está permitido copiar ni modificar la aplicación, ninguna parte de la aplicación o nuestras marcas comerciales de ninguna manera.
        </Typography>

        <Typography variant="headingH4" style={styles.sectionTitle}>2. Uso de la Aplicación</Typography>
        <Typography variant="bodyBase" color="secondary" style={styles.paragraph}>
          PeiApp almacena y procesa los datos personales que nos ha proporcionado para prestar nuestro servicio. Es su responsabilidad mantener su teléfono y el acceso a la aplicación seguros. Le recomendamos que no libere o realice jailbreak a su teléfono, ya que podría hacer que su teléfono sea vulnerable a malware/virus/programas maliciosos y comprometer las funciones de seguridad de PeiApp.
        </Typography>

        <Typography variant="headingH4" style={styles.sectionTitle}>3. Privacidad y Datos</Typography>
        <Typography variant="bodyBase" color="secondary" style={styles.paragraph}>
          Su privacidad es importante para nosotros. Los datos financieros registrados en PeiApp se almacenan de forma cifrada y se utilizan únicamente para proporcionarle reportes y análisis de su actividad financiera. No compartimos sus datos con terceros con fines publicitarios.
        </Typography>

        <Typography variant="headingH4" style={styles.sectionTitle}>4. Cargos y Servicios</Typography>
        <Typography variant="bodyBase" color="secondary" style={styles.paragraph}>
          Ciertas funciones de la aplicación pueden requerir una suscripción activa o el pago de tarifas por servicios premium. Usted será notificado claramente antes de incurrir en cualquier cargo. PeiApp se reserva el derecho de modificar sus tarifas notificando con 30 días de antelación.
        </Typography>

        <Typography variant="headingH4" style={styles.sectionTitle}>5. Responsabilidad Limitada</Typography>
        <Typography variant="bodyBase" color="secondary" style={styles.paragraph}>
          PeiApp es una herramienta de gestión financiera. No somos responsables por pérdidas financieras resultantes de decisiones tomadas basadas en la información proporcionada por la aplicación, ni por errores en el ingreso manual de datos por parte del usuario.
        </Typography>

        <Typography variant="headingH4" style={styles.sectionTitle}>6. Cambios en los Términos</Typography>
        <Typography variant="bodyBase" color="secondary" style={styles.paragraph}>
          Podemos actualizar nuestros Términos y Condiciones de vez en cuando. Por lo tanto, se le aconseja revisar esta página periódicamente para cualquier cambio. Le notificaremos de cualquier cambio mediante la publicación de los nuevos Términos y Condiciones en esta página.
        </Typography>

        <View style={{ height: 40 }} />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.strokeSubtle,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 24,
  },
  sectionTitle: {
    marginTop: 24,
    marginBottom: 8,
  },
  paragraph: {
    lineHeight: 22,
    textAlign: 'justify',
  },
});
