import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/RootNavigator';
import { Colors, FontFamily, Shadows, BorderRadius, Spacing } from '@/constants/theme';
import { Typography, Button, Badge } from '@/components/ui';
import { getLocalWallets, LocalWallet } from '@/storage/wallets.local';
import { getLocalTickets, LocalTicket } from '@/storage/tickets.local';
import { useAuthStore } from '@/store/auth.store';
import { walletsApi } from '@/api/wallets.api';
import { ticketsApi } from '@/api/tickets.api';
import { getSmartDisplayName, getSmartAvatarUrl } from '@/utils/userDisplay';
import { normalizeUrl } from '@/utils/normalizeUrl';

type Props = NativeStackScreenProps<RootStackParamList, 'SplitWallet'>;

interface MemberBalance {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  income: number;
  expense: number;
  net: number;
  diff: number; // What they owe (>0) or are owed (<0)
}

interface Settlement {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
}

export const SplitWalletScreen: React.FC<Props> = ({ route, navigation }) => {
  const { walletId } = (route.params as any) || {};
  const { user } = useAuthStore();
  const [wallet, setWallet] = useState<LocalWallet | null>(null);
  const [tickets, setTickets] = useState<LocalTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDividing, setIsDividing] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmLabel?: string;
    cancelLabel?: string;
    type?: 'confirm' | 'success' | 'error';
  }>({
    visible: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    loadData();
  }, [walletId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [wallets, allTickets] = await Promise.all([
        getLocalWallets(),
        getLocalTickets(),
      ]);

      const w = wallets.find(x => x.id === walletId);
      if (w) {
        setWallet(w);
      }

      const walletTickets = allTickets.filter(t => t.walletId === walletId && t.status !== 'cancelled');
      setTickets(walletTickets);
    } catch (err) {
      console.error('Error loading data for split:', err);
    } finally {
      setLoading(false);
    }
  };

  const balances = useMemo(() => {
    if (!wallet) return [];

    const members = wallet.members || [
      { userId: user?.phoneNumber || 'me', displayName: user?.displayName || 'Yo', role: 'owner' }
    ];

    const stats: Record<string, { income: number; expense: number }> = {};
    members.forEach(m => {
      stats[m.userId] = { income: 0, expense: 0 };
    });

    tickets.forEach(t => {
      // We assume ownerId is the one who performed the movement
      const uid = t.ownerId;
      if (stats[uid]) {
        if (t.type === 'income') stats[uid].income += t.amount;
        else stats[uid].expense += t.amount;
      }
    });

    const memberBalances: MemberBalance[] = members.map(m => {
      const s = stats[m.userId] || { income: 0, expense: 0 };
      return {
        userId: m.userId,
        phone: m.phone,
        displayName: m.displayName,
        avatarUrl: m.avatarUrl,
        income: s.income,
        expense: s.expense,
        net: s.income - s.expense,
        diff: 0,
      };
    });

    const totalNet = memberBalances.reduce((acc, curr) => acc + curr.net, 0);
    const fairShare = totalNet / memberBalances.length;

    memberBalances.forEach(mb => {
      // diff > 0 means they have MORE than fair share (they owe)
      // diff < 0 means they have LESS than fair share (they are owed)
      // Actually, if Net = Income - Expense. 
      // If I spent 100, Net = -100. If fairShare = -50.
      // Net - fairShare = -100 - (-50) = -50. (I am owed 50)
      mb.diff = mb.net - fairShare;
    });

    return memberBalances;
  }, [wallet, tickets, user]);

  const settlements = useMemo(() => {
    const debtors = balances
      .filter(b => b.diff > 0.01)
      .map(b => ({ ...b }))
      .sort((a, b) => b.diff - a.diff);
    
    const creditors = balances
      .filter(b => b.diff < -0.01)
      .map(b => ({ ...b, diff: Math.abs(b.diff) }))
      .sort((a, b) => b.diff - a.diff);

    const result: Settlement[] = [];
    let dIdx = 0;
    let cIdx = 0;

    while (dIdx < debtors.length && cIdx < creditors.length) {
      const debtor = debtors[dIdx];
      const creditor = creditors[cIdx];
      const amount = Math.min(debtor.diff, creditor.diff);

      if (amount > 0.01) {
        result.push({
          fromId: debtor.userId,
          fromPhone: debtor.phone,
          fromName: debtor.displayName,
          toId: creditor.userId,
          toPhone: creditor.phone,
          toName: creditor.displayName,
          amount,
        });
      }

      debtor.diff -= amount;
      creditor.diff -= amount;

      if (debtor.diff < 0.01) dIdx++;
      if (creditor.diff < 0.01) cIdx++;
    }

    return result;
  }, [balances]);

  const handleDivideMoney = async () => {
    console.log('[SplitWalletScreen] handleDivideMoney clicked. Settlements:', settlements.length);
    if (settlements.length === 0) {
      setModalConfig({
        visible: true,
        title: 'Todo al día',
        message: 'No hay deudas pendientes entre los miembros.',
        onConfirm: () => setModalConfig(prev => ({ ...prev, visible: false })),
        confirmLabel: 'Entendido'
      });
      return;
    }

    setModalConfig({
      visible: true,
      title: 'Dividir Dinero',
      message: `Se crearán ${settlements.length} tickets de cobro/pago para nivelar los saldos. ¿Confirmar?`,
      type: 'confirm',
      onConfirm: () => {
        setModalConfig(prev => ({ ...prev, visible: false }));
        processReconciliation();
      },
      confirmLabel: 'Confirmar',
      cancelLabel: 'Volver'
    });
  };

  const processReconciliation = async () => {
    console.log('[SplitWalletScreen] Starting reconciliation...');
    setIsDividing(true);
    try {
      const res = await walletsApi.reconcile(walletId, settlements.map(s => ({
        fromId: s.fromId,
        toId: s.toId,
        amount: s.amount
      })));
      
      console.log('[SplitWalletScreen] Reconciliation response:', res);
      if (res.success) {
        setModalConfig({
          visible: true,
          title: '¡Éxito!',
          message: `Se han generado ${res.count} tickets de conciliación correctamente.`,
          type: 'success',
          onConfirm: () => {
            setModalConfig(prev => ({ ...prev, visible: false }));
            navigation.goBack();
          },
          confirmLabel: 'Continuar'
        });
      } else {
        throw new Error('No se pudo procesar la conciliación');
      }
    } catch (err) {
      console.error('[SplitWalletScreen] Error in reconciliation:', err);
      setModalConfig({
        visible: true,
        title: 'Error',
        message: 'No se pudieron crear los tickets de conciliación. Por favor intenta de nuevo.',
        type: 'error',
        onConfirm: () => setModalConfig(prev => ({ ...prev, visible: false })),
        confirmLabel: 'Cerrar'
      });
    } finally {
      setIsDividing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
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
        <Typography variant="headingH3">Dividir Gastos</Typography>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
          <Typography variant="captionBase" color="secondary" style={{ flex: 1, marginLeft: 8 }}>
            Calculamos cuánto gastó e ingresó cada uno para que todos queden a mano.
          </Typography>
        </View>

        <Typography variant="labelSmall" color="secondary" style={styles.sectionTitle}>Resumen por Miembro</Typography>
        {balances.map((mb) => {
          const identifier = mb.phone || mb.userId;
          const avatarUrl = getSmartAvatarUrl(identifier, mb.avatarUrl);
          const displayName = getSmartDisplayName(identifier, mb.displayName);
          return (
            <View key={mb.userId} style={styles.memberRow}>
              <View style={styles.memberAvatar}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
                ) : (
                  <Typography variant="labelBase" color="secondary">{displayName.charAt(0)}</Typography>
                )}
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Typography variant="bodyBaseStrong">{displayName}</Typography>
                <Typography variant="captionBase" color="tertiary">
                  Gastó: ${mb.expense.toLocaleString('es-AR')} · Cobró: ${mb.income.toLocaleString('es-AR')}
                </Typography>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Typography 
                  variant="bodyBaseStrong" 
                  style={{ color: mb.diff > 0 ? Colors.destructive : Colors.alertsSuccess }}
                >
                  {mb.diff > 0 ? `Debe $${mb.diff.toLocaleString('es-AR')}` : mb.diff < 0 ? `Le deben $${Math.abs(mb.diff).toLocaleString('es-AR')}` : 'Al día'}
                </Typography>
              </View>
            </View>
          );
        })}

        <Typography variant="labelSmall" color="secondary" style={[styles.sectionTitle, { marginTop: 24 }]}>Pagos Propuestos</Typography>
        {settlements.length > 0 ? (
          settlements.map((s, idx) => {
            const fromAvatar = getSmartAvatarUrl(s.fromPhone || s.fromId);
            const fromName = getSmartDisplayName(s.fromPhone || s.fromId, s.fromName);
            const toName = getSmartDisplayName(s.toPhone || s.toId, s.toName);
            
            return (
              <View key={idx} style={styles.settlementCard}>
                <View style={styles.settlementMain}>
                  <View style={styles.settlementPerson}>
                    {fromAvatar ? (
                      <Image source={{ uri: fromAvatar }} style={{ width: 32, height: 32, borderRadius: 16, marginBottom: 4 }} />
                    ) : (
                      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                        <Typography variant="labelSmall" color="secondary">{fromName.charAt(0)}</Typography>
                      </View>
                    )}
                    <Typography variant="captionBase" color="tertiary">Paga</Typography>
                    <Typography variant="bodyBaseStrong">{fromName}</Typography>
                  </View>
                  <Ionicons name="arrow-forward" size={20} color={Colors.textTertiary} />
                  <View style={styles.settlementPerson}>
                    <Typography variant="captionBase" color="tertiary">Recibe</Typography>
                    <Typography variant="bodyBaseStrong">{toName}</Typography>
                  </View>
                </View>
                <View style={styles.settlementAmount}>
                  <Typography variant="headingH3" color="primary">${s.amount.toLocaleString('es-AR')}</Typography>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={48} color={Colors.alertsSuccess} />
            <Typography variant="bodyBase" color="secondary" style={{ marginTop: 12 }}>Todo está equilibrado.</Typography>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button 
          label={isDividing ? "Procesando..." : "Dividir Dinero"} 
          onPress={handleDivideMoney}
          disabled={settlements.length === 0 || isDividing}
          variant="primary"
        />
      </View>

      <Modal
        visible={modalConfig.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalConfig(prev => ({ ...prev, visible: false }))}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconContainer}>
              {modalConfig.type === 'success' ? (
                <Ionicons name="checkmark-circle" size={50} color={Colors.alertsSuccess} />
              ) : modalConfig.type === 'error' ? (
                <Ionicons name="alert-circle" size={50} color={Colors.destructive} />
              ) : (
                <Ionicons name="help-circle" size={50} color={Colors.primary} />
              )}
            </View>
            
            <Typography variant="headingH3" style={styles.modalTitle}>{modalConfig.title}</Typography>
            <Typography variant="bodyBase" color="secondary" style={styles.modalMessage}>
              {modalConfig.message}
            </Typography>

            <View style={styles.modalButtons}>
              {modalConfig.cancelLabel && (
                <TouchableOpacity 
                  onPress={() => setModalConfig(prev => ({ ...prev, visible: false }))}
                  style={styles.modalCancelBtn}
                >
                  <Typography variant="bodyBaseStrong" color="secondary">{modalConfig.cancelLabel}</Typography>
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                onPress={modalConfig.onConfirm}
                style={[
                  styles.modalConfirmBtn, 
                  { backgroundColor: modalConfig.type === 'error' ? Colors.destructive : Colors.primary }
                ]}
              >
                <Typography variant="bodyBaseStrong" style={{ color: 'white' }}>
                  {modalConfig.confirmLabel || 'Aceptar'}
                </Typography>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.strokeSubtle,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  content: { flex: 1, padding: 20 },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: BorderRadius.md,
    marginBottom: 24,
    alignItems: 'center',
  },
  sectionTitle: { marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: BorderRadius.card,
    marginBottom: 12,
    ...Shadows.card,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  settlementCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.card,
    padding: 20,
    marginBottom: 16,
    ...Shadows.card,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  settlementMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  settlementPerson: { flex: 1, alignItems: 'center' },
  settlementAmount: {
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.strokeSubtle,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.strokeSubtle,
    backgroundColor: Colors.background,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    ...Shadows.card,
  },
  modalIconContainer: {
    marginBottom: 16,
  },
  modalTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  modalConfirmBtn: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.button,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.button,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.strokeSubtle,
  },
});
