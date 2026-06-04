import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StatusBar, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/auth.store';
import { useContactsStore, getContactNameStatic, getContactAvatarStatic } from '@/store/contacts.store';
import { getLocalTickets, LocalTicket, mergeServerTickets, isTicketChatUnread } from '@/storage/tickets.local';
import { getLocalWallets, LocalWallet, mergeServerWallets } from '@/storage/wallets.local';
import { walletsApi } from '@/api/wallets.api';
import { ticketsApi } from '@/api/tickets.api';
import { SYSTEM_WALLET_NAME } from '@/constants';
import { TransactionItem, Typography, LogoPei, WalletCard } from '@/components/ui';
import { Colors, FontFamily, Shadows } from '@/constants/theme';
import { getRubroIcon, getRubroLabel } from '@/constants/rubros';

import { processWalletsWithTickets, calculatePendingSummary, PendingSummary } from '@/utils/walletCalculations';
import { normalizeUrl } from '@/utils/url.util';

/**
 * DASHBOARD FINA V2 - CALMA FINANCIERA
 * Implements Figma node 392:22624
 */
export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const { loadContacts } = useContactsStore();
  const [tickets, setTickets] = useState<LocalTicket[]>([]);
  const [wallets, setWallets] = useState<LocalWallet[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);
  const timelineRef = useRef<ScrollView>(null);
  const scrollX = useRef(0);

  const scrollTimeline = (direction: 'left' | 'right') => {
    if (timelineRef.current) {
      const scrollAmount = 250;
      const newX = direction === 'left'
        ? Math.max(0, scrollX.current - scrollAmount)
        : scrollX.current + scrollAmount;

      timelineRef.current.scrollTo({
        x: newX,
        animated: true,
      });
      scrollX.current = newX;
    }
  };

  const loadData = useCallback(async (isRefreshing = false) => {
    if (isRefreshing) setRefreshing(true);
    setOffline(false);

    // 1. Carga rápida desde local
    const [localTickets, localWallets] = await Promise.all([
      getLocalTickets(),
      getLocalWallets()
    ]);

    const walletsWithStats = processWalletsWithTickets(localWallets, localTickets);

    setTickets(localTickets.filter((t: any) => t.status === 'pending'));
    setWallets(walletsWithStats);

    // 2. Sincronización con el servidor
    try {
      const [serverWallets, serverTickets] = await Promise.all([
        walletsApi.getMyWallets(),
        ticketsApi.getMyTickets()
      ]);

      const mergedWallets = await mergeServerWallets(serverWallets);
      const mergedTickets = await mergeServerTickets(serverTickets);

      const walletsFinal = processWalletsWithTickets(mergedWallets, mergedTickets);

      const allPending = mergedTickets.filter((t: any) => t.status === 'pending');

      setWallets(walletsFinal);
      setTickets(allPending); // Store all pending tickets instead of just a slice
    } catch (error) {
      console.warn("[Dashboard] Offline mode", error);
      setOffline(true);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadData();
    loadContacts();
    // Auto-register for push notifications if missing
    const checkPushToken = async () => {
      const { user, token, updateUser } = useAuthStore.getState();
      if (user && !user.notificationId && token && Platform.OS !== 'web') {
        const { registerForPushNotificationsAsync, saveNotificationId } = require('@/services/notification.service');
        try {
          const pushToken = await registerForPushNotificationsAsync();
          if (pushToken) {
            await saveNotificationId(user.phoneNumber, pushToken, token);
            updateUser({ notificationId: pushToken });
          }
        } catch (err) {
          console.error("[Dashboard] Push registration failed", err);
        }
      }
    };
    checkPushToken();
  }, [loadData]));

  const groupedBalances = useMemo(() => {
    const groups: Record<string, { balance: number; incomes: number; expenses: number }> = {};

    wallets
      .filter(w => w.includeInGeneralBalance !== false)
      .forEach(w => {
        const curr = w.currency || 'UYU';
        if (!groups[curr]) {
          groups[curr] = { balance: 0, incomes: 0, expenses: 0 };
        }
        groups[curr].balance += (w.balance || 0);
        groups[curr].incomes += ((w as any).pendingIncomes || 0);
        groups[curr].expenses += ((w as any).pendingExpenses || 0);
      });

    return Object.entries(groups)
      .map(([currency, totals]) => ({
        currency,
        ...totals
      }))
      .sort((a, b) => {
        // Priority: UYU, then USD, then alphabetical
        if (a.currency === 'UYU') return -1;
        if (b.currency === 'UYU') return 1;
        if (a.currency === 'USD') return -1;
        if (b.currency === 'USD') return 1;
        return a.currency.localeCompare(b.currency);
      });
  }, [wallets]);

  // --- Insights financieros dinámicos ---
  const insights = useMemo(() => {
    if (wallets.length === 0) return [];

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const items: Array<{ id: string; text: string; walletId?: string; negative?: boolean }> = [];

    const totalBalance = wallets.filter(w => w.includeInGeneralBalance !== false).reduce((s, w) => s + (w.balance || 0), 0);
    const totalOverdue = wallets.reduce((s, w) => s + (w.overdueCount || 0), 0);

    // Tickets del mes actual
    const monthTickets = tickets.filter(t => {
      const d = new Date(t.createdAt || t.dueDate);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const allTickets = [...tickets, ...monthTickets.filter(t => !tickets.find(p => p.id === t.id))];
    const monthIncome = allTickets.filter(t => t.type === 'income' && t.status !== 'cancelled' && new Date(t.createdAt).getMonth() === currentMonth).reduce((s, t) => s + t.amount, 0);
    const monthExpense = allTickets.filter(t => t.type === 'expense' && t.status !== 'cancelled' && new Date(t.createdAt).getMonth() === currentMonth).reduce((s, t) => s + t.amount, 0);

    // Semana actual vs promedio
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekExpense = allTickets.filter(t => t.type === 'expense' && t.status !== 'cancelled' && new Date(t.createdAt) >= weekStart).reduce((s, t) => s + t.amount, 0);
    const avgWeekExpense = monthExpense > 0 ? monthExpense / 4 : 0;

    // 1. Saldo negativo
    const negWallets = wallets.filter(w => (w.balance || 0) < 0);
    if (negWallets.length === 1) {
      items.push({ id: 'neg', text: `"${negWallets[0].name}" tiene saldo negativo.`, walletId: negWallets[0].id, negative: true });
    } else if (negWallets.length > 1) {
      items.push({ id: 'neg', text: `Tenés ${negWallets.length} billeteras con saldo negativo.`, negative: true });
    }

    // 2. Tickets vencidos
    if (totalOverdue > 0) {
      items.push({ id: 'overdue', text: `Hay ${totalOverdue} ticket${totalOverdue > 1 ? 's' : ''} vencido${totalOverdue > 1 ? 's' : ''} sin resolver.`, negative: true });
    }

    // 3. Gasto semanal por encima del promedio
    if (weekExpense > avgWeekExpense * 1.3 && avgWeekExpense > 0) {
      items.push({ id: 'week_high', text: 'Gastaste más de lo habitual esta semana.', negative: true });
    }

    // 4. Gastos superan ingresos
    if (monthExpense > monthIncome && monthIncome > 0) {
      items.push({ id: 'deficit', text: 'Tus gastos superan a los ingresos este mes.', negative: true });
    }

    // 5. Billetera concentra gastos
    const activeW = wallets.filter(w => (w.totalExpenses || 0) > 0);
    if (activeW.length > 1) {
      const totalExp = activeW.reduce((s, w) => s + (w.totalExpenses || 0), 0);
      const top = activeW.sort((a, b) => (b.totalExpenses || 0) - (a.totalExpenses || 0))[0];
      if (totalExp > 0 && (top.totalExpenses || 0) / totalExp > 0.7) {
        items.push({ id: 'concentrated', text: `"${top.name}" concentra la mayor parte de tus gastos.`, walletId: top.id });
      }
    }

    // 6. Todo bien
    if (items.length === 0 && totalBalance > 0) {
      items.push({ id: 'ok', text: 'Tus finanzas están en buen estado. Todo en orden.' });
    }

    // 7. Buen mes
    if (items.length === 0 && monthIncome > monthExpense * 1.3 && monthExpense > 0) {
      items.push({ id: 'good', text: 'Buen mes: ingresaste más de lo que gastaste.' });
    }

    return items.slice(0, 3);
  }, [wallets, tickets]);

  const pendingSummary = useMemo(() => {
    return calculatePendingSummary(tickets);
  }, [tickets]);

  const groupedTickets = useMemo(() => {
    const sorted = [...tickets].sort((a, b) => {
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : new Date(a.createdAt).getTime();
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : new Date(b.createdAt).getTime();
      return dateA - dateB; // Chronological order for pending
    });

    const groups: Record<string, typeof tickets> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    sorted.slice(0, 10).forEach(ticket => { // Show up to 10 grouped tickets
      const date = ticket.dueDate ? new Date(ticket.dueDate) : new Date(ticket.createdAt);
      date.setHours(0, 0, 0, 0);

      let dateKey = date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });

      // Special labels
      if (date.getTime() === today.getTime()) dateKey = 'Hoy';
      else if (date.getTime() === today.getTime() - 86400000) dateKey = 'Ayer';
      else if (date.getTime() === today.getTime() + 86400000) dateKey = 'Mañana';

      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(ticket);
    });

    return Object.entries(groups);
  }, [tickets]);

  const sortedWallets = useMemo(() => {
    return [...wallets].sort((a, b) => {
      const isNegA = (a.balance || 0) < 0;
      const isNegB = (b.balance || 0) < 0;
      const overdueA = (a as any).overdueCount || 0;
      const overdueB = (b as any).overdueCount || 0;
      if (isNegA !== isNegB) return isNegA ? -1 : 1;
      if (overdueA !== overdueB) return overdueB - overdueA;
      return a.name.localeCompare(b.name);
    });
  }, [wallets]);

  const navigateToHistory = (group: any, currency?: string) => {
    const params: any = { filter: group.filter, currency };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (group.label === 'Atrasado') {
      params.startDate = null;
      params.endDate = yesterday.toISOString();
    } else if (group.dateRange === 'today') {
      params.startDate = today.toISOString();
      params.endDate = today.toISOString();
    } else if (group.dateRange === 'week') {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      params.startDate = tomorrow.toISOString();
      params.endDate = nextWeek.toISOString();
    } else if (group.dateRange === 'restOfMonth') {
      const afterNextWeek = new Date(today);
      afterNextWeek.setDate(today.getDate() + 8);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      params.startDate = afterNextWeek.toISOString();
      params.endDate = monthEnd.toISOString();
    }

    navigation.navigate('Historial', params);
  };

  return (
    <SafeAreaView className="bg-background" style={{ flex: 1, backgroundColor: Colors.background }}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" />

      {/* TOOLBAR TOP */}
      <View className="flex-row items-center justify-between px-4 pb-6 pt-2">
        <View className="flex-1">
          <LogoPei size={24} tintColor="#000000" />
        </View>

        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            className="w-10 h-10 rounded-full bg-white items-center justify-center"
            style={{ borderWidth: 1, borderColor: '#eceae3', ...Shadows.card }}
            onPress={() => navigation.navigate('Settings')}
          >
            <Ionicons name="settings-outline" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: Colors.accent, ...Shadows.card }}
            onPress={() => navigation.navigate('QuickEntry')}
          >
            <Ionicons name="flash" size={20} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: Colors.primary, ...Shadows.card }}
            onPress={() => navigation.navigate('AddMovementModal')}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 16, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />}
      >
        {offline && (
          <View className="flex-row items-center justify-center gap-2 py-3 bg-secondary rounded-xl">
            <Ionicons name="cloud-offline-outline" size={14} color="#6b6b6b" />
            <Text className="text-xs text-text-secondary">Sin conexión</Text>
          </View>
        )}

        {/* SALDO TOTAL CARD */}
        <View style={{ backgroundColor: Colors.white, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: Colors.strokeSubtle, paddingBottom: 20, ...Shadows.card }}>
          <TouchableOpacity
            className="flex-row items-center justify-between mb-2"
            onPress={() => navigation.navigate('Dashboard')}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center gap-1">
              <Text style={{ fontSize: 20, fontFamily: FontFamily.medium, lineHeight: 24, color: Colors.textPrimary }}>Dinero para usar</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.textPrimary} style={{ marginLeft: 4, marginTop: 2 }} />
            </View>
          </TouchableOpacity>

          {groupedBalances.length > 0 ? (
            groupedBalances.map((group, idx) => (
              <View key={group.currency} style={{ marginTop: idx > 0 ? 20 : 8 }}>
                <View className="flex-row items-baseline gap-2 mb-3">
                  <Text style={{ fontSize: 16, fontFamily: FontFamily.medium, color: Colors.textSecondary }}>
                    {group.currency}
                  </Text>
                  <Text style={{
                    fontSize: 32,
                    fontFamily: FontFamily.bold,
                    lineHeight: 32,
                    color: group.balance < 0 ? '#c05050' : Colors.textPrimary
                  }}>
                    ${Math.abs(group.balance).toLocaleString('es-AR')}
                  </Text>
                </View>

                <View className="flex-row items-center justify-between">
                  <View className="flex-col">
                    <View className="flex-row items-center mb-1">
                      <Text className="text-[13px] font-sans text-[#a8a69e]">Tengo para cobrar</Text>
                    </View>
                    <Text style={{ fontSize: 17, fontFamily: FontFamily.bold, color: Colors.primary }}>
                      ${group.incomes.toLocaleString('es-AR')}
                    </Text>
                  </View>
                  <View className="flex-col items-end">
                    <View className="flex-row items-center mb-1">
                      <Text className="text-[13px] font-sans text-[#a8a69e]">Me falta pagar</Text>
                    </View>
                    <Text className="text-[17px] font-heading text-[#c05050]">
                      ${Math.abs(group.expenses).toLocaleString('es-AR')}
                    </Text>
                  </View>
                </View>
                {idx < groupedBalances.length - 1 && (
                  <View className="h-[1px] bg-[#eceae3] mt-5" />
                )}
              </View>
            ))
          ) : (
            <View className="py-4">
              <Text className="text-[15px] text-[#a8a69e] text-center">No hay datos para mostrar</Text>
            </View>
          )}

          {insights.length > 0 && (
            <View style={{
              backgroundColor: '#f8f7f2',
              borderRadius: 24,
              padding: 16,
              marginTop: 20,
              borderWidth: 1,
              borderColor: '#eceae3'
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', ...Shadows.card }}>
                  <Ionicons name="sparkles" size={14} color="#7465b5" />
                </View>
                <Text style={{ fontSize: 13, fontFamily: FontFamily.bold, color: '#7465b5' }}>
                  Inteligencia Financiera
                </Text>
              </View>

              <View style={{ gap: 10 }}>
                {insights.map((insight, idx) => (
                  <TouchableOpacity
                    key={insight.id}
                    onPress={() => {
                      if (insight.walletId) {
                        navigation.navigate('Billeteras', { screen: 'WalletDetails', params: { walletId: insight.walletId } } as any);
                      }
                    }}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      paddingVertical: 2
                    }}
                  >
                    <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: insight.negative ? '#c05050' : '#7465b5', opacity: 0.5 }} />
                    <Text style={{
                      flex: 1,
                      fontSize: 14,
                      fontFamily: FontFamily.regular,
                      lineHeight: 20,
                      color: insight.negative ? '#c05050' : '#363630'
                    }}>
                      {insight.text}
                    </Text>
                    {insight.walletId && (
                      <Ionicons name="chevron-forward" size={14} color="#a8a69e" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* MIS BILLETERAS CARD */}
        <View className="bg-white rounded-[24px] p-4 shadow-sm border border-[#eceae3]">
          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity
              onPress={() => navigation.navigate('Billeteras')}
              className="flex-row items-center gap-2 active:opacity-70"
            >
              <Text className="text-xl font-['PlusJakarta-Medium'] text-[#1a1a1a]">Mis billeteras</Text>
              <Ionicons name="chevron-forward" size={16} color="#1a1a1a" />
            </TouchableOpacity>
          </View>

          <View className="flex-col gap-0">
            {sortedWallets.length > 0 ? sortedWallets.slice(0, 3).map((wallet) => (
              <WalletCard
                key={wallet.id}
                {...wallet}
                id={wallet.id}
                balance={wallet.balance ?? 0}
                onPress={() => navigation.navigate('Billeteras', { screen: 'WalletDetails', params: { walletId: wallet.id, walletName: wallet.name } } as any)}
                onPressPending={() => navigation.navigate('MainTabs', { screen: 'Historial', params: { walletId: wallet.id, filter: 'pending' } } as any)}
                variant="flat"
              />
            )) : (
              <View className="py-4 items-center">
                <Text className="text-sm font-sans text-[#a8a69e]">No tienes billeteras</Text>
              </View>
            )}
          </View>
        </View>

        {/* TRANSACCIONES PENDIENTES */}
        <View className="bg-white rounded-[24px] p-4 shadow-sm border border-[#eceae3]">
          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity
              onPress={() => navigation.navigate('Historial')}
              className="flex-row items-center gap-2 active:opacity-70"
            >
              <Text className="text-xl font-['PlusJakarta-Medium'] text-[#1a1a1a]">Tickets Pendientes</Text>
              <Ionicons name="chevron-forward" size={16} color="#1a1a1a" />
            </TouchableOpacity>
          </View>
          {/* PENDING SUMMARY TIMELINE CONSOLIDATED */}
          <View className="mb-2 mt-2">
            <View className="px-4 mb-4">
              <Text style={{ fontSize: 12, fontFamily: FontFamily.bold, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Línea de tiempo • Pendientes
              </Text>
            </View>

            <View className="relative">
              {/* Connecting Line */}
              <View
                style={{
                  position: 'absolute',
                  top: 18,
                  left: 40,
                  right: 40,
                  height: 2,
                  backgroundColor: '#eceae3',
                  zIndex: 0
                }}
              />

              {/* Scroll Buttons */}
              <TouchableOpacity
                onPress={() => scrollTimeline('left')}
                style={{
                  position: 'absolute',
                  left: 4,
                  top: '30%',
                  zIndex: 10,
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: '#eceae3',
                  ...Shadows.card
                }}
              >
                <Ionicons name="chevron-back" size={20} color={Colors.textPrimary} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => scrollTimeline('right')}
                style={{
                  position: 'absolute',
                  right: 4,
                  top: '30%',
                  zIndex: 10,
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: '#eceae3',
                  ...Shadows.card
                }}
              >
                <Ionicons name="chevron-forward" size={20} color={Colors.textPrimary} />
              </TouchableOpacity>

              <ScrollView
                ref={timelineRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                onScroll={(e) => {
                  scrollX.current = e.nativeEvent.contentOffset.x;
                }}
                scrollEventThrottle={16}
                contentContainerStyle={{ paddingHorizontal: 36, gap: 12, paddingBottom: 8 }}
              >
                {[
                  { key: 'overdue', label: 'Atrasado', color: '#c05050', filter: 'overdue', icon: 'alert-circle' },
                  { key: 'today', label: 'Hoy', color: Colors.primary, filter: 'pending', dateRange: 'today', icon: 'today' },
                  { key: 'next7Days', label: 'Próx. 7 días', color: '#6366f1', filter: 'pending', dateRange: 'week', icon: 'calendar' },
                  { key: 'restOfMonth', label: 'Resto del mes', color: '#8b5cf6', filter: 'pending', dateRange: 'restOfMonth', icon: 'hourglass' },
                ].map((group, i) => {
                  const summaryEntries = Object.entries(pendingSummary);
                  const currenciesData = summaryEntries
                    .map(([curr, sum]) => ({ currency: curr, data: (sum as any)[group.key] }))
                    .filter(c => c.data && c.data.count > 0);

                  const hasData = currenciesData.length > 0;
                  const totalTickets = currenciesData.reduce((acc, c) => acc + c.data.count, 0);

                  return (
                    <TouchableOpacity
                      key={i}
                      onPress={() => navigateToHistory(group)}
                      activeOpacity={0.7}
                      style={{ width: 160, alignItems: 'center' }}
                    >
                      {/* Node Dot */}
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: 'white',
                          borderWidth: 2,
                          borderColor: hasData ? group.color : '#eceae3',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 1,
                          marginBottom: 12,
                          ...Platform.select({
                            web: { boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.1)' },
                            default: {
                              shadowColor: "#000",
                              shadowOffset: { width: 0, height: 1 },
                              shadowOpacity: 0.1,
                              shadowRadius: 2,
                              elevation: 2
                            }
                          })
                        }}
                      >
                        <Ionicons
                          name={group.icon as any}
                          size={18}
                          color={hasData ? group.color : '#a8a69e'}
                        />
                      </View>

                      {/* Info Card */}
                      <View
                        style={{
                          backgroundColor: '#f8f7f2',
                          padding: 14,
                          borderRadius: 24,
                          borderWidth: 1,
                          borderColor: hasData ? group.color + '20' : '#eceae3',
                          width: '100%',
                        }}
                      >
                        <Text style={{ fontSize: 14, fontFamily: FontFamily.bold, color: Colors.textSecondary, textAlign: 'center', marginBottom: 12 }}>
                          {group.label}
                        </Text>

                        {hasData ? (
                          <View style={{ gap: 12 }}>
                            {currenciesData.map((c, cIdx) => {
                              const netAmount = c.data.incomes - c.data.expenses;
                              return (
                                <View key={c.currency} style={{ gap: 4 }}>
                                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={{ fontSize: 12, fontFamily: FontFamily.bold, color: Colors.textTertiary }}>{c.currency}</Text>
                                    <Text style={{
                                      fontSize: 15,
                                      fontFamily: FontFamily.bold,
                                      color: netAmount < 0 ? '#c05050' : Colors.textPrimary
                                    }}>
                                      ${Math.abs(netAmount).toLocaleString('es-AR')}
                                    </Text>
                                  </View>

                                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', opacity: 0.8 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                      <Ionicons name="arrow-up" size={10} color={Colors.primary} />
                                      <Text style={{ fontSize: 12, fontFamily: FontFamily.bold, color: Colors.primary }}>
                                        ${Math.abs(c.data.incomes).toLocaleString('es-AR')}
                                      </Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                      <Ionicons name="arrow-down" size={10} color="#c05050" />
                                      <Text style={{ fontSize: 12, fontFamily: FontFamily.bold, color: '#c05050' }}>
                                        ${Math.abs(c.data.expenses).toLocaleString('es-AR')}
                                      </Text>
                                    </View>
                                  </View>
                                  {cIdx < currenciesData.length - 1 && (
                                    <View style={{ height: 1, backgroundColor: '#eceae3', marginTop: 4 }} />
                                  )}
                                </View>
                              );
                            })}
                          </View>
                        ) : (
                          <Text style={{ fontSize: 10, color: '#a8a69e', textAlign: 'center' }}>Sin movimientos</Text>
                        )}

                        {hasData && (
                          <View style={{ marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#eceae3', alignItems: 'center' }}>
                            <Text style={{ fontSize: 10, color: '#a8a69e' }}>
                              {totalTickets} tickets
                            </Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>

          <View className="flex-col gap-0">
            {groupedTickets.length > 0 ? groupedTickets.map(([dateKey, items]) => (
              <View key={dateKey} className="mb-4">
                <Text style={{
                  fontSize: 13,
                  fontFamily: FontFamily.bold,
                  color: '#a8a69e',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                  marginTop: 4
                }}>
                  {dateKey}
                </Text>
                {items.map((item, index) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const dueDate = item.dueDate ? new Date(item.dueDate) : null;
                  if (dueDate) dueDate.setHours(0, 0, 0, 0);

                  const isOverdue = dueDate && dueDate < today;
                  const diffTime = dueDate ? today.getTime() - dueDate.getTime() : 0;
                  const overdueDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

                  const isOwner = user?.phoneNumber === item.ownerUserObj?.phone || (user as any)?.userId === item.ownerId || user?.phoneNumber === item.ownerId;
                  const otherPartyPhone = isOwner ? (item.toUserObj?.phone || item.toUser) : (item.ownerUserObj?.phone || item.ownerId);

                  const otherPartyAvatar = (isOwner
                    ? (item.toUserAvatarUrl || item.toUserObj?.avatarUrl)
                    : (item.ownerAvatarUrl || item.ownerUserObj?.avatarUrl)) || getContactAvatarStatic(otherPartyPhone);

                  let otherPartyName = otherPartyPhone ? getContactNameStatic(otherPartyPhone, otherPartyPhone) : null;

                  // Si otherPartyName parece un UUID o ID interno, lo ocultamos para que no se muestre en pantalla
                  if (otherPartyName && (otherPartyName.includes('-') && otherPartyName.length > 20)) {
                    otherPartyName = null;
                  }

                  const baseSubtitle = `${otherPartyName ? otherPartyName + ' · ' : ''}${new Date(item.dueDate && item.dueDate !== '' ? item.dueDate : item.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}`;
                  const hasUnread = isTicketChatUnread(item, user?.id);
                  const subtitle = hasUnread ? item.lastChatMessage : baseSubtitle;

                  return (
                    <TransactionItem
                      key={item.id}
                      title={item.description || getRubroLabel(item.rubro || (item.type === 'income' ? item.rubroIncome : item.rubroExpense), item.type, (item as any).globalType)}
                      subtitle={subtitle}
                      amount={`$${item.amount.toLocaleString('es-AR')}`}
                      currency={item.currency || 'UYU'}
                      iconName={getRubroIcon(item.rubro || (item.type === 'income' ? item.rubroIncome : item.rubroExpense), item.type, (item as any).globalType) as any}
                      iconColor={item.type === 'income' ? Colors.alertsSuccess : Colors.alertsError}
                      onPress={() => navigation.navigate('AddMovementModal', { ticketId: item.id })}
                      status={isOverdue ? 'overdue' : undefined}
                      overdueDays={isOverdue ? overdueDays : undefined}
                      amountColor={item.type === 'income' ? Colors.textPrimary : Colors.alertsError}
                      avatarUrl={otherPartyAvatar}
                      rating={isOwner ? item.ownerRating : item.participantRating}
                      style={index < items.length - 1 ? { borderBottomWidth: 1, borderBottomColor: '#eceae3' } : {}}
                      hasUnreadChat={hasUnread}
                    />
                  );
                })}
              </View>
            )) : (
              <View className="py-4 items-center">
                <Text className="text-[15px] font-sans text-[#b7b7ae]">No hay tickets pendientes</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

    </SafeAreaView>
  );
};
