import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Image, Modal, FlatList, Platform, TextInput, TouchableWithoutFeedback } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, FontFamily, Shadows, BorderRadius, Spacing } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { getLocalTickets, LocalTicket, mergeServerTickets, isTicketChatUnread } from "@/storage/tickets.local";
import { getLocalWallets, LocalWallet, mergeServerWallets } from "@/storage/wallets.local";
import { walletsApi } from "@/api/wallets.api";
import { ticketsApi } from "@/api/tickets.api";
import { useNavigation, useFocusEffect, useRoute } from "@react-navigation/native";
import { useAuthStore } from "@/store/auth.store";
import { useContactsStore } from "@/store/contacts.store";
import { getSmartAvatarUrl } from "@/utils/userDisplay";
import { 
  Typography, 
  TransactionItem, 
  Badge, 
  SectionHeader,
  Card 
} from '@/components/ui';
import { getRubroLabel, getRubroIcon } from '@/constants/rubros';
import { SYSTEM_WALLET_NAME } from '@/constants';

type FilterType = 'all' | 'income' | 'expense' | 'pending' | 'overdue' | 'cancelled';

const parseDateLiteral = (dateStr: string | Date | undefined | null) => {
  if (!dateStr) return null;
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

export const HistoryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const initialWalletId = route.params?.walletId;
  const { user } = useAuthStore();
  const { loadContacts } = useContactsStore();

  const [tickets, setTickets] = useState<LocalTicket[]>([]);
  const [wallets, setWallets] = useState<LocalWallet[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(initialWalletId || null);
  const [isWalletModalVisible, setWalletModalVisible] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isRangeModalVisible, setIsRangeModalVisible] = useState(false);
  const [rangeSelecting, setRangeSelecting] = useState<'start' | 'end' | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (route.params?.walletId) setSelectedWalletId(route.params.walletId);
    if (route.params?.filter) setFilter(route.params.filter);
    if (route.params?.startTimestamp) setStartDate(new Date(Number(route.params.startTimestamp)));
    if (route.params?.endTimestamp) setEndDate(new Date(Number(route.params.endTimestamp)));
    if (route.params?.startDate) setStartDate(new Date(route.params.startDate));
    if (route.params?.endDate) setEndDate(new Date(route.params.endDate));
  }, [route.params]);

  const loadData = useCallback(async (isRefreshing = false) => {
    if (isRefreshing) setRefreshing(true);
    
    // 1. Carga rápida local
    const [localTickets, localWallets] = await Promise.all([getLocalTickets(), getLocalWallets()]);
    setTickets(localTickets.sort((a, b) => {
      const dateA = new Date(a.dueDate || a.createdAt).getTime();
      const dateB = new Date(b.dueDate || b.createdAt).getTime();
      return dateB - dateA;
    }));
    setWallets(localWallets);

    // 2. Sync de red
    try {
      const [serverWallets, serverTickets] = await Promise.all([
        walletsApi.getMyWallets(),
        ticketsApi.getMyTickets()
      ]);
      const mergedWallets = await mergeServerWallets(serverWallets);
      const mergedTickets = await mergeServerTickets(serverTickets);
      
      setWallets(mergedWallets);
      setTickets(mergedTickets.sort((a, b) => {
        const dateA = new Date(a.dueDate || a.createdAt).getTime();
        const dateB = new Date(b.dueDate || b.createdAt).getTime();
        return dateB - dateA;
      }));
    } catch (error) {
       console.error("[History Sync Error]", error);
    } finally {
       setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); loadContacts(); }, [loadData, loadContacts]));

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (selectedWalletId) {
        const isSystemWallet = wallets.find(w => w.id === selectedWalletId)?.name.toLowerCase() === SYSTEM_WALLET_NAME.toLowerCase();
        if (t.walletId !== selectedWalletId && (!isSystemWallet || t.walletId)) return false;
      }
      if (filter === 'income' && t.type !== 'income') return false;
      if (filter === 'expense' && t.type !== 'expense') return false;
      if (filter === 'pending' && t.status !== 'pending') return false;
      if (filter === 'overdue') {
        const isOverdue = t.status === 'pending' && t.dueDate && new Date(t.dueDate).setHours(0,0,0,0) < new Date().setHours(0,0,0,0);
        if (!isOverdue) return false;
      }
      if (filter === 'cancelled' && t.status !== 'cancelled') return false;
      if (startDate) {
        const tDate = t.dueDate || t.createdAt;
        const tTime = parseDateLiteral(tDate);
        const sTime = parseDateLiteral(startDate);
        if (tTime && sTime && tTime < sTime) return false;
      }
      if (endDate) {
        const tDate = t.dueDate || t.createdAt;
        const tTime = parseDateLiteral(tDate);
        const eTime = parseDateLiteral(endDate);
        if (tTime && eTime && tTime > eTime) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (t.description || '').toLowerCase().includes(q) || (t.contactName || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [tickets, filter, startDate, endDate, searchQuery, selectedWalletId, wallets]);

  const groupedTickets = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const groups: { [key: string]: LocalTicket[] } = { 
      'PRÓXIMOS': [],
      'HOY': [], 
      'AYER': [], 
      'ESTA SEMANA': [], 
      'ANTERIORES': [] 
    };

    filteredTickets.slice(0, page * 20).forEach(t => {
      const tDate = new Date(t.dueDate || t.createdAt);
      tDate.setHours(0,0,0,0);
      
      const time = tDate.getTime();
      
      if (time > today.getTime()) {
        groups['PRÓXIMOS'].push(t);
      } else if (time === today.getTime()) {
        groups['HOY'].push(t);
      } else if (time === yesterday.getTime()) {
        groups['AYER'].push(t);
      } else if (time >= sevenDaysAgo.getTime()) {
        groups['ESTA SEMANA'].push(t);
      } else {
        groups['ANTERIORES'].push(t);
      }
    });

    return Object.keys(groups)
      .filter(k => groups[k].length > 0)
      .map(k => ({ title: k, data: groups[k] }));
  }, [filteredTickets, page]);

  const totalsByCurrency = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> = {};
    filteredTickets.forEach(t => {
      if (t.status === 'cancelled') return;
      const cur = t.currency || 'UYU';
      if (!map[cur]) map[cur] = { income: 0, expense: 0 };
      if (t.type === 'income') map[cur].income += t.amount; else map[cur].expense += t.amount;
    });
    return map;
  }, [filteredTickets]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {isSearching ? (
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={Colors.textTertiary} />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Buscar..."
              placeholderTextColor="#737373"
              autoFocus
            />
            <TouchableOpacity onPress={() => { setIsSearching(false); setSearchQuery(''); }}>
              <Ionicons name="close-circle" size={20} color={Colors.textTertiary} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.headerTop}>
            <View>
              <Typography variant="headingH2">Tickets</Typography>
              <Typography variant="labelSmall" color={Colors.textTertiary}>
                {filteredTickets.length} movimientos
              </Typography>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={styles.headerIcon} onPress={() => setIsSearching(true)}>
                <Ionicons name="search-outline" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.headerIcon, { backgroundColor: Colors.primary }]} 
                onPress={() => navigation.navigate('AddMovementModal')}
              >
                <Ionicons name="add" size={24} color={Colors.white} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Wallet Selector & Filters */}
      <View style={styles.filtersSection}>
        <View style={styles.filterButtonsRow}>
          <TouchableOpacity style={styles.walletBtn} onPress={() => setWalletModalVisible(true)}>
            <Ionicons name="wallet-outline" size={16} color={Colors.primary} />
            <Typography variant="labelSmall" numberOfLines={1}>
              {selectedWalletId ? wallets.find(w => w.id === selectedWalletId)?.name || '...' : 'Billeteras'}
            </Typography>
            <Ionicons name="chevron-down" size={14} color={Colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.walletBtn, (startDate || endDate) && { borderColor: Colors.primary, backgroundColor: '#f0f9ff' }]} 
            onPress={() => setIsRangeModalVisible(true)}
          >
            <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
            <Typography variant="labelSmall" numberOfLines={1}>
              {startDate ? `${startDate.getDate()}/${startDate.getMonth()+1} - ${endDate ? endDate.getDate() + '/' + (endDate.getMonth()+1) : '...'}` : 'Fecha'}
            </Typography>
            {(startDate || endDate) && (
              <TouchableOpacity onPress={(e) => { e.stopPropagation(); setStartDate(null); setEndDate(null); }}>
                <Ionicons name="close-circle" size={14} color={Colors.textTertiary} hitSlop={{top:10, bottom:10, left:10, right:10}} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {[
            { id: 'all', label: 'Todo' },
            { id: 'income', label: 'Por Cobrar' },
            { id: 'expense', label: 'Por Pagar' },
            { id: 'pending', label: 'Pendientes' },
            { id: 'overdue', label: 'Atrasados' }
          ].map(opt => (
            <TouchableOpacity 
              key={opt.id} 
              onPress={() => setFilter(opt.id as any)}
              style={[styles.filterChip, filter === opt.id && styles.filterChipActive]}
            >
              <Typography variant="labelXSmall" color={filter === opt.id ? Colors.white : Colors.textSecondary}>
                {opt.label}
              </Typography>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={Colors.primary} />}
      >
        {/* Summary Card */}
        {Object.keys(totalsByCurrency).length > 0 && (
          <Card variant="surface" style={styles.summaryCard} shadow>
            <Typography variant="labelXSmall" color={Colors.textTertiary} uppercase>Resumen del periodo</Typography>
            {Object.entries(totalsByCurrency).map(([cur, totals], idx) => (
              <View key={cur} style={idx > 0 && { marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: Colors.surfaceAlt }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                  <Typography variant="labelSmall" color={Colors.textTertiary}>{cur}</Typography>
                  <Typography 
                    variant="headingH2" 
                    style={{ marginTop: 4, color: (totals.income - totals.expense) < 0 ? Colors.alertsError : Colors.textPrimary }}
                  >
                    $ {Math.abs(totals.income - totals.expense).toLocaleString('es-AR')}
                  </Typography>
                </View>
                
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <View style={[styles.dot, { backgroundColor: Colors.alertsSuccess }]} />
                    <Typography variant="labelXSmall" color={Colors.textTertiary}>Cobrar: </Typography>
                    <Typography variant="labelSmall" color={Colors.alertsSuccess}>${totals.income.toLocaleString('es-AR')}</Typography>
                  </View>
                  <View style={styles.summaryItem}>
                    <View style={[styles.dot, { backgroundColor: Colors.alertsError }]} />
                    <Typography variant="labelXSmall" color={Colors.textTertiary}>Pagar: </Typography>
                    <Typography variant="labelSmall" color={Colors.alertsError}>${totals.expense.toLocaleString('es-AR')}</Typography>
                  </View>
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Transactions List */}
        {groupedTickets.map(group => (
          <View key={group.title} style={styles.group}>
            <SectionHeader title={group.title} />
            <Card variant="surface" style={styles.transactionsCard}>
              {group.data.map((item, idx) => {
                const baseSubtitle = new Date(item.dueDate && item.dueDate !== '' ? item.dueDate : item.createdAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
                const hasUnread = isTicketChatUnread(item, user?.id);
                const subtitle = hasUnread ? item.lastChatMessage : baseSubtitle;

                return (
                  <TransactionItem
                    key={item.id}
                    title={item.description || getRubroLabel(item.type === 'income' ? item.rubroIncome : item.rubroExpense, item.type, item.globalType)}
                    subtitle={subtitle}
                    amount={`$${item.amount.toLocaleString('es-AR')}`}
                    currency={item.currency || 'UYU'}
                    iconName={getRubroIcon(item.type === 'income' ? item.rubroIncome : item.rubroExpense, item.type, item.globalType) as any}
                    iconColor={item.type === 'income' ? Colors.alertsSuccess : Colors.alertsError}
                    onPress={() => navigation.navigate('AddMovementModal', { ticketId: item.id })}
                    status={item.status === 'pending' && item.dueDate && new Date(item.dueDate).setHours(0,0,0,0) < new Date().setHours(0,0,0,0) ? 'overdue' : (item.status === 'pending' ? undefined : item.status)}
                    overdueDays={item.status === 'pending' && item.dueDate && new Date(item.dueDate).setHours(0,0,0,0) < new Date().setHours(0,0,0,0) ? Math.max(0, Math.floor((new Date().setHours(0,0,0,0) - new Date(item.dueDate).setHours(0,0,0,0)) / (1000 * 60 * 60 * 24))) : undefined}
                    amountColor={item.type === 'income' ? Colors.textPrimary : Colors.alertsError}
                    avatarUrl={item.globalType && item.globalType !== 'ticket' ? undefined : getSmartAvatarUrl(item.toUserObj?.phone, item.toUserObj?.avatarUrl)}
                    rating={user?.id === item.ownerId ? item.ownerRating : item.participantRating}
                    style={[styles.item, idx === group.data.length - 1 && { borderBottomWidth: 0 }]}
                    hasUnreadChat={hasUnread}
                  />
                );
              })}
            </Card>
          </View>
        ))}
      </ScrollView>

      {/* Wallet Select Modal */}
      <Modal visible={isWalletModalVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setWalletModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Typography variant="headingH3" style={styles.modalTitle}>Billeteras</Typography>
              <FlatList
                data={[{ id: null, name: 'Todas las billeteras' } as any, ...wallets]}
                keyExtractor={item => item.id || 'all'}
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

      {/* Range Select Modal */}
      <Modal visible={isRangeModalVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setIsRangeModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Typography variant="headingH3" style={styles.modalTitle}>Filtrar por Fecha</Typography>
              
              <View style={{ gap: 16 }}>
                <TouchableOpacity 
                  style={styles.dateSelectorRow} 
                  activeOpacity={0.7}
                  onPress={() => {
                    setIsRangeModalVisible(false);
                    setTimeout(() => setRangeSelecting('start'), 100);
                  }}
                >
                  <Typography variant="labelBase">Desde:</Typography>
                  <Typography variant="labelBase" color={startDate ? Colors.textPrimary : Colors.primary}>
                    {startDate ? startDate.toLocaleDateString('es-AR') : 'Elegir fecha'}
                  </Typography>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.dateSelectorRow} 
                  activeOpacity={0.7}
                  onPress={() => {
                    setIsRangeModalVisible(false);
                    setTimeout(() => setRangeSelecting('end'), 100);
                  }}
                >
                  <Typography variant="labelBase">Hasta:</Typography>
                  <Typography variant="labelBase" color={endDate ? Colors.textPrimary : Colors.primary}>
                    {endDate ? endDate.toLocaleDateString('es-AR') : 'Elegir fecha'}
                  </Typography>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={[styles.actionBtn, { marginTop: 24 }]} 
                onPress={() => setIsRangeModalVisible(false)}
              >
                <Typography variant="labelBase" color={Colors.white}>Ver Resultados</Typography>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {rangeSelecting && (
        <DateTimePicker
          value={rangeSelecting === 'start' ? (startDate || new Date()) : (endDate || new Date())}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(e, date) => {
            setRangeSelecting(null);
            if (date) {
              if (rangeSelecting === 'start') setStartDate(date); else setEndDate(date);
            }
            // Re-abrir el modal principal después de cerrar el picker
            setIsRangeModalVisible(true);
          }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.xl, paddingTop: 10, marginBottom: Spacing.md },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerIcon: { padding: 8, backgroundColor: Colors.white, borderRadius: BorderRadius.full, ...Shadows.card },
  searchBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F5F5F5', 
    borderRadius: 28, 
    paddingHorizontal: 16, 
    height: 56 
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    fontFamily: FontFamily.medium,
    color: Colors.textPrimary,
    // @ts-ignore
    outlineStyle: 'none'
  },
  
  filtersSection: { paddingHorizontal: Spacing.xl, gap: Spacing.md, marginBottom: Spacing.lg },
  filterButtonsRow: { flexDirection: 'row', gap: Spacing.md },
  walletBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, paddingHorizontal: 12, paddingVertical: 8, borderRadius: BorderRadius.button, gap: 8, borderWidth: 1, borderColor: Colors.surfaceAlt, alignSelf: 'flex-start' },
  filterScroll: { gap: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: BorderRadius.full, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.surfaceAlt },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },

  scrollContent: { paddingHorizontal: Spacing.xl, paddingBottom: 40 },
  summaryCard: { 
    padding: Spacing.lg, 
    marginBottom: Spacing.xxl, 
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryRow: { flexDirection: 'row', marginTop: Spacing.md, gap: Spacing.xl },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },

  group: { marginBottom: Spacing.xl },
  transactionsCard: { paddingHorizontal: 16, paddingVertical: 0, overflow: 'hidden' },
  item: { paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: '#ebebea' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(20,51,39,0.4)', justifyContent: 'center', padding: Spacing.xl },
  modalContent: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.xl, maxHeight: '80%' },
  modalTitle: { marginBottom: Spacing.lg },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.surfaceMuted },
  
  dateSelectorRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    padding: 16, 
    backgroundColor: Colors.surfaceMuted, 
    borderRadius: 12 
  },
  actionBtn: { 
    backgroundColor: Colors.primary, 
    padding: 16, 
    borderRadius: 12, 
    alignItems: 'center' 
  }
});
