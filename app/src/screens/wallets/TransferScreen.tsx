import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/RootNavigator';
import { Colors, FontFamily, Shadows, BorderRadius, Spacing } from '@/constants/theme';
import { getLocalWallets, LocalWallet } from '@/storage/wallets.local';
import { ticketsApi } from '@/api/tickets.api';
import { Button } from '@/components/ui';
import { useUIStore } from '@/store/ui.store';

type Props = NativeStackScreenProps<RootStackParamList, 'Transfer'>;

export const TransferScreen: React.FC<Props> = ({ route, navigation }) => {
  const { fromWalletId } = route.params;
  const [wallets, setWallets] = useState<LocalWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [mode, setMode] = useState<'transfer' | 'adjustment'>('transfer');

  // Form State
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [toWalletId, setToWalletId] = useState<string | null>(null);
  const [isWalletPickerVisible, setIsWalletPickerVisible] = useState(false);

  useEffect(() => {
    const loadWallets = async () => {
      try {
        const list = await getLocalWallets();
        setWallets(list);
        
        const fromW = list.find(w => w.id === fromWalletId);
        const others = list.filter(w => w.id !== fromWalletId && w.currency === fromW?.currency);
        if (others.length > 0) {
          setToWalletId(others[0].id);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadWallets();
  }, [fromWalletId]);

  const fromWallet = wallets.find(w => w.id === fromWalletId);
  const destinationWallets = useMemo(() => {
    if (!fromWallet) return [];
    return wallets.filter(w => w.id !== fromWalletId && w.currency === fromWallet.currency);
  }, [wallets, fromWallet, fromWalletId]);

  const formatAmount = (val: string) => {
    if (!val) return '';
    const parts = val.replace(/[^0-9,.]/g, '').replace(',', '.').split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return parts.join(',');
  };

  const handleTransfer = async () => {
    const numericAmount = parseFloat(amount.replace(',', '.'));

    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert('Monto inválido', 'Por favor ingresa un monto mayor a cero.');
      return;
    }
    if (!toWalletId) {
      Alert.alert('Sin destino', 'Por favor selecciona una billetera de destino.');
      return;
    }

    if (fromWallet && numericAmount > (fromWallet.balance || 0)) {
      Alert.alert('Saldo insuficiente', `No puedes transferir más del saldo disponible ($${Math.abs(fromWallet.balance || 0).toLocaleString('es-AR')}).`);
      return;
    }

    setIsSaving(true);
    try {
      const userNote = description.trim();
      const toWallet = wallets.find(w => w.id === toWalletId);
      const transferComment = `Desde ${fromWallet?.name || 'Origen'} hacia ${toWallet?.name || 'Destino'}`;

      // 1. Create Outgoing Transfer
      await ticketsApi.createTicket({
        walletId: fromWalletId,
        type: 'transfer',
        subType: 'expense',
        amount: numericAmount,
        currency: fromWallet?.currency || 'UYU',
        description: `Transferencia enviada`,
        dueDate: new Date(),
        status: 'completed',
        amountPaid: numericAmount,
        privateNote: userNote,
        comment: transferComment,
      } as any);

      // 2. Create Incoming Transfer
      await ticketsApi.createTicket({
        walletId: toWalletId,
        type: 'transfer',
        subType: 'income',
        amount: numericAmount,
        currency: toWallet?.currency || 'UYU',
        description: `Transferencia recibida`,
        dueDate: new Date(),
        status: 'completed',
        amountPaid: numericAmount,
        privateNote: userNote,
        comment: transferComment,
      } as any);

      useUIStore.getState().showToast('Transferencia realizada con éxito', 'success');
      setTimeout(() => navigation.goBack(), 500);
    } catch (e: any) {
      console.error("[Transfer] Error:", e);
      Alert.alert('Error', `No se pudo realizar la transferencia.`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdjustment = async () => {
    const newBalance = parseFloat(amount.replace(',', '.'));
    if (isNaN(newBalance) || newBalance < 0) {
      Alert.alert('Monto inválido', 'Ingresa un saldo válido.');
      return;
    }

    const currentBalance = fromWallet?.balance || 0;
    const diff = newBalance - currentBalance;

    if (diff === 0) {
      Alert.alert('Sin cambios', 'El nuevo saldo es igual al actual.');
      return;
    }

    setIsSaving(true);
    try {
      const type = diff > 0 ? 'income' : 'expense';
      const absDiff = Math.abs(diff);

      await ticketsApi.createTicket({
        walletId: fromWalletId,
        type: 'adjustment',
        subType: type, // Store income/expense as subType if needed, or just let backend handle it
        amount: absDiff,
        currency: fromWallet?.currency || 'UYU',
        description: `Ajuste de saldo`,
        dueDate: new Date(),
        status: 'completed',
        amountPaid: absDiff,
        privateNote: description.trim() || 'Ajuste de cuenta manual',
      } as any);

      useUIStore.getState().showToast('Saldo ajustado correctamente', 'success');
      setTimeout(() => navigation.goBack(), 500);
    } catch (e: any) {
      console.error("[Adjustment] Error:", e);
      Alert.alert('Error', 'No se pudo realizar el ajuste.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{mode === 'transfer' ? 'Transferencia' : 'Ajuste de Cuenta'}</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, mode === 'transfer' && styles.activeTab]}
          onPress={() => setMode('transfer')}
        >
          <Text style={[styles.tabText, mode === 'transfer' && styles.activeTabText]}>Transferir</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, mode === 'adjustment' && styles.activeTab]}
          onPress={() => setMode('adjustment')}
        >
          <Text style={[styles.tabText, mode === 'adjustment' && styles.activeTabText]}>Ajustar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={{ flex: 1, width: '100%' }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.innerContent}>
          <View style={styles.section}>
            <Text style={styles.label}>Billetera Actual</Text>
            <View style={styles.walletStaticCard}>
              <View style={styles.walletIcon}>
                 <Ionicons name="wallet-outline" size={20} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.walletName}>{fromWallet?.name}</Text>
                <Text style={styles.walletBalance}>Saldo disponible: ${Math.abs(fromWallet?.balance || 0).toLocaleString('es-AR')}</Text>
              </View>
            </View>
          </View>

          {mode === 'transfer' ? (
            <>
              <View style={styles.swapIconContainer}>
                <Ionicons name="arrow-down" size={24} color="#A3A3A3" />
              </View>

              <View style={styles.section}>
                <Text style={styles.label}>Hacia</Text>
                {destinationWallets.length > 0 ? (
                  <TouchableOpacity 
                    style={styles.selectContainer}
                    onPress={() => setIsWalletPickerVisible(true)}
                  >
                    <View style={styles.selectContent}>
                      <View style={styles.selectIconBg}>
                        <Ionicons name="wallet-outline" size={18} color={Colors.primary} />
                      </View>
                      <Text style={styles.selectValue}>
                        {wallets.find(w => w.id === toWalletId)?.name || 'Seleccionar billetera'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-down" size={20} color="#A3A3A3" />
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.emptyText}>No tienes otras billeteras con esta misma moneda.</Text>
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.label}>Monto a transferir</Text>
                <View style={styles.amountInputContainer}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0"
                    keyboardType="numeric"
                    value={formatAmount(amount)}
                    onChangeText={(t) => {
                      let clean = t.replace(/[^0-9,]/g, '').replace(',', '.');
                      setAmount(clean);
                    }}
                  />
                </View>
              </View>
            </>
          ) : (
            <View style={styles.section}>
              <Text style={styles.label}>Nuevo Saldo Real</Text>
              <View style={[styles.amountInputContainer, { borderColor: Colors.primary }]}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0"
                  keyboardType="numeric"
                  value={formatAmount(amount)}
                  onChangeText={(t) => {
                    let clean = t.replace(/[^0-9,]/g, '').replace(',', '.');
                    setAmount(clean);
                  }}
                  autoFocus
                />
              </View>
              <Text style={styles.adjustmentHint}>
                Se creará un ticket por la diferencia para igualar el saldo.
              </Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.label}>{mode === 'transfer' ? 'Nota privada (opcional)' : 'Motivo del ajuste'}</Text>
            <TextInput
              style={styles.inputFull}
              placeholder={mode === 'transfer' ? "Ej: Ahorros, Comida, etc." : "Ej: Error de carga, diferencia de caja..."}
              value={description}
              onChangeText={setDescription}
              multiline
            />
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={isWalletPickerVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsWalletPickerVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setIsWalletPickerVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Destino</Text>
            </View>
            <FlatList
              data={destinationWallets}
              keyExtractor={item => item.id}
              ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.simpleModalItem}
                  onPress={() => {
                    setToWalletId(item.id);
                    setIsWalletPickerVisible(false);
                  }}
                >
                  <Text style={[
                    styles.simpleModalItemText, 
                    toWalletId === item.id && styles.simpleModalItemTextActive
                  ]}>
                    {item.name}
                  </Text>
                  {toWalletId === item.id && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      <View style={styles.footer}>
        <Button 
          label={isSaving ? "Procesando..." : (mode === 'transfer' ? "Realizar Transferencia" : "Confirmar Ajuste")} 
          onPress={mode === 'transfer' ? handleTransfer : handleAdjustment}
          disabled={isSaving || (mode === 'transfer' && !toWalletId) || !amount}
        />
      </View>
      </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: Colors.background,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    height: 56,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.strokeSubtle,
  },
  headerTitle: { 
    fontSize: 18, 
    fontFamily: FontFamily.bold, 
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  backBtn: { 
    width: 44, 
    height: 44, 
    justifyContent: 'center', 
    alignItems: 'flex-start',
    marginLeft: -10,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    marginVertical: 16,
    gap: 12,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: Colors.surfaceMuted,
  },
  activeTab: { backgroundColor: Colors.primary },
  tabText: { fontSize: 14, fontFamily: FontFamily.medium, color: Colors.textSecondary },
  activeTabText: { color: Colors.white, fontFamily: FontFamily.bold },
  scrollContent: { 
    paddingTop: 10, 
    paddingBottom: 40,
  },
  innerContent: {
    paddingHorizontal: Spacing.xl,
    width: '100%',
  },
  section: { 
    marginBottom: 24,
    width: '100%',
  },
  label: {
    fontSize: 12,
    fontFamily: FontFamily.bold,
    color: Colors.textTertiary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  walletStaticCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.surfaceMuted,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.strokeSubtle,
    gap: 12,
    width: '100%',
    overflow: 'hidden',
  },
  walletIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  walletName: { fontSize: 16, fontFamily: FontFamily.bold, color: Colors.textPrimary },
  walletBalance: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  swapIconContainer: { alignItems: 'center', marginVertical: -10, zIndex: 10 },
  selectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceMuted,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.strokeSubtle,
    width: '100%',
    overflow: 'hidden',
  },
  selectContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  selectIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectValue: { fontSize: 16, fontFamily: FontFamily.bold, color: Colors.textPrimary },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: Colors.strokeSubtle,
    overflow: 'hidden',
    width: '100%',
  },
  currencySymbol: { fontSize: 24, fontFamily: FontFamily.bold, color: Colors.textPrimary },
  amountInput: {
    flex: 1,
    width: 0, // Force flex to determine width
    fontSize: 32,
    fontFamily: FontFamily.bold,
    color: Colors.textPrimary,
    textAlign: 'right',
    padding: 0,
  },
  adjustmentHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  inputFull: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: Colors.textPrimary,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: Colors.strokeSubtle,
    width: '100%',
  },
  footer: { 
    padding: Spacing.xl, 
    borderTopWidth: 1, 
    borderTopColor: Colors.strokeSubtle,
    backgroundColor: Colors.white,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    maxHeight: '60%',
  },
  modalHeader: { marginBottom: 20 },
  modalTitle: { fontSize: 20, fontFamily: FontFamily.bold },
  simpleModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  simpleModalItemText: { fontSize: 16, color: Colors.textPrimary },
  simpleModalItemTextActive: { fontFamily: FontFamily.bold, color: Colors.primary },
  itemSeparator: { height: 1, backgroundColor: Colors.strokeSubtle },
  emptyText: { fontSize: 14, color: Colors.textTertiary, fontStyle: 'italic' }
});
