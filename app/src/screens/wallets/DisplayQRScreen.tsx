import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { WalletsStackParamList } from './WalletsNavigator';
import { Colors, FontFamily, Shadows } from '@/constants/theme';
import { Typography } from '@/components/ui';
import QRCode from 'react-native-qrcode-svg';

type Props = NativeStackScreenProps<WalletsStackParamList, 'DisplayQR'>;

export const DisplayQRScreen: React.FC<Props> = ({ route, navigation }) => {
  const { qrValue, title } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Typography variant="headingH3" style={styles.headerTitle}>{title || 'Código QR'}</Typography>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.qrCard}>
          <QRCode
            value={qrValue}
            size={260}
            color="#171717"
            backgroundColor="white"
          />
          <Text style={styles.qrInfo}>
            Mostrá este código para que otra persona lo escanee e importe los datos del ticket.
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.doneBtn} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.doneBtnText}>Volver</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 12,
  },
  headerTitle: { flex: 1, textAlign: 'center', color: '#171717' },
  backBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  content: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center',
    padding: 24,
  },
  qrCard: {
    backgroundColor: Colors.white,
    borderRadius: 32,
    padding: 40,
    alignItems: 'center',
    ...Shadows.card,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    width: '100%',
  },
  qrInfo: {
    marginTop: 32,
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: FontFamily.medium,
  },
  doneBtn: {
    marginTop: 40,
    backgroundColor: '#171717',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 20,
  },
  doneBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: FontFamily.bold,
  },
});
