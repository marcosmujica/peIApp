import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getLocalWallets, LocalWallet } from '@/storage/wallets.local';
import { ticketsApi } from '@/api/tickets.api';
import { addLocalTicket } from '@/storage/tickets.local';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';
import { GENERAL_RUBROS_GASTOS, WALLET_RUBROS_MAP, getRubroLabel, getPartitionedRubros } from '@/constants/rubros';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { Colors, BorderRadius, Shadows, Spacing, FontFamily } from '@/constants/theme';

const formatThousands = (val: string) => {
  const numeric = val.replace(/[^0-9]/g, '');
  if (!numeric) return '';
  return numeric.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const parseThousands = (val: string) => {
  return parseFloat(val.replace(/\./g, '')) || 0;
};

export const QuickEntryScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const { showToast } = useUIStore();
  const [wallets, setWallets] = useState<LocalWallet[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [isWalletModalVisible, setWalletModalVisible] = useState(false);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = React.useRef(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWallets = async () => {
      try {
        const local = await getLocalWallets();
        setWallets(local);
        if (local.length > 0) {
          const defaultWalletId = user?.defaultWalletId && local.some(w => w.id === user.defaultWalletId)
            ? user.defaultWalletId
            : local[0].id;
          setSelectedWalletId(defaultWalletId);
        }
      } catch (err) {
        console.error("Error loading wallets", err);
      } finally {
        setLoading(false);
      }
    };
    fetchWallets();
  }, [user?.defaultWalletId]);

  const selectedWallet = useMemo(() => 
    wallets.find(w => w.id === selectedWalletId), 
    [wallets, selectedWalletId]
  );

  const categories = useMemo(() => {
    if (!selectedWallet) return [];
    
    let enabledIds: string[] = [];
    if (selectedWallet.enabledCategories && selectedWallet.enabledCategories.length > 0) {
      enabledIds = selectedWallet.enabledCategories
        .filter(c => c.type === 'expense')
        .map(e => e.categoryKey);
    } else {
      const walletType = selectedWallet.type || 'otro';
      const mapping = WALLET_RUBROS_MAP[walletType] || WALLET_RUBROS_MAP['otro'];
      enabledIds = mapping.gastos;
    }

    const general = GENERAL_RUBROS_GASTOS;
    return general
      .filter(r => enabledIds.includes(r.id))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [selectedWallet]);

  const handleAmountChange = (rubroId: string, value: string) => {
    setAmounts(prev => ({
      ...prev,
      [rubroId]: formatThousands(value)
    }));
  };

  const handleSave = async () => {
    if (isSavingRef.current) return;
    const activeEntries = Object.entries(amounts).filter(([_, val]) => val && parseThousands(val) > 0);
    
    if (activeEntries.length === 0) {
      Alert.alert('Nada que guardar', 'Ingresa al menos un importe en alguna categoría.');
      return;
    }

    if (!selectedWalletId) return;

    const count = activeEntries.length;
    const walletName = selectedWallet?.name || '';

    isSavingRef.current = true;
    setIsSaving(true);
    navigation.goBack(); // Cierre instantáneo

    try {
      for (const [rubroId, value] of activeEntries) {
        const parsedAmount = parseThousands(value);
        const categoryLabel = getRubroLabel(rubroId, 'expense');
        
        const createDto = {
          walletId: selectedWalletId,
          type: 'expense' as const,
          amount: parsedAmount,
          currency: selectedWallet?.currency || 'USD',
          description: categoryLabel,
          dueDate: new Date(),
          status: 'completed' as const,
          rubro: rubroId,
          source: 'quick_entry',
        };

        let serverTicket: any = null;
        try {
          serverTicket = await ticketsApi.createTicket(createDto);
          
          try {
            await ticketsApi.recordPayment(serverTicket.ticketId, {
              amount: parsedAmount,
              paymentMethod: selectedWallet?.defaultPaymentMethod || 'cash',
              description: 'Saldado rápido',
            });
          } catch (payErr) {
            console.warn("Failed to record payment on server, but ticket was created", payErr);
          }

          await addLocalTicket({
            ...createDto,
            id: serverTicket.ticketId,
            ownerId: user?.id || serverTicket.ownerId || '',
            dueDate: createDto.dueDate.toISOString(),
            synced: true,
            createdAt: serverTicket.createdAt,
            amountPaid: parsedAmount,
          } as any);
        } catch (err) {
          console.warn("Failed to save to server, saving locally", err);
          await addLocalTicket({
            ...createDto,
            id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            ownerId: user?.id || '',
            dueDate: createDto.dueDate.toISOString(),
            synced: false,
            createdAt: new Date().toISOString(),
          } as any);
        }
      }
      // Mostrar toast de éxito global
      showToast(`Se crearon ${count} tickets y se marcaron como pagados en ${walletName}`, 'success');
    } catch (err) {
      console.error("Error in background save", err);
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#333" />
          </TouchableOpacity>
          <Typography variant="headingH3">Carga Rápida</Typography>
          <TouchableOpacity 
            onPress={handleSave} 
            disabled={isSaving} 
            style={styles.saveButtonHeader}
            activeOpacity={0.7}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Typography variant="labelBaseStrong" style={{ color: Colors.primary }}>
                Guardar
              </Typography>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ marginBottom: 12 }}>
            <View style={{ backgroundColor: '#f0fdf4', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#dcfce7' }}>
              <Typography variant="bodySmall" color={Colors.textSecondary} style={{ color: '#166534' }}>
                Anota rápido tus gastos del día. Se guardarán automáticamente como pagos completados.
              </Typography>
            </View>
          </View>

          <View style={styles.walletSelectorContainer}>
            <Typography variant="labelSmall" color={Colors.textTertiary} style={{ marginLeft: 16, marginBottom: 8 }}>
              Billetera:
            </Typography>
            <TouchableOpacity 
              style={styles.walletCombo} 
              onPress={() => setWalletModalVisible(true)}
            >
              <Ionicons name="wallet-outline" size={18} color={Colors.primary} />
              <Typography variant="labelBase" style={{ flex: 1, marginLeft: 8 }}>
                {selectedWallet?.name || 'Seleccionar billetera'}
              </Typography>
              <Ionicons name="chevron-down" size={18} color="#666" />
            </TouchableOpacity>
          </View>

          <Typography variant="labelSmall" color={Colors.textTertiary} style={{ marginBottom: 12, marginTop: 12 }}>
            Importes por categoría:
          </Typography>
          {categories.map(cat => {
            if (cat.isSeparator) {
              return (
                <View key="separator" style={{ paddingVertical: 16, alignItems: 'center' }}>
                  <View style={{ height: 1, backgroundColor: '#EEE', width: '100%' }} />
                  <Typography variant="labelSmall" color={Colors.textTertiary} style={{ marginTop: 8, textTransform: 'uppercase' }}>Otras categorías</Typography>
                </View>
              );
            }
            return (
              <View key={cat.id} style={styles.categoryRow}>
                <View style={styles.categoryInfo}>
                  <Ionicons name={cat.icon as any} size={20} color="#666" style={{ marginRight: 10 }} />
                  <Typography variant="labelBase">{cat.label}</Typography>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  keyboardType="numeric"
                  value={amounts[cat.id] ? '$' + amounts[cat.id] : ''}
                  onChangeText={(val) => handleAmountChange(cat.id, val)}
                  placeholderTextColor="#999"
                />
              </View>
            );
          })}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={isWalletModalVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setWalletModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Typography variant="headingH3" style={{ marginBottom: 20 }}>Billeteras</Typography>
              <FlatList
                data={wallets}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.modalItem} 
                    onPress={() => { setSelectedWalletId(item.id); setWalletModalVisible(false); }}
                  >
                    <Typography variant="labelBase">{item.name}</Typography>
                    {selectedWalletId === item.id && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF9F6' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  walletSelectorContainer: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEE', backgroundColor: 'white' },
  walletCombo: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', marginHorizontal: 16, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, backgroundColor: 'white', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#EEE', ...Shadows.card },
  categoryInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  input: { 
    width: 150, 
    height: 48, 
    backgroundColor: '#F5F5F6', 
    borderRadius: 12, 
    paddingHorizontal: 16, 
    paddingRight: 12,
    textAlign: 'right', 
    fontSize: 20, 
    color: '#000000', 
    fontFamily: FontFamily.bold,
    borderWidth: 0,
    // @ts-ignore
    outlineStyle: 'none'
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontFamily: FontFamily.bold,
    color: '#363630',
    textAlign: 'right',
    marginLeft: 8,
    paddingRight: 12,
    borderWidth: 0,
    // @ts-ignore
    outlineStyle: 'none',
  },
  saveButtonHeader: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(20,51,39,0.4)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: 'white', borderRadius: 24, padding: 24, maxHeight: '70%', ...Shadows.cardElevated },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
});
