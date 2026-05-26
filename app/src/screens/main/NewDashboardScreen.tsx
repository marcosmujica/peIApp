import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Colors, FontFamily, Shadows, BorderRadius, Spacing } from '@/constants/theme';
import { Typography, Card } from '@/components/ui';
import { getLocalTickets, LocalTicket, mergeServerTickets } from '@/storage/tickets.local';
import { getLocalWallets, LocalWallet, mergeServerWallets } from '@/storage/wallets.local';
import { walletsApi } from '@/api/wallets.api';
import { ticketsApi } from '@/api/tickets.api';
import { processWalletsWithTickets } from '@/utils/walletCalculations';

export const NewDashboardScreen: React.FC = () => {
  const navigation = useNavigation();
  const [wallets, setWallets] = useState<LocalWallet[]>([]);
  const [tickets, setTickets] = useState<LocalTicket[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (isRefreshing = false) => {
    if (isRefreshing) setRefreshing(true);
    
    try {
      // 1. Quick local load
      const [localTickets, localWallets] = await Promise.all([
        getLocalTickets(),
        getLocalWallets()
      ]);
      setWallets(processWalletsWithTickets(localWallets, localTickets));
      setTickets(localTickets);

      // 2. Server Sync
      const [serverWallets, serverTickets] = await Promise.all([
        walletsApi.getMyWallets(),
        ticketsApi.getMyTickets()
      ]);

      const mergedWallets = await mergeServerWallets(serverWallets);
      const mergedTickets = await mergeServerTickets(serverTickets);
      
      setWallets(processWalletsWithTickets(mergedWallets, mergedTickets));
      setTickets(mergedTickets);
    } catch (err) {
      console.error("[NewDashboard.loadData] Error:", err);
    } finally {
      if (isRefreshing) setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  // --- Insights financieros cruzados ---
  const insights = useMemo(() => {
    if (wallets.length === 0) return [];

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const items: Array<{ id: string; text: string; type: 'warning' | 'info' | 'success'; walletId?: string }> = [];

    // Datos globales
    const activeWallets = wallets.filter(w => (w.balance || 0) !== 0 || (w.totalIncomes || 0) > 0 || (w.totalExpenses || 0) > 0);
    const totalBalance = wallets.reduce((s, w) => s + (w.balance || 0), 0);
    const totalPendingIncome = wallets.reduce((s, w) => s + (w.pendingIncomes || 0), 0);
    const totalPendingExpense = wallets.reduce((s, w) => s + (w.pendingExpenses || 0), 0);
    const totalOverdue = wallets.reduce((s, w) => s + (w.overdueCount || 0), 0);

    // Tickets del mes
    const monthTickets = tickets.filter(t => {
      const d = new Date(t.createdAt);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear && t.status !== 'cancelled';
    });
    const totalIncomeMonth = monthTickets.reduce((s, t) => t.type === 'income' ? s + t.amount : s, 0);
    const totalExpenseMonth = monthTickets.reduce((s, t) => t.type === 'expense' ? s + t.amount : s, 0);

    // 1. Billeteras con saldo negativo
    const negativeWallets = wallets.filter(w => (w.balance || 0) < 0);
    if (negativeWallets.length > 0) {
      if (negativeWallets.length === 1) {
        items.push({ id: 'neg1', text: `"${negativeWallets[0].name}" tiene saldo negativo.`, type: 'warning', walletId: negativeWallets[0].id });
      } else {
        items.push({ id: 'neg', text: `Tenés ${negativeWallets.length} billeteras con saldo negativo.`, type: 'warning' });
      }
    }

    // 2. Tickets vencidos
    if (totalOverdue > 0) {
      items.push({ id: 'overdue', text: `Hay ${totalOverdue} ticket${totalOverdue > 1 ? 's' : ''} vencido${totalOverdue > 1 ? 's' : ''} sin resolver.`, type: 'warning' });
    }

    // 3. Gastos superan ingresos este mes
    if (totalExpenseMonth > totalIncomeMonth && totalIncomeMonth > 0) {
      items.push({ id: 'deficit', text: `Gastaste más de lo que ingresaste este mes.`, type: 'warning' });
    }

    // 4. Pendiente por cobrar alto
    if (totalPendingIncome > totalBalance && totalPendingIncome > 0) {
      items.push({ id: 'pending_collect', text: `Tenés $${totalPendingIncome.toLocaleString('es-AR')} pendiente de cobro.`, type: 'info' });
    }

    // 5. Billetera concentra >70% del gasto
    if (activeWallets.length > 1) {
      const walletExpenses = activeWallets.map(w => ({ wallet: w, expenses: w.totalExpenses || 0 }));
      const totalExp = walletExpenses.reduce((s, we) => s + we.expenses, 0);
      const topSpender = walletExpenses.sort((a, b) => b.expenses - a.expenses)[0];
      if (totalExp > 0 && topSpender.expenses / totalExp > 0.7) {
        items.push({ id: 'concentrated', text: `"${topSpender.wallet.name}" concentra la mayor parte de tus gastos.`, type: 'info', walletId: topSpender.wallet.id });
      }
    }

    // 6. Flujo positivo general
    if (totalIncomeMonth > totalExpenseMonth * 1.3 && totalExpenseMonth > 0 && items.filter(i => i.type === 'warning').length === 0) {
      items.push({ id: 'positive', text: `Buen mes: tus ingresos superan a los gastos con margen.`, type: 'success' });
    }

    // 7. Balance general saludable
    if (totalBalance > 0 && negativeWallets.length === 0 && totalOverdue === 0 && items.length === 0) {
      items.push({ id: 'healthy', text: `Tus billeteras están en buen estado. Todo en orden.`, type: 'success' });
    }

    // Si no hay datos suficientes
    if (items.length === 0 && activeWallets.length === 0) {
      items.push({ id: 'nodata', text: `Registrá movimientos para ver insights de tus finanzas.`, type: 'info' });
    }

    return items.slice(0, 4); // Máximo 4 insights
  }, [wallets, tickets]);

  const { includedByCurrency, excludedByCurrency } = useMemo(() => {
    const included: Record<string, { wallets: LocalWallet[], total: number }> = {};
    const excluded: Record<string, { wallets: LocalWallet[] }> = {};
    
    wallets.forEach(w => {
      // Regla: No mostrar billeteras con saldo 0
      if ((w.balance || 0) === 0) return;

      const curr = w.currency || 'UYU';
      if (w.includeInGeneralBalance !== false) {
        if (!included[curr]) included[curr] = { wallets: [], total: 0 };
        included[curr].wallets.push(w);
        included[curr].total += (w.balance || 0);
      } else {
        if (!excluded[curr]) excluded[curr] = { wallets: [] };
        excluded[curr].wallets.push(w);
      }
    });

    return {
      includedByCurrency: Object.entries(included).sort((a, b) => a[0].localeCompare(b[0])),
      excludedByCurrency: Object.entries(excluded).sort((a, b) => a[0].localeCompare(b[0]))
    };
  }, [wallets]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Typography variant="headingH3" style={styles.title}>Resumen</Typography>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={Colors.primary} />}
      >
        {/* INSIGHTS FINANCIEROS */}
        {insights.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            {insights.map(insight => (
              <TouchableOpacity
                key={insight.id}
                style={styles.insightCard}
                activeOpacity={0.7}
                onPress={() => {
                  if (insight.walletId) {
                    (navigation as any).navigate('MainTabs', { 
                      screen: 'Billeteras', 
                      params: { screen: 'WalletDetails', params: { walletId: insight.walletId } } 
                    });
                  }
                }}
              >
                <View style={styles.insightIcon}>
                  <Ionicons 
                    name={insight.type === 'warning' ? 'sparkles' : insight.type === 'success' ? 'sparkles' : 'sparkles'} 
                    size={16} 
                    color="#7C3AED" 
                  />
                </View>
                <Typography variant="bodySmall" style={styles.insightText}>
                  {insight.text}
                </Typography>
                {insight.walletId && (
                  <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* SECCION: DINERO DISPONIBLE */}
        {includedByCurrency.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Typography variant="labelSmall" color="secondary" style={styles.mainSectionTitle}>DINERO DISPONIBLE PARA USAR</Typography>
            {includedByCurrency.map(([currency, data]) => (
              <Card key={currency} style={styles.currencyCard}>
                <View style={styles.currencyHeader}>
                  <Typography variant="headingH4" color="primary">{currency}</Typography>
                  <Typography variant="bodySmall" color="secondary" style={{ color: data.total < 0 ? Colors.alertsError : Colors.textSecondary }}>
                    Total: ${Math.abs(data.total).toLocaleString('es-AR')}
                  </Typography>
                </View>

                {data.wallets.sort((a,b) => (b.balance || 0) - (a.balance || 0)).map(wallet => {
                  const balance = wallet.balance || 0;
                  const groupTotal = Math.abs(data.total);
                  const percentage = groupTotal > 0 
                    ? Math.round((balance / groupTotal) * 100) 
                    : 0;
                  
                  return (
                    <TouchableOpacity 
                      key={wallet.id} 
                      style={styles.walletRow}
                      onPress={() => (navigation as any).navigate('MainTabs', { 
                        screen: 'Billeteras', 
                        params: { screen: 'WalletDetails', params: { walletId: wallet.id } } 
                      })}
                      activeOpacity={0.7}
                    >
                      <View style={styles.walletInfo}>
                        <Typography variant="bodyBaseStrong">{wallet.name}</Typography>
                        <View style={styles.percentageBarContainer}>
                          <View style={[
                            styles.percentageBar, 
                            { 
                              width: `${Math.min(100, Math.max(0, percentage))}%`,
                              backgroundColor: balance < 0 ? '#E5E7EB' : '#196342'
                            }
                          ]} />
                        </View>
                      </View>
                      <View style={styles.walletAmounts}>
                        <Typography variant="bodyBaseStrong" style={{ color: balance < 0 ? Colors.alertsError : Colors.textPrimary }}>
                          ${Math.abs(balance).toLocaleString('es-AR')}
                        </Typography>
                        <Typography variant="captionBase" color="secondary" style={styles.percentageText}>{percentage}%</Typography>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </Card>
            ))}
          </View>
        )}

        {/* SECCION: OTRAS BILLETERAS */}
        {excludedByCurrency.length > 0 && (
          <View>
            <Typography variant="labelSmall" color="secondary" style={styles.mainSectionTitle}>OTRAS BILLETERAS (NO INCLUIDAS)</Typography>
            
            <View style={styles.notIncludedWarning}>
              <View style={styles.warningIconContainer}>
                <Ionicons name="alert-circle" size={20} color="#b45309" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.warningText}>
                  El dinero de estas billeteras solo estará disponible para usar si se transfiere a la billetera "Cobros sin billetera".
                </Text>
              </View>
            </View>
            {excludedByCurrency.map(([currency, data]) => (
              <Card key={currency} style={styles.currencyCard}>
                <View style={styles.currencyHeader}>
                  <Typography variant="headingH4" color="secondary">{currency}</Typography>
                </View>
                {data.wallets.map(wallet => (
                  <TouchableOpacity 
                    key={wallet.id} 
                    style={styles.walletRow}
                    onPress={() => (navigation as any).navigate('MainTabs', { 
                      screen: 'Billeteras', 
                      params: { screen: 'WalletDetails', params: { walletId: wallet.id } } 
                    })}
                    activeOpacity={0.7}
                  >
                    <Typography variant="bodyBase" color="secondary">{wallet.name}</Typography>
                    <Typography variant="bodyBase" color="secondary" style={{ color: (wallet.balance || 0) < 0 ? Colors.alertsError : Colors.textSecondary }}>
                      ${Math.abs(wallet.balance || 0).toLocaleString('es-AR')}
                    </Typography>
                  </TouchableOpacity>
                ))}
              </Card>
            ))}
          </View>
        )}

        {wallets.length === 0 && !refreshing && (
          <View style={styles.emptyState}>
            <Typography variant="bodyBase" color="secondary" align="center">
              No hay billeteras registradas para mostrar el resumen.
            </Typography>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.strokeSubtle,
    backgroundColor: Colors.white,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  currencyCard: {
    marginBottom: 16,
    padding: 16,
  },
  currencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.strokeSubtle,
    paddingBottom: 8,
  },
  section: {
    marginBottom: 8,
  },
  mainSectionTitle: {
    marginBottom: 12,
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  sectionTitle: {
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  walletRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  walletInfo: {
    flex: 1,
    marginRight: 16,
  },
  walletAmounts: {
    alignItems: 'end',
  },
  percentageBarContainer: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginTop: 6,
    width: '100%',
  },
  percentageBar: {
    height: '100%',
    backgroundColor: '#196342',
    borderRadius: 3,
  },
  percentageText: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  notIncludedWarning: {
    backgroundColor: '#fffdf0',
    borderColor: '#fef3c7',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
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
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  insightIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightText: {
    flex: 1,
    color: '#6B7280',
    lineHeight: 20,
  },
});
