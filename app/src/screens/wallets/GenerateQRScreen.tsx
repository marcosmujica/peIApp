import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Platform, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { WalletsStackParamList } from './WalletsNavigator';
import { Colors, FontFamily, Shadows } from '@/constants/theme';
import { Typography } from '@/components/ui';
import QRCode from 'react-native-qrcode-svg';
import { getLocalWallets, LocalWallet } from '@/storage/wallets.local';
import { GENERAL_RUBROS_INGRESOS, WALLET_RUBROS_MAP, RubroItem } from '@/constants/rubros';
import { useAuthStore } from '@/store/auth.store';

type Props = NativeStackScreenProps<WalletsStackParamList, 'GenerateQR'>;

export const GenerateQRScreen: React.FC<Props> = ({ route, navigation }) => {
  const { walletId, currency } = route.params;
  const { user } = useAuthStore();
  const [wallet, setWallet] = useState<LocalWallet | null>(null);
  const [amount, setAmount] = useState('');
  const [detail, setDetail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [selectedRubro, setSelectedRubro] = useState<RubroItem | null>(null);
  const [isRubroModalVisible, setRubroModalVisible] = useState(false);

  useEffect(() => {
    const loadWallet = async () => {
      const wallets = await getLocalWallets();
      const w = wallets.find(x => x.id === walletId);
      if (w) {
        setWallet(w);
        setPaymentMethod(w.defaultPaymentMethod || '');
      }
    };
    loadWallet();
  }, [walletId]);

  const getAvailableRubros = () => {
    if (!wallet) return [];
    
    if (wallet.enabledCategories && wallet.enabledCategories.length > 0) {
      const ids = wallet.enabledCategories
        .filter(c => c.type === 'income')
        .map(c => c.categoryKey);
      
      return GENERAL_RUBROS_INGRESOS.filter(r => ids.includes(r.id));
    }

    const walletType = wallet.type || 'otro';
    const mapping = WALLET_RUBROS_MAP[walletType] || { gastos: [], ingresos: [] };
    return GENERAL_RUBROS_INGRESOS.filter(r => mapping.ingresos.includes(r.id));
  };

  const handleGenerateQR = () => {
    if (!amount) {
      Alert.alert('Error', 'El importe es obligatorio');
      return;
    }
    const data = {
      amount: parseFloat(amount.replace(',', '.')),
      detail,
      payment_method: paymentMethod,
      rubro: selectedRubro?.id,
      currency,
      wallet_id: walletId,
      user_phone: user?.phoneNumber || '',
      user_name: user?.displayName || '',
    };
    
    navigation.navigate('DisplayQR', { 
      qrValue: JSON.stringify(data),
      title: detail || 'Cobro QR'
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Typography variant="headingH3" style={styles.headerTitle}>Generar QR</Typography>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <Typography variant="labelSmall" color="secondary" uppercase spacing={1}>
            Datos del cobro
          </Typography>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Importe ({currency})</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1.5 }]}>
              <Text style={styles.label}>Origen</Text>
              <TouchableOpacity 
                style={styles.input} 
                onPress={() => setRubroModalVisible(true)}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 16, fontFamily: FontFamily.regular, color: selectedRubro ? '#171717' : '#A3A3A3' }} numberOfLines={1}>
                    {selectedRubro ? selectedRubro.label : 'Sel...'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#6B7280" />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Detalle</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Venta de tazas"
              value={detail}
              onChangeText={setDetail}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Procedimiento de Pago</Text>
            <TextInput
              style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
              placeholder="Ej: Transferencia a cuenta... \nCBU: 1234..."
              multiline
              value={paymentMethod}
              onChangeText={setPaymentMethod}
            />
          </View>


          <TouchableOpacity 
            style={[styles.generateBtn, !amount && { opacity: 0.5 }]} 
            onPress={handleGenerateQR}
            disabled={!amount}
          >
            <Ionicons name="qr-code" size={20} color={Colors.white} />
            <Text style={styles.generateBtnText}>Generar QR</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Rubro Selection Modal */}
      <Modal visible={isRubroModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Typography variant="headingH3">Seleccionar Origen</Typography>
              <TouchableOpacity onPress={() => setRubroModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.textTertiary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={getAvailableRubros()}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.rubroItem} 
                  onPress={() => {
                    setSelectedRubro(item);
                    setRubroModalVisible(false);
                  }}
                >
                  <View style={styles.rubroIconBg}>
                    <Ionicons name={item.icon as any} size={20} color="#171717" />
                  </View>
                  <Text style={styles.rubroLabel}>{item.label}</Text>
                  {selectedRubro?.id === item.id && (
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  )}
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#F9FAFB'
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
  content: { padding: 24, paddingBottom: 60 },
  form: { gap: 20 },
  inputGroup: { gap: 8 },
  label: { fontSize: 13, fontFamily: FontFamily.bold, color: '#4B5563' },
  input: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 16, 
    padding: 16, 
    fontSize: 16, 
    fontFamily: FontFamily.regular, 
    color: '#171717',
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  generateBtn: { 
    backgroundColor: '#171717', 
    borderRadius: 16, 
    padding: 18, 
    flexDirection: 'row',
    alignItems: 'center', 
    justifyContent: 'center',
    gap: 10,
    marginTop: 10
  },
  generateBtnText: { color: Colors.white, fontSize: 16, fontFamily: FontFamily.bold },
  qrContainer: { 
    alignItems: 'center', 
    marginTop: 32, 
    padding: 32, 
    backgroundColor: Colors.white, 
    borderRadius: 24, 
    ...Shadows.card,
    borderWidth: 1,
    borderColor: '#F3F4F6'
  },
  qrInfo: { marginTop: 20, fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 18 },
  copyBtn: { marginTop: 20, padding: 8 },
  copyBtnText: { color: '#3B82F6', fontSize: 14, fontFamily: FontFamily.medium },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  rubroItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rubroIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rubroLabel: {
    flex: 1,
    fontSize: 16,
    fontFamily: FontFamily.medium,
    color: '#171717',
  },
});
