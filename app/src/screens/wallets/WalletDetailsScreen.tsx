import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Platform,
  Alert,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FontFamily, Colors, Shadows, BorderRadius } from '@/constants/theme';
import { getLocalTickets, LocalTicket, isTicketChatUnread } from '@/storage/tickets.local';
import { useAuthStore } from '@/store/auth.store';
import { useContactsStore } from '@/store/contacts.store';
import { getSmartDisplayName, getSmartAvatarUrl } from '@/utils/userDisplay';
import { RootStackParamList } from '@/navigation/RootNavigator';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { useUIStore } from '@/store/ui.store';
import { Typography } from '@/components/ui/Typography';
import { TransactionItem } from '@/components/ui/TransactionItem';
import { Badge } from '@/components/ui/Badge';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { getRubroLabel, getRubroIcon } from '@/constants/rubros';
import { SYSTEM_WALLET_NAME } from '@/constants';
import { calculateWalletStats } from '@/utils/walletCalculations';
import { MonthSummaryPanel, SalesByAmountPanel, SalesByCountPanel, ExpensesByCategoryPanel, GoalsPanel, ActiveWeeksPanel, GainsComparisonPanel, UpcomingPaymentsPanel, WeeklyCashFlowPanel, ActiveHoursPanel, ExpensesByPaymentMethodPanel, IncomeByPaymentMethodPanel, WalletHealthPanel, IncomeExpenseEvolutionPanel } from '@/components/wallet/DashboardPanels';
import { RecentMovementsPanel } from '@/components/dashboard/RecentMovementsPanel';
import { Modal, FlatList, TextInput } from 'react-native';
import { getLocalWallets, saveLocalWallets, LocalWallet, WalletGoal } from '@/storage/wallets.local';
import { walletsApi } from '@/api/wallets.api';
import { normalizeUrl } from '@/utils/url.util';
import NativeDatePicker from '@/components/ui/NativeDatePicker';

const AVAILABLE_PANELS = [
  { id: 'resumen_mes', title: 'Resumen del mes', subtitle: 'Ingresos y egresos del mes actual', icon: 'calendar' },
  { id: 'indicador_situacion', title: 'Indicador de como voy', subtitle: 'Situación general de la billetera', icon: 'pulse' },
  { id: 'ventas_dia_monto', title: 'Ventas por día ($)', subtitle: 'Gráfica de ingresos por monto', icon: 'bar-chart' },
  { id: 'ventas_dia_cantidad', title: 'Ventas por día (Cantidad)', subtitle: 'Gráfica de ingresos por volumen', icon: 'stats-chart' },
  { id: 'tickets_pendientes', title: 'Lista de tickets pendientes', subtitle: 'Tickets que faltan cobrar o pagar', icon: 'list' },
  { id: 'gastos_mes', title: 'En que gaste este mes', subtitle: 'Gráfico por categoría (Pagados y Pendientes)', icon: 'pie-chart' },
  { id: 'semanas_activas', title: 'Semanas más activas', subtitle: 'Análisis según los últimos 3 meses', icon: 'trending-up' },
  { id: 'comparativo_ganancias', title: 'Comparativo de ganancias', subtitle: 'Últimos 3 meses', icon: 'analytics' },
  { id: 'proximos_pagos', title: 'Próximos tickets a pagar', subtitle: 'Gastos en los próximos 7 días', icon: 'notifications' },
  { id: 'movimiento_dinero_semanal', title: 'Movimiento de dinero semanal', subtitle: 'Últimos 3 meses', icon: 'swap-vertical' },
  { id: 'horarios_activos', title: 'Horarios más activos', subtitle: 'Actividad en el mes', icon: 'time' },
  { id: 'gastos_por_medio_pago', title: 'Cuanto pague por medio de pago', subtitle: 'Gastos según el método', icon: 'wallet' },
  { id: 'cobros_por_medio_pago', title: 'Cuanto cobre por medio de pago', subtitle: 'Ingresos según el método', icon: 'trending-up' },
  { id: 'last_movements', title: 'Últimos movimientos', subtitle: 'Los últimos 10 cobros o pagos', icon: 'time' },
  { id: 'evolucion_ingresos_egresos', title: 'Evolución de ingresos y egresos', subtitle: 'Gráfica comparativa de ingresos (verde) y egresos (rojo) últimos 3 meses', icon: 'analytics' },
];

type Props = NativeStackScreenProps<RootStackParamList, 'WalletDetails'>;

export const WalletDetailsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { walletId, walletName: initialWalletName, walletType = 'Negocio', currency = 'USD', showToast, toastMessage } = route.params;
  const { user } = useAuthStore();
  const { getContactName, loadContacts } = useContactsStore();

  const [wallet, setWallet] = useState<LocalWallet | null>(null);
  const [walletName, setWalletName] = useState(initialWalletName);
  const [screenCurrency, setScreenCurrency] = useState(currency);
  const [tickets, setTickets] = useState<LocalTicket[]>([]);
  const [totals, setTotals] = useState({ income: 0, expense: 0, balance: 0, percentage: 0, pendingIncome: 0, pendingExpense: 0 });
  const [toastAlpha] = useState(new Animated.Value(0));
  const [msg, setMsg] = useState('');
  const [dashboardFilter, setDashboardFilter] = useState<'pending' | 'overdue'>('pending');
  const [isPanelModalVisible, setIsPanelModalVisible] = useState(false);
  const [tempEnabledPanels, setTempEnabledPanels] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Goals State
  const [isGoalsManagerVisible, setIsGoalsManagerVisible] = useState(false);
  const [editingGoal, setEditingGoal] = useState<WalletGoal | null>(null);
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalCurrent, setGoalCurrent] = useState('');
  const [goalDeadline, setGoalDeadline] = useState<Date | null>(null);
  const [showGoalDatePicker, setShowGoalDatePicker] = useState(false);

  const saveGoal = async () => {
    if (!wallet) return;

    if (!goalName.trim()) {
      Alert.alert('Faltan datos', 'Por favor, ingresa un nombre para la meta.');
      return;
    }

    if (!goalTarget.trim()) {
      Alert.alert('Faltan datos', 'Por favor, ingresa un monto objetivo.');
      return;
    }

    try {
      setIsSaving(true);
      if (goalDeadline) {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const deadline = new Date(goalDeadline);
        deadline.setHours(0, 0, 0, 0);

        if (deadline < now) {
          Alert.alert('Fecha inválida', 'La fecha de fin de la meta no puede ser en el pasado.');
          return;
        }
      }

      const target = Number(goalTarget.replace(/\./g, ''));
      const current = Number(goalCurrent) || 0;
      if (isNaN(target)) {
        Alert.alert('Error', 'El monto objetivo no es un número válido.');
        return;
      }

      let updatedGoals = [...(wallet.goals || [])];

      if (editingGoal) {
        updatedGoals = updatedGoals.map(g => g.id === editingGoal.id ? { ...g, name: goalName, targetAmount: target, currentAmount: current, deadline: goalDeadline?.toISOString() } : g);
      } else {
        updatedGoals.push({
          id: Date.now().toString(),
          name: goalName,
          targetAmount: target,
          currentAmount: current,
          deadline: goalDeadline?.toISOString(),
          createdAt: new Date().toISOString()
        });
      }

      const all = await getLocalWallets();
      const idx = all.findIndex(w => w.id === walletId);
      if (idx >= 0) {
        all[idx].goals = updatedGoals;
        await saveLocalWallets(all);
        setWallet(all[idx]);
      }

      // Server Sync
      if (wallet.name !== SYSTEM_WALLET_NAME) {
        try {
          await walletsApi.updateWallet(walletId, { goals: updatedGoals });
        } catch (e) {
          console.error('Failed to sync goals', e);
          // Opcional: Avisar que quedó solo local
        }
      }

      useUIStore.getState().showToast(editingGoal ? 'Meta actualizada' : 'Meta creada', 'success');

      // Success Cleanup
      setTimeout(() => {
        setEditingGoal(null);
        setGoalName('');
        setGoalTarget('');
        setGoalCurrent('');
        setGoalDeadline(null);
        setIsGoalsManagerVisible(false);
      }, 300);
    } catch (err) {
      console.error('saveGoal error:', err);
      Alert.alert('Error', 'Ocurrió un problema al intentar guardar la meta.');
    } finally {
      setIsSaving(false);
    }
  };

  const openGoalModal = (g: WalletGoal) => {
    setEditingGoal(g);
    setGoalName(g.name);
    setGoalTarget(g.targetAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."));
    setGoalCurrent(g.currentAmount.toString());
    setGoalDeadline(g.deadline ? new Date(g.deadline) : null);
  };

  const removeGoal = async (id: string) => {
    if (!wallet) return;
    const updatedGoals = (wallet.goals || []).filter(g => g.id !== id);
    const all = await getLocalWallets();
    const idx = all.findIndex(w => w.id === walletId);
    if (idx >= 0) {
      all[idx].goals = updatedGoals;
      await saveLocalWallets(all);
      setWallet(all[idx]);
    }

    // Server Sync
    try {
      if (wallet.name !== SYSTEM_WALLET_NAME) {
        await walletsApi.updateWallet(walletId, { goals: updatedGoals });
      }
    } catch (e) { console.error('Failed to sync goals (remove)', e); }
  };

  const loadData = useCallback(async (isRefreshing = false) => {
    if (isRefreshing) setRefreshing(true);

    try {
      // 1. Sync with server if refreshing
      if (isRefreshing) {
        const { mergeServerTickets } = await import('@/storage/tickets.local');
        const { mergeServerWallets } = await import('@/storage/wallets.local');
        const { ticketsApi } = await import('@/api/tickets.api');
        const { walletsApi } = await import('@/api/wallets.api');

        const [serverWallets, serverTickets] = await Promise.all([
          walletsApi.getMyWallets(),
          ticketsApi.getMyTickets()
        ]);

        await Promise.all([
          mergeServerWallets(serverWallets),
          mergeServerTickets(serverTickets)
        ]);
      }

      const allWallets = await getLocalWallets();
      const w = allWallets.find(x => x.id === walletId);
      if (w) {
        setWallet(w);
        setWalletName(w.name);
        if (w.currency) setScreenCurrency(w.currency);
      }

      const allTickets = await getLocalTickets();
      const isSystemWallet = w?.name.toLowerCase() === SYSTEM_WALLET_NAME.toLowerCase();
      const walletTickets = allTickets.filter(t => {
        if (t.walletId === walletId) return true;
        if (isSystemWallet && !t.walletId) return true;
        return false;
      });
      setTickets(walletTickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

      const stats = calculateWalletStats(w, allTickets);

      setTotals({
        income: stats.totalIncome,
        expense: stats.totalExpense,
        balance: stats.balance,
        percentage: stats.totalIncome > 0 ? Math.round((stats.balance / stats.totalIncome) * 100) : 0,
        pendingIncome: stats.pendingIncome,
        pendingExpense: stats.pendingExpense
      } as any);
    } catch (err) {
      console.error("[WalletDetails.loadData] Error:", err);
    } finally {
      if (isRefreshing) setRefreshing(false);
    }
  }, [walletId]);

  const onRefresh = () => loadData(true);

  const pendingTickets = useMemo(() => tickets.filter(t => t.status === 'pending'), [tickets]);
  const overdueTickets = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return pendingTickets.filter(t => {
      if (!t.dueDate) return false;
      const due = new Date(t.dueDate);
      due.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays > 1;
    });
  }, [pendingTickets]);

  const filteredTickets = useMemo(() => {
    if (dashboardFilter === 'overdue') return overdueTickets;
    return pendingTickets;
  }, [dashboardFilter, pendingTickets, overdueTickets]);

  const lastMovements = useMemo(() => {
    return tickets
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }, [tickets]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      loadContacts();
    }, [loadData, loadContacts])
  );

  useEffect(() => {
    if (showToast && toastMessage) {
      setMsg(toastMessage);
      Animated.sequence([
        Animated.timing(toastAlpha, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.delay(2000),
        Animated.timing(toastAlpha, { toValue: 0, duration: 250, useNativeDriver: true })
      ]).start();

      // Clean up params so it doesn't show again on reopen
      navigation.setParams({ showToast: false } as any);
    }
  }, [showToast, toastMessage]);

  const handleTogglePanel = (panelId: string) => {
    setTempEnabledPanels(prev =>
      prev.includes(panelId) ? prev.filter(p => p !== panelId) : [...prev, panelId]
    );
  };

  const movePanel = (panelId: string, direction: 'up' | 'down') => {
    setTempEnabledPanels(prev => {
      const index = prev.indexOf(panelId);
      if (index === -1) return prev;

      const newArr = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= newArr.length) return prev;

      [newArr[index], newArr[targetIndex]] = [newArr[targetIndex], newArr[index]];
      return newArr;
    });
  };

  const savePanels = async () => {
    if (!wallet) return;
    try {
      const all = await getLocalWallets();
      const idx = all.findIndex(w => w.id === walletId);
      if (idx >= 0) {
        all[idx].enabledPanels = tempEnabledPanels;
        await saveLocalWallets(all);
        setWallet({ ...wallet, enabledPanels: tempEnabledPanels });
      }

      // Server Sync
      try {
        if (wallet.name !== SYSTEM_WALLET_NAME) {
          await walletsApi.updateWallet(walletId, { enabledPanels: tempEnabledPanels });
        }
      } catch (e) { console.error('Failed to sync enabled panels', e); }

      setIsPanelModalVisible(false);
    } catch (err) {
      console.error("Error saving panels", err);
    }
  };

  const openPanelModal = () => {
    setTempEnabledPanels(wallet?.enabledPanels || []);
    setIsPanelModalVisible(true);
  };
  const CURRENCY_NAMES: Record<string, string> = {
    'ARS': 'Pesos Argentinos',
    'USD': 'Dólares Estadounidenses',
    'EUR': 'Euros',
    'BRL': 'Reales',
    'CLP': 'Pesos Chilenos',
    'UYU': 'Pesos Uruguayos',
    'COP': 'Pesos Colombianos',
    'PYG': 'Guaraníes',
    'PEN': 'Soles',
  };

  const WALLET_TYPE_LABELS: Record<string, string> = {
    'personal': 'Personal',
    'negocio_productos': 'Negocio de productos',
    'negocio_servicios': 'Negocio de servicios',
    'compartido': 'Compartido',
    'community': 'Comunidad',
    'otro': 'Otro',
    'negocio': 'Negocio', // Fallback legacy
  };

  return (
    <SafeAreaView style={styles.container}>
      <>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Typography variant="headingH3" style={styles.headerTitle} numberOfLines={1}>{walletName || 'Billetera'}</Typography>
            <Typography variant="captionBase" color="secondary">
              {CURRENCY_NAMES[screenCurrency] || 'Moneda'} ({screenCurrency})
            </Typography>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.settingsBtn}
              onPress={() => (navigation as any).navigate('WalletSettings', { walletId })}
              activeOpacity={0.7}
            >
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: Colors.white,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: Colors.strokeSubtle,
                ...Shadows.card
              }}>
                <Ionicons name="settings-outline" size={20} color={Colors.textSecondary} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.qrBtnHeader}
              onPress={() => navigation.navigate('GenerateQR', { walletId, currency: screenCurrency })}
              activeOpacity={0.7}
            >
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: Colors.white,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: Colors.strokeSubtle,
                ...Shadows.card
              }}>
                <Ionicons name="qr-code-outline" size={20} color={Colors.textSecondary} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addBtnHeader}
              onPress={() => (navigation as any).navigate('AddMovementModal', { walletId })}
            >
              <Ionicons name="add" size={24} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]} // Android
            />
          }
        >
          {/* Wallet Status Summary & Quick Action */}
          <View style={styles.statusSummary}>
            <View style={styles.statusRow}>
              <View style={styles.statusView}>
                <View style={[
                  styles.statusDot,
                  {
                    backgroundColor: (wallet?.alertThreshold && totals.balance <= wallet.alertThreshold) || totals.balance < 0
                      ? Colors.destructive
                      : (wallet?.warningThreshold && totals.balance <= wallet.warningThreshold)
                        ? Colors.alertsWarning
                        : Colors.alertsSuccess
                  }
                ]}
                />
                <Typography variant="labelSmall" style={{
                  color: (wallet?.alertThreshold && totals.balance <= wallet.alertThreshold) || totals.balance < 0
                    ? Colors.destructive
                    : (wallet?.warningThreshold && totals.balance <= wallet.warningThreshold)
                      ? Colors.alertsWarning
                      : Colors.alertsSuccess
                }}>
                  {(wallet?.alertThreshold && totals.balance <= wallet.alertThreshold) || totals.balance < 0
                    ? 'Atención'
                    : (wallet?.warningThreshold && totals.balance <= wallet.warningThreshold)
                      ? 'Precaución'
                      : 'Todo bien'}
                </Typography>
              </View>

              {wallet?.members && wallet.members.filter(m => m.phone !== user?.phoneNumber).length > 0 && (
                <View style={[styles.membersFacepile, { marginLeft: 0 }]}>
                  {wallet.members
                    .filter(m => m.phone !== user?.phoneNumber)
                    .slice(0, 4)
                    .map((member, idx) => {
                      const avatarUrl = getSmartAvatarUrl(member.phone, member.avatarUrl);
                      const displayName = getSmartDisplayName(member.phone, member.displayName);
                      return (
                        <View
                          key={member.phone}
                          style={[
                            styles.facepileAvatar,
                            idx > 0 && { marginLeft: -18 }
                          ]}
                        >
                          {avatarUrl ? (
                            <Image source={{ uri: normalizeUrl(avatarUrl) }} style={styles.facepileImage} />
                          ) : (
                            <View style={styles.facepilePlaceholder}>
                              <Text style={styles.facepilePlaceholderText}>
                                {displayName.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                          )}
                        </View>
                      );
                    })
                  }
                  {wallet.members.filter(m => m.phone !== user?.phoneNumber).length > 4 && (
                    <View style={[styles.facepileAvatar, styles.facepileMore]}>
                      <Text style={styles.facepileMoreText}>
                        +{wallet.members.filter(m => m.phone !== user?.phoneNumber).length - 4}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              <Badge
                variant={(walletName || '').toLowerCase() === SYSTEM_WALLET_NAME.toLowerCase() ? 'default' : 'paid'}
                label={(walletName || '').toLowerCase() === SYSTEM_WALLET_NAME.toLowerCase() ? 'SISTEMA' : WALLET_TYPE_LABELS[wallet?.type || 'otro']}
              />
            </View>
          </View>

          {/* Wallet Balance Summary Card */}
          <View style={styles.summaryCardContainer}>
            <View style={styles.summaryCard}>
              <TouchableOpacity
                style={styles.balanceHeader}
                onPress={() => navigation.navigate('MainTabs', { screen: 'Historial', params: { walletId, filter: 'all' } } as any)}
              >
                <Text style={styles.balanceLabel}>Dinero para usar</Text>
                <Ionicons name="chevron-forward" size={16} color="#878778" />
              </TouchableOpacity>

              <Text
                style={[styles.balanceValue, { color: totals.balance < 0 ? '#c05050' : '#363630' }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                ${Math.abs(totals.balance).toLocaleString('es-AR')}
              </Text>

              <View style={styles.totalsRow}>
                <View style={styles.totalItem}>
                  <View style={styles.totalLabelRow}>
                    <Text style={styles.totalLabelText}>Tengo para cobrar</Text>
                  </View>
                  <Text style={[styles.totalAmountText, { color: '#16A34A' }]}>
                    ${totals.pendingIncome.toLocaleString('es-AR')}
                  </Text>
                </View>

                <View style={styles.totalItem}>
                  <View style={[styles.totalLabelRow, { justifyContent: 'flex-end' }]}>
                    <Text style={styles.totalLabelText}>Me falta pagar</Text>
                  </View>
                  <Text style={[styles.totalAmountText, { color: '#DC2626', textAlign: 'right' }]}>
                    ${totals.pendingExpense.toLocaleString('es-AR')}
                  </Text>
                </View>
              </View>

              {/* AI Insights Bar */}
              <TouchableOpacity
                style={styles.aiInsightBar}
                onPress={() => (navigation as any).navigate('AIQuestions', { walletId })}
              >
                <View style={styles.aiInsightIconBg}>
                  <Ionicons name="sparkles" size={14} color="#7c3aed" />
                </View>
                <Text style={styles.aiInsightText} numberOfLines={1}>
                  {totals.expense > totals.income
                    ? 'Gastaste más de lo habitual esta semana.'
                    : 'Tus cobros están al día, ¡buen trabajo!'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#A3A3A3" />
              </TouchableOpacity>
            </View>
          </View>

          {wallet?.includeInGeneralBalance === false && (
            <View style={styles.notIncludedWarning}>
              <View style={styles.warningIconContainer}>
                <Ionicons name="alert-circle" size={20} color="#b45309" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.warningText}>
                  El dinero de esta billetera solo estará disponible para usar si se transfiere a la billetera "Cobros sin billetera".
                </Text>
                <TouchableOpacity
                  style={styles.warningAction}
                  onPress={() => (navigation as any).navigate('Transfer', { fromWalletId: walletId })}
                >
                  <Text style={styles.warningActionText}>Hacer una transferencia</Text>
                  <Ionicons name="arrow-forward" size={14} color="#b45309" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* QUICK ACTIONS */}
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => (navigation as any).navigate('Transfer', { fromWalletId: walletId })}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#F3F4F6' }]}>
                <Ionicons name="swap-horizontal" size={22} color="#737373" />
              </View>
              <Text style={styles.quickActionLabel}>Mover dinero entre billeteras / Ajustar el saldo </Text>
            </TouchableOpacity>

            {wallet && wallet.members && wallet.members.length > 0 && (
              <TouchableOpacity
                style={styles.quickActionBtn}
                onPress={() => (navigation as any).navigate('SplitWallet', { walletId })}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: '#F3F4F6' }]}>
                  <Ionicons name="people-outline" size={22} color="#737373" />
                </View>
                <Text style={styles.quickActionLabel}>Dividir Gastos</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* PERMANENT PANELS (CALMA IA and GOALS) */}
          <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => (navigation as any).navigate('AIQuestions', { walletId })}
              style={[styles.aiPreviewCard, { marginBottom: 16 }]}
            >
              <View style={styles.aiPreviewHeader}>
                <View style={styles.aiSparkleIcon}>
                  <Ionicons name="sparkles" size={16} color={Colors.white} />
                </View>
                <Typography variant="bodyBaseStrong" style={{ flex: 1 }}>Calma IA</Typography>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Typography variant="labelSmall" style={{ color: Colors.textSecondary }}>Consultar</Typography>
                  <Ionicons name="chevron-forward" size={14} color={Colors.textSecondary} style={{ marginLeft: 2 }} />
                </View>
              </View>

              <View style={styles.aiEmptyState}>
                <Typography variant="labelSmall" color="secondary" align="center">
                  ¿Tienes dudas sobre esta billetera? Pregúntale a Calma IA.
                </Typography>
              </View>
            </TouchableOpacity>

            {wallet && <GoalsPanel wallet={wallet} tickets={tickets} onManageGoals={() => setIsGoalsManagerVisible(true)} />}
          </View>

          {/* CUSTOM DASHBOARD PANELS */}
          <View style={[styles.section, { marginBottom: 12 }]}>
            <SectionHeader
              title="Resumen"
              actionLabel="Gestionar"
              onAction={openPanelModal}
            />

            {wallet?.enabledPanels && wallet.enabledPanels.length > 0 && (
              <View style={{ marginTop: 12 }}>
                {wallet.enabledPanels.map(panelId => {
                  if (panelId === 'resumen_mes') return <MonthSummaryPanel key={panelId} tickets={tickets} currency={screenCurrency} />;
                  if (panelId === 'ventas_dia_monto') return <SalesByAmountPanel key={panelId} tickets={tickets} currency={screenCurrency} />;
                  if (panelId === 'ventas_dia_cantidad') return <SalesByCountPanel key={panelId} tickets={tickets} currency={screenCurrency} />;
                  if (panelId === 'last_movements') {
                    return (
                      <RecentMovementsPanel
                        key={panelId}
                        movements={lastMovements}
                        userPhoneNumber={user?.phoneNumber}
                        onPressItem={(id) => navigation.navigate('AddMovementModal', { ticketId: id })}
                        onPressViewAll={() => navigation.navigate('MainTabs', { screen: 'Historial', params: { walletId, filter: 'all' } } as any)}
                      />
                    );
                  }

                  if (panelId === 'tickets_pendientes') {
                    return (
                      <View key={panelId} style={styles.pendingPanel}>
                        <View style={styles.pendingPanelHeader}>
                          <Typography variant="bodyLargeStrong" style={{ flex: 1 }}>{dashboardFilter === 'overdue' ? 'Tickets atrasados' : 'Tickets pendientes'}</Typography>
                          <TouchableOpacity
                            onPress={() => navigation.navigate('MainTabs' as any, {
                              screen: 'Historial',
                              params: { walletId, filter: 'all' }
                            })}
                          >
                            <Typography variant="labelSmall" style={{ color: Colors.textSecondary }}>Ver todos</Typography>
                          </TouchableOpacity>
                        </View>

                        <View style={[styles.dashboardFiltersRow, { marginTop: 8, marginBottom: 12 }]}>
                          {[
                            { id: 'pending', label: 'Pendientes', count: pendingTickets.length },
                            { id: 'overdue', label: 'Atrasados', count: overdueTickets.length },
                          ].map(opt => (
                            <TouchableOpacity
                              key={opt.id}
                              onPress={() => setDashboardFilter(opt.id as any)}
                              style={[
                                styles.dashboardFilterPill,
                                dashboardFilter === opt.id && styles.dashboardFilterPillActive
                              ]}
                            >
                              <Typography variant="labelSmall" style={{
                                color: dashboardFilter === opt.id ? Colors.primaryForeground : Colors.textSecondary,
                                fontFamily: dashboardFilter === opt.id ? FontFamily.semibold : FontFamily.medium
                              }}>
                                {opt.label} ({opt.count})
                              </Typography>
                            </TouchableOpacity>
                          ))}
                        </View>

                        {filteredTickets.length > 0 ? (
                          filteredTickets.map((ticket, tIdx) => {
                            const title = ticket.description || getRubroLabel(ticket.rubro || (ticket.type === 'income' ? ticket.rubroIncome : ticket.rubroExpense), ticket.type, ticket.globalType);
                            const otherPartyPhone = ticket.toUserObj?.phone;
                            const otherPartyName = ticket.toUserObj?.displayName;
                            const baseSubtitle = `${otherPartyPhone ? getSmartDisplayName(otherPartyPhone, otherPartyName) + ' • ' : ''}${new Date(ticket.dueDate && ticket.dueDate !== '' ? ticket.dueDate : ticket.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}`;
                            const hasUnread = isTicketChatUnread(ticket, user?.id);
                            const subtitle = hasUnread ? ticket.lastChatMessage : baseSubtitle;

                            return (
                              <TransactionItem
                                key={ticket.id}
                                title={title}
                                subtitle={subtitle}
                                amount={`$${ticket.amount.toLocaleString('es-AR')}`}
                                currency={ticket.currency}
                                iconName={getRubroIcon(ticket.rubro || (ticket.type === 'income' ? ticket.rubroIncome : ticket.rubroExpense), ticket.type, ticket.globalType) as any}
                                iconColor={ticket.type === 'income' ? Colors.alertsSuccess : Colors.alertsError}
                                onPress={() => {
                                  (navigation as any).navigate('AddMovementModal', { walletId, ticketId: ticket.id });
                                }}
                                amountColor={ticket.type === 'income' ? Colors.textPrimary : Colors.alertsError}
                                status={ticket.status === 'pending' && ticket.dueDate && new Date(ticket.dueDate).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0) ? 'overdue' : (ticket.status === 'pending' ? undefined : ticket.status)}
                                overdueDays={ticket.status === 'pending' && ticket.dueDate && new Date(ticket.dueDate).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0) ? Math.max(0, Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(ticket.dueDate).setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24))) : undefined}
                                avatarUrl={ticket.globalType && ticket.globalType !== 'ticket' ? undefined : getSmartAvatarUrl(otherPartyPhone, ticket.toUserObj?.avatarUrl)}
                                hasUnreadChat={hasUnread}
                                style={{
                                  borderBottomWidth: tIdx === filteredTickets.length - 1 ? 0 : 1,
                                  borderBottomColor: Colors.strokeSubtle
                                }}
                              />
                            );
                          })
                        ) : (
                          <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                            <Typography variant="captionBase" color="secondary">No hay tickets pendientes</Typography>
                          </View>
                        )}
                      </View>
                    );
                  }
                  if (panelId === 'gastos_mes') return <ExpensesByCategoryPanel key={panelId} tickets={tickets} currency={screenCurrency} />;
                  if (panelId === 'semanas_activas') return <ActiveWeeksPanel key={panelId} tickets={tickets} currency={screenCurrency} />;
                  if (panelId === 'comparativo_ganancias') return <GainsComparisonPanel key={panelId} tickets={tickets} currency={screenCurrency} />;
                  if (panelId === 'proximos_pagos') return <UpcomingPaymentsPanel key={panelId} tickets={tickets} currency={screenCurrency} onTicketPress={(t) => navigation.navigate('TicketDetails', { ticketId: t.id })} />;
                  if (panelId === 'movimiento_dinero_semanal') return <WeeklyCashFlowPanel key={panelId} tickets={tickets} currency={screenCurrency} />;
                  if (panelId === 'horarios_activos') return <ActiveHoursPanel key={panelId} tickets={tickets} currency={screenCurrency} />;
                  if (panelId === 'gastos_por_medio_pago') return <ExpensesByPaymentMethodPanel key={panelId} tickets={tickets} currency={screenCurrency} />;
                  if (panelId === 'cobros_por_medio_pago') return <IncomeByPaymentMethodPanel key={panelId} tickets={tickets} currency={screenCurrency} />;
                  if (panelId === 'indicador_situacion') return <WalletHealthPanel key={panelId} tickets={tickets} currency={screenCurrency} />;
                  if (panelId === 'evolucion_ingresos_egresos') return <IncomeExpenseEvolutionPanel key={panelId} tickets={tickets} currency={screenCurrency} />;

                  return null;
                })}
              </View>
            )}

            {(!wallet?.enabledPanels || wallet.enabledPanels.length === 0) && (
              <TouchableOpacity
                style={styles.emptyDashboard}
                onPress={openPanelModal}
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle-outline" size={32} color={Colors.textTertiary} />
                <Typography variant="bodyBase" color="secondary" style={{ marginTop: 8 }}>
                  Personalizá tu dashboard
                </Typography>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        {/* PANELS SELECTION MODAL */}
        <Modal
          visible={isPanelModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsPanelModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Typography variant="headingH3">Gestionar Paneles</Typography>
                <TouchableOpacity onPress={() => setIsPanelModalVisible(false)}>
                  <Ionicons name="close" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <FlatList
                data={[
                  ...tempEnabledPanels.map(id => AVAILABLE_PANELS.find(p => p.id === id)).filter(Boolean),
                  ...AVAILABLE_PANELS.filter(p => !tempEnabledPanels.includes(p.id))
                ] as typeof AVAILABLE_PANELS}
                keyExtractor={item => item.id}
                renderItem={({ item, index }) => {
                  const isActive = tempEnabledPanels.includes(item.id);
                  const activeIndex = tempEnabledPanels.indexOf(item.id);
                  const isFirstActive = activeIndex === 0;
                  const isLastActive = activeIndex === tempEnabledPanels.length - 1;

                  return (
                    <View style={[styles.panelChoiceCard, isActive && styles.panelChoiceCardActive]}>
                      <TouchableOpacity
                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                        onPress={() => handleTogglePanel(item.id)}
                      >
                        <View style={[styles.panelChoiceIcon, { backgroundColor: '#F3F4F6' }]}>
                          <Ionicons name={item.icon as any} size={20} color="#737373" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Typography variant="bodyLargeStrong">{item.title}</Typography>
                          <Typography variant="labelSmall" color="secondary">{item.subtitle}</Typography>
                        </View>
                        <Ionicons
                          name={isActive ? "checkbox" : "square-outline"}
                          size={24}
                          color={isActive ? "#171717" : "#D1D5DB"}
                          style={{ marginRight: isActive ? 12 : 0 }}
                        />
                      </TouchableOpacity>

                      {isActive && (
                        <View style={styles.reorderControls}>
                          <TouchableOpacity
                            onPress={() => movePanel(item.id, 'up')}
                            disabled={isFirstActive}
                            style={{ opacity: isFirstActive ? 0.3 : 1 }}
                          >
                            <Ionicons name="chevron-up" size={24} color="#737373" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => movePanel(item.id, 'down')}
                            disabled={isLastActive}
                            style={{ opacity: isLastActive ? 0.3 : 1 }}
                          >
                            <Ionicons name="chevron-down" size={24} color="#737373" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                }}
                contentContainerStyle={{ gap: 12, paddingVertical: 12 }}
              />

              <TouchableOpacity
                style={styles.savePanelsBtn}
                onPress={savePanels}
              >
                <Typography variant="bodyLargeStrong" style={{ color: Colors.white }}>Guardar Cambios</Typography>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* GOALS MANAGER MODAL */}
        <Modal visible={isGoalsManagerVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { height: '80%' }]}>
              <View style={styles.modalHeader}>
                <Typography variant="headingH3">Gestionar Metas</Typography>
                <TouchableOpacity onPress={() => { setIsGoalsManagerVisible(false); setEditingGoal(null); }}>
                  <Ionicons name="close" size={24} color={Colors.textTertiary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                <View style={{ marginBottom: 32 }}>
                  <Typography variant="bodyLargeStrong" style={{ marginBottom: 16 }}>
                    {editingGoal ? 'Editar Meta' : 'Crear Nueva Meta'}
                  </Typography>
                  <TextInput
                    style={{ backgroundColor: '#F3F4F6', height: 48, borderRadius: 8, paddingHorizontal: 12, marginBottom: 12, fontFamily: FontFamily.medium, flex: 1 }}
                    placeholder="Nombre de la meta (Ej. Auto nuevo)"
                    value={goalName}
                    onChangeText={setGoalName}
                  />
                  <TextInput
                    style={{ backgroundColor: '#F3F4F6', height: 48, borderRadius: 8, paddingHorizontal: 12, marginBottom: 16, fontFamily: FontFamily.medium, flex: 1 }}
                    placeholder="Monto objetivo (Ej. 5.000)"
                    keyboardType="numeric"
                    value={goalTarget}
                    onChangeText={(text) => {
                      const numeric = text.replace(/[^0-9]/g, '');
                      setGoalTarget(numeric.replace(/\B(?=(\d{3})+(?!\d))/g, "."));
                    }}
                  />

                  <TouchableOpacity
                    style={{ backgroundColor: '#F3F4F6', height: 48, borderRadius: 8, paddingHorizontal: 12, marginBottom: 16, justifyContent: 'center' }}
                    onPress={() => setShowGoalDatePicker(true)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="bodySmall" color={goalDeadline ? Colors.primary : Colors.textSecondary}>
                        {goalDeadline ? `Fecha fin: ${goalDeadline.toLocaleDateString('es-ES')}` : 'Seleccionar fecha fin (Opcional)'}
                      </Typography>
                      <Ionicons name="calendar-outline" size={18} color={goalDeadline ? Colors.alertsSuccess : Colors.textTertiary} />
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      backgroundColor: (!goalName.trim() || !goalTarget.trim()) ? '#E5E7EB' : Colors.primary,
                      paddingVertical: 14,
                      borderRadius: 1000,
                      alignItems: 'center',
                      opacity: isSaving ? 0.7 : 1
                    }}
                    onPress={saveGoal}
                    disabled={isSaving || !goalName.trim() || !goalTarget.trim()}
                  >
                    <Typography variant="bodyBaseStrong" style={{ color: (!goalName.trim() || !goalTarget.trim()) ? '#9CA3AF' : Colors.white }}>
                      {isSaving ? 'Guardando...' : editingGoal ? 'Guardar Cambios' : 'Añadir Meta'}
                    </Typography>
                  </TouchableOpacity>
                  {editingGoal && (
                    <TouchableOpacity
                      style={{ marginTop: 16, alignItems: 'center' }}
                      onPress={() => { setEditingGoal(null); setGoalName(''); setGoalTarget(''); setGoalCurrent(''); setGoalDeadline(null); }}
                    >
                      <Typography variant="bodyBase" style={{ color: Colors.textSecondary }}>Cancelar Edición</Typography>
                    </TouchableOpacity>
                  )}
                </View>

                {wallet?.goals && wallet.goals.length > 0 && (
                  <View>
                    <Typography variant="bodyLargeStrong" style={{ marginBottom: 12 }}>Metas Existentes</Typography>
                    {wallet.goals.map(g => {
                      const computedCurrentAmount = tickets.reduce((acc, t) => {
                        if (t.status === 'cancelled') return acc;
                        const tTime = new Date(t.dueDate || t.createdAt).setHours(0, 0, 0, 0);
                        const todayTime = new Date().setHours(0, 0, 0, 0);
                        // ingresos - egresos previo al dia (incluyendo hoy)
                        if (tTime <= todayTime) {
                          const amt = Number(t.amountPaid) || 0;
                          return t.type === 'income' ? acc + amt : acc - amt;
                        }
                        return acc;
                      }, 0);

                      return (
                        <View key={g.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FAFAFA', padding: 16, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#E5E5E5' }}>
                          <View style={{ flex: 1, paddingRight: 10 }}>
                            <Typography variant="bodyBaseStrong" style={{ marginBottom: 4 }}>{g.name}</Typography>
                            <Typography variant="labelSmall" color="secondary">
                              Voy: ${Math.round(computedCurrentAmount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")} / de ${Math.round(g.targetAmount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                              {g.deadline && ` · Fin: ${new Date(g.deadline).toLocaleDateString('es-ES')}`}
                            </Typography>
                            <View style={{ height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, marginTop: 8, overflow: 'hidden' }}>
                              <View style={{ height: '100%', backgroundColor: '#10B981', width: `${Math.min(100, Math.max(0, (Number(computedCurrentAmount) / Number(g.targetAmount)) * 100))}%` }} />
                            </View>
                          </View>
                          <TouchableOpacity onPress={() => removeGoal(g.id)} style={{ padding: 8, backgroundColor: '#F5F5F5', borderRadius: 8 }}>
                            <Ionicons name="trash-outline" size={18} color="#737373" />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                )}
              </ScrollView>

              {showGoalDatePicker && (
                <NativeDatePicker
                  value={goalDeadline || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                  onChange={(event, selectedDate) => {
                    // En Android o Web, cerramos al confirmar
                    if (Platform.OS === 'android' || Platform.OS === 'web') {
                      setShowGoalDatePicker(false);
                    }

                    const isSet = !event || event.type === 'set'; // Web envía null pero queremos procesar

                    if (isSet && selectedDate) {
                      const normalized = new Date(selectedDate);
                      normalized.setHours(12, 0, 0, 0);
                      setGoalDeadline(normalized);
                    }
                  }}
                />
              )}

              {showGoalDatePicker && Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={{
                    marginHorizontal: 20,
                    marginBottom: 16,
                    paddingVertical: 14,
                    alignItems: 'center',
                    backgroundColor: '#16A34A',
                    borderRadius: 12,
                    ...Platform.select({
                      web: { boxShadow: '0px 4px 8px rgba(22, 163, 74, 0.2)' },
                      default: {
                        shadowColor: '#16A34A',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.2,
                        shadowRadius: 8,
                        elevation: 4
                      }
                    })
                  }}
                  onPress={() => setShowGoalDatePicker(false)}
                >
                  <Typography variant="bodyBaseStrong" style={{ color: Colors.white }}>Listo</Typography>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Modal>

        {/* Animated Toast */}
        <Animated.View style={[styles.toast, { opacity: toastAlpha, transform: [{ translateY: toastAlpha.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
          <Text style={styles.toastText}>{msg}</Text>
        </Animated.View>
      </>
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
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 0 : 12,
    height: 64,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: FontFamily.bold,
    color: Colors.textPrimary,
  },
  currencySubtitle: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  settingsBtn: {
    padding: 4,
  },
  qrBtnHeader: {
    padding: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addBtnHeader: {
    width: 40,
    height: 40,
    backgroundColor: Colors.primary,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  statusSummary: {
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusView: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
  },
  dateText: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
    color: '#A3A3A3',
  },
  separator: {
    height: 1,
    backgroundColor: Colors.strokeSubtle,
    marginHorizontal: 0,
    marginBottom: 24,
  },
  mainRegisterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eeeeeeff',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    paddingVertical: 8,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 10,
  },
  iconBox: {
    backgroundColor: '#F3F4F6',
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  mainRegisterBtnText: {
    fontSize: 13,
    fontFamily: FontFamily.bold,
    color: '#171717',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: FontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  rowCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  smallCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  incomeCard: {
    backgroundColor: '#F9FAFB',
    borderColor: '#F3F4F6',
  },
  cardLabel: {
    fontSize: 11,
    fontFamily: FontFamily.medium,
    color: '#A3A3A3',
    marginBottom: 8,
  },
  cardValueGreen: {
    fontSize: 20,
    fontFamily: FontFamily.bold,
    color: '#16A34A',
    letterSpacing: -0.5,
  },
  cardValueBlack: {
    fontSize: 20,
    fontFamily: FontFamily.bold,
    color: '#171717',
    letterSpacing: -0.5,
  },
  mainCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  mainCardLabel: {
    fontSize: 11,
    fontFamily: FontFamily.medium,
    color: '#16A34A',
    marginBottom: 4,
  },
  mainCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  mainCardValue: {
    fontSize: 30,
    fontFamily: FontFamily.bold,
    color: '#15803D',
    letterSpacing: -1,
  },
  mainCardPercentageLabel: {
    fontSize: 11,
    fontFamily: FontFamily.medium,
    color: '#16A34A',
    marginBottom: 6,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: '#D1FAE5',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    width: '39%',
    backgroundColor: '#16A34A',
    borderRadius: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
    color: '#A3A3A3',
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  txIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txInfo: {
    flex: 1,
  },
  txTitle: {
    fontSize: 15,
    fontFamily: FontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  txSubtitle: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
  },
  txAmountCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  txAmountGreen: {
    fontSize: 15,
    fontFamily: FontFamily.bold,
    color: '#16A34A',
  },
  txAmountBlack: {
    fontSize: 15,
    fontFamily: FontFamily.bold,
    color: '#171717',
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pendingBadgeText: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    color: '#D97706',
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chatIconBtn: {
    padding: 4,
  },
  txSeparator: {
    height: 1,
    backgroundColor: '#F5F5F5',
    marginTop: 12,
    marginBottom: 16,
  },
  historyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  historyLinkText: {
    fontSize: 13,
    fontFamily: FontFamily.medium,
    color: '#A3A3A3',
  },
  toast: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: Colors.textPrimary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    ...Shadows.md,
    zIndex: 999,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: FontFamily.medium,
  },
  lastMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  avatarMini: {
    width: 18,
    height: 18,
    borderRadius: 9,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
  },
  avatarMiniImg: {
    width: '100%',
    height: '100%',
  },
  avatarMiniPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5E5E5',
  },
  avatarMiniInitial: {
    fontSize: 9,
    fontFamily: FontFamily.bold,
    color: '#737373',
  },
  lastMessageText: {
    fontSize: 13,
    color: '#737373',
    fontFamily: FontFamily.regular,
    flex: 1,
  },
  lastMessageUnread: {
    fontFamily: FontFamily.bold,
    color: '#171717',
  },
  typeBadge: {
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 12,
    fontFamily: FontFamily.bold,
    color: '#374151',
    textTransform: 'uppercase',
  },
  dashboardFiltersRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    marginTop: -4,
  },
  dashboardFilterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.strokeSubtle,
    elevation: 2,
    ...Platform.select({
      web: { boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.1)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
      }
    }),
  },
  dashboardFilterPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    borderWidth: 1.5,
  },
  dashboardFilterLabel: {
    fontSize: 14,
    color: '#737373',
    fontFamily: FontFamily.medium,
  },
  dashboardFilterLabelActive: {
    color: '#171717',
    fontFamily: FontFamily.bold,
  },
  emptyDashboard: {
    marginTop: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dotted',
    borderColor: Colors.strokeSubtle,
  },
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
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  savePanelsBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 1000,
    alignItems: 'center',
    marginTop: 12,
  },
  panelChoiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#FAFAFA',
    gap: 12,
  },
  panelChoiceCardActive: {
    borderColor: '#171717',
    backgroundColor: '#F9FAFB',
  },
  reorderControls: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: '#E5E5E5',
    gap: 4,
  },
  panelChoiceIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiPreviewCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.strokeSubtle,
    ...Shadows.card,
  },
  panelCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.strokeSubtle,
    ...Shadows.card,
  },
  aiPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  aiSparkleIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiHistoryPreviewItem: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
  },
  aiEmptyState: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    alignItems: 'center',
  },
  aiFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f1f1',
    paddingTop: 12,
  },
  aiBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iaChip: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  iaChipText: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
  },
  pendingPanel: {
    paddingVertical: 16,
    marginBottom: 16,
  },
  pendingPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryCardContainer: {
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#f2f2f0',
    ...Shadows.card,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 15,
    fontFamily: FontFamily.medium,
    color: '#878778',
  },
  balanceValue: {
    fontSize: 36,
    fontFamily: FontFamily.bold,
    color: '#363630',
    marginBottom: 24,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  totalItem: {
    flex: 1,
  },
  totalLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  totalIconBg: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalLabelText: {
    fontSize: 13,
    fontFamily: FontFamily.medium,
    color: '#878778',
  },
  totalAmountText: {
    fontSize: 17,
    fontFamily: FontFamily.bold,
  },
  aiInsightBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f3',
    borderRadius: 16,
    padding: 12,
    gap: 12,
  },
  aiInsightIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiInsightText: {
    flex: 1,
    fontSize: 13,
    fontFamily: FontFamily.medium,
    color: '#363630',
  },
  notIncludedWarning: {
    backgroundColor: '#fffdf0',
    borderColor: '#fef3c7',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 24,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  warningIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningText: {
    fontSize: 14,
    fontFamily: FontFamily.medium,
    color: '#b45309',
    lineHeight: 20,
  },
  warningAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  warningActionText: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
    color: '#b45309',
    textDecorationLine: 'underline',
  },
  quickActionsRow: {
    flexDirection: 'column',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 24,
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f2f2f0',
    gap: 12,
    ...Shadows.card,
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 15,
    fontFamily: FontFamily.bold,
    color: '#363630',
  },
  membersFacepile: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  facepileAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Colors.white,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
  },
  facepileImage: {
    width: '100%',
    height: '100%',
  },
  facepilePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5E7EB',
  },
  facepilePlaceholderText: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
    color: '#6B7280',
  },
  facepileMore: {
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -18,
  },
  facepileMoreText: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
    color: '#6B7280',
  },
});
