import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Modal,
  FlatList,
  TouchableWithoutFeedback,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { getLocalTickets, LocalTicket, isTicketChatUnread } from '@/storage/tickets.local';
import { getLocalWallets, LocalWallet } from '@/storage/wallets.local';
import { useAuthStore } from '@/store/auth.store';
import { getSmartAvatarUrl } from '@/utils/userDisplay';
import { TransactionItem } from '@/components/ui';
import { getRubroLabel, getRubroIcon } from '@/constants/rubros';


const parseDateLiteral = (dateStr: string | Date | undefined | null) => {
  if (!dateStr) return null;
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return null;
  // Extraemos año, mes, día independientemente de si es local o UTC, 
  // pero lo tratamos como "el día civil que dice el string"
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

export const CalendarScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<LocalTicket[]>([]);
  const [wallets, setWallets] = useState<LocalWallet[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [isWalletModalVisible, setWalletModalVisible] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchContent = async (isRefreshing = false) => {
    if (isRefreshing) setRefreshing(true);
    else setLoading(true);
    try {
      const [allTickets, allWallets] = await Promise.all([getLocalTickets(), getLocalWallets()]);
      setTickets(allTickets.filter(t => t.status !== 'cancelled'));
      setWallets(allWallets);
    } catch (e) {
      console.warn("Error fetching data for calendar", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchContent();
  }, []);

  const displayedTickets = useMemo(() => {
    if (!selectedWalletId) return tickets;
    return tickets.filter(t => t.walletId === selectedWalletId);
  }, [tickets, selectedWalletId]);

  const monthData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    firstDayOfMonth.setHours(0, 0, 0, 0);
    const firstDayTime = firstDayOfMonth.getTime();

    const todayTime = new Date().setHours(0, 0, 0, 0);

    // Get balance before this month starts, per currency
    let runningBalance: Record<string, number> = {};
    displayedTickets.forEach(t => {
      const tTime = parseDateLiteral(t.dueDate);
      if (tTime && tTime < firstDayTime) {
        let val = 0;
        if (tTime <= todayTime) {
          // Hasta hoy inclusive: lo efectivamente pagado/cobrado
          val = Number(t.amountPaid) || 0;
        } else {
          // A partir de mañana: lo que resta pagar/cobrar
          val = (Number(t.amount) || 0) - (Number(t.amountPaid) || 0);
        }
        const curr = t.currency || 'ARS';
        runningBalance[curr] = (runningBalance[curr] || 0) + (t.type === 'income' ? val : -val);
      }
    });

    const days = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDayOfWeek = new Date(year, month, 1).getDay();

    // Add empty slots
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ day: null, balance: {}, delta: {}, date: null, hasIncomes: false, hasExpenses: false, isToday: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dDate = new Date(year, month, d);
      dDate.setHours(0, 0, 0, 0);
      const dTime = dDate.getTime();

      const dayTickets = displayedTickets.filter(t => parseDateLiteral(t.dueDate) === dTime);

      const delta: Record<string, number> = {};
      dayTickets.forEach(t => {
        let val = 0;
        if (dTime <= todayTime) {
          // Hasta hoy inclusive: lo efectivamente pagado/cobrado
          val = Number(t.amountPaid) || 0;
        } else {
          // A partir de mañana: lo que falta pagar/cobrar
          val = (Number(t.amount) || 0) - (Number(t.amountPaid) || 0);
        }
        const curr = t.currency || 'ARS';
        delta[curr] = (delta[curr] || 0) + (t.type === 'income' ? val : -val);
      });

      Object.keys(delta).forEach(curr => {
        runningBalance[curr] = (runningBalance[curr] || 0) + delta[curr];
      });

      days.push({
        day: d,
        date: dDate,
        balance: { ...runningBalance },
        delta: delta,
        hasIncomes: dayTickets.some(t => t.type === 'income'),
        hasExpenses: dayTickets.some(t => t.type === 'expense'),
        isToday: dTime === todayTime,
      });
    }

    return days;
  }, [displayedTickets, currentDate]);

  const changeMonth = (offset: number) => {
    const next = new Date(currentDate);
    next.setMonth(next.getMonth() + offset);
    setCurrentDate(next);
  };

  const monthName = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Agenda</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchContent(true)}
            tintColor={Colors.primary}
          />
        }
      >
        <View style={styles.filtersSection}>
          <TouchableOpacity style={styles.walletBtn} onPress={() => setWalletModalVisible(true)}>
            <Ionicons name="wallet-outline" size={16} color={Colors.primary} />
            <Text style={styles.walletBtnText} numberOfLines={1}>
              {selectedWalletId ? wallets.find(w => w.id === selectedWalletId)?.name || '...' : 'Todas las billeteras'}
            </Text>
            <Ionicons name="chevron-down" size={14} color={Colors.mutedForeground} />
          </TouchableOpacity>
        </View>
        <View style={styles.monthSelector}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{monthName.charAt(0).toUpperCase() + monthName.slice(1)}</Text>
          <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={24} color={Colors.foreground} />
          </TouchableOpacity>
        </View>

        <View style={styles.calendarContainer}>
          <View style={styles.weekHeaders}>
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
              <Text key={d} style={styles.weekHeaderText}>{d}</Text>
            ))}
          </View>

          <View style={styles.grid}>
            {monthData.map((d, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => {
                  if (d.day !== null && d.date) {
                    setSelectedDay(d.date);
                  }
                }}
                style={[
                  styles.dayCell,
                  d.day === null && styles.emptyCell,
                  d.day !== null && Object.values(d.balance).some(v => v < 0) && styles.lossCell,
                  d.isToday && styles.todayCell,
                  selectedDay && d.date && selectedDay.getTime() === d.date.getTime() && styles.selectedDayCell
                ]}
              >
                {d.day !== null && (
                  <>
                    <Text style={[styles.dayNumber, Object.values(d.balance).some(v => v < 0) && styles.lossText]}>{d.day}</Text>
                    {Object.entries(d.balance).slice(0, 2).map(([curr, val], idx) => (
                      <Text
                        key={curr}
                        style={[
                          styles.dayBalance,
                          val < 0 ? styles.lossText : (val > 0 ? styles.gainText : styles.neutralText),
                          { marginTop: idx === 0 ? 2 : 0, fontSize: 9 }
                        ]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                      >
                        {curr === 'USD' ? 'U$S' : '$'}{Math.abs(val) >= 1000 ? (Math.abs(val) / 1000).toFixed(1) + 'k' : Math.abs(Math.round(val))}
                      </Text>
                    ))}
                    <View style={styles.dotContainer}>
                      {d.hasIncomes && <View style={[styles.dot, { backgroundColor: '#10b981' }]} />}
                      {d.hasExpenses && <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />}
                    </View>
                  </>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {selectedDay && (
          <View style={styles.selectedDayTransactions}>
            <View style={styles.selectedDayHeader}>
              <Text style={styles.selectedDayTitle}>
                Movimientos del {selectedDay.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
              </Text>
              <TouchableOpacity onPress={() => setSelectedDay(null)}>
                <Ionicons name="close-circle" size={20} color={Colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {displayedTickets.filter(t => parseDateLiteral(t.dueDate) === selectedDay.getTime()).map(item => {
              const baseSubtitle = item.type === 'income' ? 'Cobro' : 'Pago';
              const hasUnread = isTicketChatUnread(item, user?.id);
              const subtitle = hasUnread ? item.lastChatMessage : baseSubtitle;
              return (
                <TransactionItem
                  key={item.id}
                  title={item.description || getRubroLabel(item.type === 'income' ? item.rubroIncome : item.rubroExpense, item.type)}
                  subtitle={subtitle}
                  amount={`$${item.amount.toLocaleString('es-AR')}`}
                  iconName={getRubroIcon(item.type === 'income' ? item.rubroIncome : item.rubroExpense, item.type) as any}
                  iconColor={item.type === 'income' ? "#207e52" : "#c05050"}
                  onPress={() => navigation.navigate('AddMovementModal', { ticketId: item.id })}
                  amountColor={item.type === 'income' ? '#363630' : '#c05050'}
                  status={item.status === 'pending' && item.dueDate && new Date(item.dueDate).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0) ? 'overdue' : (item.status === 'pending' ? undefined : item.status)}
                  overdueDays={item.status === 'pending' && item.dueDate && new Date(item.dueDate).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0) ? Math.max(0, Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(item.dueDate).setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24))) : undefined}
                  avatarUrl={item.globalType && item.globalType !== 'ticket' ? undefined : getSmartAvatarUrl(item.toUserObj?.phone, item.toUserObj?.avatarUrl)}
                  hasUnreadChat={hasUnread}
                  style={styles.transactionItem}
                />
              );
            })}

            {displayedTickets.filter(t => parseDateLiteral(t.dueDate) === selectedDay.getTime()).length === 0 && (
              <Text style={styles.emptyDayText}>No hay movimientos registrados para este día</Text>
            )}
          </View>
        )}

        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Resumen del Mes</Text>

          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Días en Rojo</Text>
              <Text style={[styles.summaryValue, { color: '#ef4444' }]}>
                {monthData.filter(d => d.day !== null && Object.values(d.balance).some(v => v < 0)).length}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Saldo Proyectado</Text>
              {(() => {
                const balanceObj = monthData.filter(d => d.day !== null).length > 0 ? monthData[monthData.length - 1].balance : {};
                const entries = Object.entries(balanceObj);
                if (entries.length === 0) {
                  return <Text style={[styles.summaryValue, { color: Colors.foreground }]}>$0</Text>;
                }
                return entries.map(([curr, val]) => (
                  <Text key={curr} style={[styles.summaryValue, { color: val < 0 ? '#ef4444' : Colors.foreground }]}>
                    {curr === 'USD' ? 'U$S' : '$'}{Math.abs(val).toLocaleString('es-AR')}
                  </Text>
                ));
              })()}
            </View>
          </View>

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
              <Text style={styles.legendText}>Cobros</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
              <Text style={styles.legendText}>Pagos</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Wallet Select Modal */}
      <Modal visible={isWalletModalVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setWalletModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Seleccionar Billetera</Text>
              <FlatList
                data={[{ id: null, name: 'Todas las billeteras' } as any, ...wallets]}
                keyExtractor={item => item.id || 'all'}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => { setSelectedWalletId(item.id); setWalletModalVisible(false); }}
                  >
                    <Text style={[styles.modalItemText, selectedWalletId === item.id && styles.modalItemTextActive]}>
                      {item.name}
                    </Text>
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
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 22,
    fontFamily: FontFamily.bold,
    color: Colors.foreground,
  },
  refreshBtn: {
    padding: 8,
    backgroundColor: '#f2f2f0',
    borderRadius: 99,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginVertical: 16,
  },
  monthLabel: {
    fontSize: 18,
    fontFamily: FontFamily.semibold,
    color: Colors.foreground,
  },
  navBtn: {
    padding: 8,
  },
  calendarContainer: {
    paddingHorizontal: 24,
  },
  weekHeaders: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  weekHeaderText: {
    width: '14.285%',
    textAlign: 'center',
    fontSize: 12,
    fontFamily: FontFamily.medium,
    color: Colors.mutedForeground,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.285%',
    aspectRatio: 1 / 1.3,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 4,
    borderWidth: 0.5,
    borderColor: '#f2f2f0',
  },
  emptyCell: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  lossCell: {
    backgroundColor: '#fef2f2',
    borderColor: '#fee2e2',
  },
  todayCell: {
    backgroundColor: '#f2f2f0',
    borderColor: '#363630',
    borderWidth: 1,
  },
  selectedDayCell: {
    backgroundColor: Colors.primary + '10',
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  dayNumber: {
    fontSize: 14,
    fontFamily: FontFamily.semibold,
    color: Colors.foreground,
  },
  dayBalance: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    marginTop: 2,
    paddingHorizontal: 2,
  },
  lossText: {
    color: '#ef4444',
  },
  gainText: {
    color: '#10b981',
  },
  neutralText: {
    color: '#878778',
  },
  dotContainer: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  summaryContainer: {
    marginTop: 24,
    backgroundColor: '#f9f9f8',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
  },
  summaryTitle: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    color: Colors.foreground,
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f2f2f0',
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
    color: Colors.mutedForeground,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 24,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendText: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
    color: Colors.mutedForeground,
  },
  filtersSection: {
    paddingHorizontal: 24,
    marginBottom: 8,
    marginTop: 8,
  },
  walletBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#f2f2f0',
    alignSelf: 'flex-start',
  },
  walletBtnText: {
    fontSize: 13,
    fontFamily: FontFamily.medium,
    color: Colors.foreground,
    maxWidth: 200,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20,51,39,0.4)',
    justifyContent: 'center',
    padding: 32,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
    color: Colors.foreground,
    marginBottom: 16,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f0',
  },
  modalItemText: {
    fontSize: 16,
    fontFamily: FontFamily.medium,
    color: Colors.foreground,
  },
  modalItemTextActive: {
    color: Colors.primary,
    fontFamily: FontFamily.semibold,
  },
  selectedDayTransactions: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  selectedDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  selectedDayTitle: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    color: Colors.foreground,
  },
  transactionItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f0',
  },
  emptyDayText: {
    textAlign: 'center',
    fontFamily: FontFamily.medium,
    color: Colors.mutedForeground,
    paddingVertical: 16,
  },
});
