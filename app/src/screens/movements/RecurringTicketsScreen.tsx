import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  RefreshControl,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { ticketsApi } from '@/api/tickets.api';
import { walletsApi } from '@/api/wallets.api';
import { getRubroIcon } from '@/constants/rubros';
import { FontFamily } from '@/constants/theme';

// ─── Constants ────────────────────────────────────────────────────────────────

const FREQ_LABELS: Record<string, string> = {
  weekly:          'Cada 7 días',
  biweekly:        'Cada 15 días',
  monthly:         'Cada 30 días',
  bimonthly:       'Cada 2 meses',
  quarterly:       'Cada 3 meses',
  'semi-annually': 'Cada 6 meses',
  yearly:          'Cada 1 año',
};

const fmtAmount = (amount: any) =>
  Number(amount).toLocaleString('es-AR', { minimumFractionDigits: 0 });

const fmtDate = (d: any) =>
  new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });

// ─── Screen ───────────────────────────────────────────────────────────────────

export const RecurringTicketsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems]           = useState<any[]>([]);
  const [wallets, setWallets]       = useState<any[]>([]);
  const [search, setSearch]         = useState('');
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [isWalletModalVisible, setWalletModalVisible] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [data, walletsData] = await Promise.all([
        ticketsApi.getMyRecurringTickets(),
        walletsApi.getMyWallets(),
      ]);
      setItems(data);
      setWallets(walletsData);
    } catch {
      Alert.alert('Error', 'No se pudieron cargar los datos.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => load(true));
    return unsub;
  }, [navigation]);

  const handleToggle = async (item: any) => {
    try {
      await ticketsApi.toggleRecurringTicket(item.id);
      setItems(prev => prev.map(r => r.id === item.id ? { ...r, isActive: !r.isActive } : r));
    } catch {
      Alert.alert('Error', 'No se pudo cambiar el estado.');
    }
  };

  const handleDelete = (item: any) => {
    setItemToDelete(item);
  };

  const performDelete = async (id: string) => {
    try {
      await ticketsApi.deleteRecurringTicket(id);
      setItems(prev => prev.filter(r => r.id !== id));
      setItemToDelete(null);
    } catch {
      Alert.alert('Error', 'No se pudo eliminar.');
    }
  };

  const handleEdit = (item: any) => navigation.navigate('EditRecurringTicket', { item });

  const filtered = useMemo(() => {
    let result = items;
    if (selectedWalletId) {
      result = result.filter(i => i.walletId === selectedWalletId);
    }
    if (search.trim()) {
      const lower = search.toLowerCase();
      result = result.filter(i =>
        (i.description ?? '').toLowerCase().includes(lower)
      );
    }
    return result;
  }, [items, search, selectedWalletId]);

  const totalsByCurrency = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> = {};
    filtered.forEach(t => {
      const cur = t.currency || 'UYU';
      if (!map[cur]) map[cur] = { income: 0, expense: 0 };
      if (t.type === 'income') {
        map[cur].income += Number(t.amount || 0);
      } else {
        map[cur].expense += Number(t.amount || 0);
      }
    });
    return map;
  }, [filtered]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header onBack={() => navigation.goBack()} />
        <ActivityIndicator size="large" color="#363630" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header
        onBack={() => navigation.goBack()}
        count={items.length}
        search={search}
        setSearch={setSearch}
        showSearch={showSearch}
        setShowSearch={setShowSearch}
      />
      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(true); }}
            tintColor="#3a9e76"
            colors={['#3a9e76']}
          />
        }
      >
        <View style={styles.filtersSection}>
          <TouchableOpacity style={styles.walletBtn} onPress={() => setWalletModalVisible(true)}>
            <Ionicons name="wallet-outline" size={16} color="#3a9e76" />
            <Text style={styles.walletBtnText} numberOfLines={1}>
              {selectedWalletId ? wallets.find(w => w.id === selectedWalletId)?.name || '...' : 'Todas las billeteras'}
            </Text>
            <Ionicons name="chevron-down" size={14} color="#878778" />
          </TouchableOpacity>
        </View>

        {Object.keys(totalsByCurrency).length > 0 && (
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Resumen de totales</Text>
            {Object.entries(totalsByCurrency).map(([cur, totals], index) => (
              <View key={cur} style={[styles.summaryCard, index > 0 && { marginTop: 12 }]}>
                <Text style={styles.summaryCurrency}>{cur}</Text>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <View style={[styles.dot, { backgroundColor: '#1a8a5a' }]} />
                    <Text style={styles.summaryLabel}>Cobros:</Text>
                    <Text style={[styles.summaryAmount, { color: '#1a8a5a' }]}>${fmtAmount(totals.income)}</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <View style={[styles.dot, { backgroundColor: '#c05050' }]} />
                    <Text style={styles.summaryLabel}>Pagos:</Text>
                    <Text style={[styles.summaryAmount, { color: '#c05050' }]}>${fmtAmount(totals.expense)}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {filtered.length === 0 ? (
          <EmptyState />
        ) : (
          filtered.map((item, index) => (
            <React.Fragment key={item.id}>
              {index > 0 && <View style={styles.separator} />}
              <RecurringCard
                item={item}
                onEdit={() => handleEdit(item)}
                onDelete={() => handleDelete(item)}
                onToggle={() => handleToggle(item)}
              />
            </React.Fragment>
          ))
        )}
      </ScrollView>

      {/* ── Modal de selección de billetera ── */}
      <Modal visible={isWalletModalVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setWalletModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { alignItems: 'stretch' }]}>
              <Text style={styles.modalTitle}>Billeteras</Text>
              <FlatList
                data={[{ id: null, name: 'Todas las billeteras' } as any, ...wallets]}
                keyExtractor={item => item.id || 'all'}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.modalItem} 
                    onPress={() => { setSelectedWalletId(item.id); setWalletModalVisible(false); }}
                  >
                    <Text style={styles.modalItemText}>{item.name}</Text>
                    {selectedWalletId === item.id && <Ionicons name="checkmark" size={20} color="#3a9e76" />}
                  </TouchableOpacity>
                )}
                style={{ maxHeight: 300 }}
              />
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Modal de eliminación personalizado ── */}
      <Modal
        visible={!!itemToDelete}
        transparent
        animationType="fade"
        onRequestClose={() => setItemToDelete(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, { textAlign: 'center' }]}>¿Eliminar Ticket?</Text>
            <Text style={styles.modalSubtitle}>
              ¿Eliminás "{itemToDelete?.description}"? Esta acción no se puede deshacer.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalBtnBack}
                onPress={() => setItemToDelete(null)}
              >
                <Text style={styles.modalBtnBackText}>Volver</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalBtnConfirm}
                onPress={() => performDelete(itemToDelete?.id)}
              >
                <Text style={styles.modalBtnConfirmText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

// ─── Header ───────────────────────────────────────────────────────────────────

const Header: React.FC<{
  onBack: () => void;
  count?: number;
  search: string;
  setSearch: (v: string) => void;
  showSearch: boolean;
  setShowSearch: (v: boolean) => void;
}> = ({ onBack, count, search, setSearch, showSearch, setShowSearch }) => (
  <View style={styles.header}>
    {showSearch ? (
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color="#737373" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar..."
          placeholderTextColor="#737373"
          value={search}
          onChangeText={setSearch}
          autoFocus
        />
        <TouchableOpacity onPress={() => { setShowSearch(false); setSearch(''); }}>
          <Ionicons name="close-circle" size={20} color="#737373" />
        </TouchableOpacity>
      </View>
    ) : (
      <View style={styles.headerTop}>
        <TouchableOpacity 
          style={{ marginRight: 8, marginLeft: -8, padding: 8 }} 
          onPress={onBack}
        >
          <Ionicons name="chevron-back" size={28} color="#363630" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Repetir Tickets</Text>
          <Text style={styles.headerSub}>
            {count !== undefined ? `${count} plantilla${count !== 1 ? 's' : ''}` : ' '}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setShowSearch(true)}>
            <Ionicons name="search-outline" size={24} color="#171717" />
          </TouchableOpacity>
        </View>
      </View>
    )}
  </View>
);

// ─── Card ─────────────────────────────────────────────────────────────────────

const RecurringCard: React.FC<{
  item: any;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}> = ({ item, onEdit, onDelete, onToggle }) => {
  const isExpense   = item.type !== 'income';
  const amountColor = isExpense ? '#c05050' : '#363630';
  const pending     = Math.max(0, (item.totalInstallments ?? 0) - (item.currentInstallment ?? 0));
  const rubroId     = item.type === 'income' ? item.rubroIncome : item.rubroExpense;
  const iconName    = getRubroIcon(rubroId ?? item.rubro, item.type, item.globalType);
  const iconColor   = isExpense ? '#c05050' : '#1a8a5a';

  return (
    <View style={styles.card}>

      {/* ── Top row: avatar (icono) + name (editar) + delete ── */}
      <View style={styles.cardTop}>
        {/* Zona de edición: avatar + nombre */}
        <Pressable
          onPress={onEdit}
          style={({ pressed }) => [{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }, pressed && styles.cardPressed]}
        >
          <View style={[styles.avatar, isExpense ? styles.avatarExpense : styles.avatarIncome]}>
            <Ionicons name={iconName as any} size={18} color={iconColor} />
          </View>
          <Text style={styles.cardName} numberOfLines={1}>{item.description}</Text>
        </Pressable>

        <TouchableOpacity
          onPress={onDelete}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          style={styles.deleteBtn}
        >
          <View pointerEvents="none">
            <Ionicons name="trash-outline" size={18} color="#c8c8c0" />
          </View>
        </TouchableOpacity>
      </View>

      {/* ── Middle row: amount + stats (tappable para editar) ── */}
      <Pressable onPress={onEdit} style={({ pressed }) => [styles.cardMiddle, pressed && styles.cardPressed]}>
        <View style={{ flex: 1 }}>
          <View style={styles.amountRow}>
            <Text style={styles.cardCurrency}>{item.currency}</Text>
            <Text style={[styles.cardAmount, { color: amountColor }]}>
              ${fmtAmount(item.amount)}
            </Text>
          </View>
        </View>
        <View style={styles.cardStats}>
          <View style={styles.statRow}>
            <Ionicons name="arrow-up" size={12} color="#1a8a5a" />
            <Text style={styles.statText}>{item.currentInstallment ?? 0} completadas</Text>
          </View>
          <View style={styles.statRow}>
            <Ionicons name="arrow-down" size={12} color="#c05050" />
            <Text style={styles.statText}>{pending} pendientes</Text>
          </View>
        </View>
      </Pressable>

      {/* ── Bottom row: freq + switch — sin Pressable padre ── */}
      <View style={styles.cardBottom}>
        <View style={styles.cardBottomLeft}>
          <Ionicons name="time-outline" size={14} color="#878778" />
          <Text style={styles.cardBottomText}>
            {FREQ_LABELS[item.frequency] ?? item.frequency}
            {item.nextGenerationDate ? `  ·  próx. ${fmtDate(item.nextGenerationDate)}` : ''}
          </Text>
        </View>
        <Switch
          value={!!item.isActive}
          onValueChange={onToggle}
          trackColor={{ false: '#e0e0e0', true: '#3a9e76' }}
          thumbColor="#fff"
          style={{ transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }] }}
        />
      </View>

    </View>
  );
};

// ─── Empty ────────────────────────────────────────────────────────────────────

const EmptyState: React.FC = () => (
  <View style={styles.empty}>
    <Ionicons name="receipt-outline" size={52} color="#d1d1cf" />
    <Text style={styles.emptyTitle}>Sin tickets recurrentes</Text>
    <Text style={styles.emptySub}>
      Al crear un ticket podés activar "Repetir ticket" para que se genere automáticamente.
    </Text>
  </View>
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f5' },

  // Header
  header: { 
    paddingHorizontal: 24, 
    paddingTop: 20, 
    paddingBottom: 16,
    backgroundColor: '#f7f7f5',
  },
  headerTop: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  iconBtn: { 
    width: 40, 
    height: 40, 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    alignItems: 'center', 
    justifyContent: 'center', 
    ...Platform.select({
      web: { boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      }
    }),
    elevation: 2,
  },
  headerTitle: { fontSize: 24, fontFamily: FontFamily.bold, color: '#1a1a18' },
  headerSub:   { fontSize: 13, color: '#878778', marginTop: 2, fontFamily: FontFamily.medium },
  searchBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#ebebea', 
    borderRadius: 28, 
    paddingHorizontal: 16, 
    height: 56 
  },
  searchInput: { 
    flex: 1, 
    marginLeft: 12, 
    fontFamily: FontFamily.regular, 
    fontSize: 16, 
    color: '#171717',
    // @ts-ignore
    outlineStyle: 'none'
  },

  // Filters
  filtersSection: { marginBottom: 16, marginHorizontal: -16, paddingHorizontal: 16 },
  walletBtn: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', 
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, 
    gap: 8, borderWidth: 1, borderColor: '#ebebea', alignSelf: 'flex-start' 
  },
  walletBtnText: { fontSize: 13, fontFamily: FontFamily.medium, color: '#363630' },

  // Summary
  summaryContainer: { marginBottom: 24 },
  summaryTitle: { fontSize: 12, fontFamily: FontFamily.bold, color: '#878778', textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
  summaryCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#ebebea',
  },
  summaryCurrency: { fontSize: 15, fontFamily: FontFamily.bold, color: '#363630', marginBottom: 8 },
  summaryRow: { flexDirection: 'row', gap: 24 },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  summaryLabel: { fontSize: 13, fontFamily: FontFamily.medium, color: '#878778' },
  summaryAmount: { fontSize: 14, fontFamily: FontFamily.bold },

  // List
  list: { padding: 16, paddingBottom: 40 },
  separator: { height: 1, backgroundColor: '#ebebea', marginVertical: 8 },

  // Card — formato imagen de referencia
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    gap: 12,
    // shadow iOS
    ...Platform.select({
      web: { boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      }
    }),
    // shadow Android
    elevation: 2,
  },
  cardPressed: { opacity: 0.85 },

  // Top row
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#f2f2f0',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarIncome:  { backgroundColor: '#e8f7f0', alignItems: 'center', justifyContent: 'center' },
  avatarExpense: { backgroundColor: '#fdf0f0', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontFamily: FontFamily.bold, color: '#555550' },
  cardName: {
    flex: 1, fontSize: 16,
    fontFamily: FontFamily.semibold, color: '#1a1a18',
  },
  deleteBtn: { padding: 10, marginRight: -6 },

  // Middle row
  cardMiddle: { flexDirection: 'row', alignItems: 'center', marginTop: 6, marginBottom: 2 },
  amountRow:  { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  cardCurrency: { fontSize: 13, color: '#878778', fontFamily: FontFamily.medium },
  cardAmount:   { fontSize: 26, fontFamily: FontFamily.medium },

  cardStats: { alignItems: 'flex-end', gap: 4 },
  statRow:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText:  { fontSize: 13, color: '#363630', fontFamily: FontFamily.medium },

  // Bottom row
  cardBottom: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1, borderTopColor: '#f2f2f0',
  },
  cardBottomLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  cardBottomText: { fontSize: 13, color: '#878778', fontFamily: FontFamily.regular },

  // Empty
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40, gap: 12 },
  emptyTitle: { fontSize: 17, fontFamily: FontFamily.semibold, color: '#363630', textAlign: 'center' },
  emptySub:   { fontSize: 13, color: '#878778', textAlign: 'center', lineHeight: 20 },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '100%', maxWidth: 400,
  },
  modalTitle: { fontSize: 20, fontFamily: FontFamily.bold, color: '#1a1a18', marginBottom: 16 },
  modalSubtitle: { fontSize: 14, color: '#878778', textAlign: 'center', marginBottom: 24 },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f2f2f0' },
  modalItemText: { fontSize: 16, fontFamily: FontFamily.medium, color: '#363630' },
  modalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  modalBtnBack: {
    flex: 1, backgroundColor: '#f2f2f0', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  modalBtnBackText: { fontSize: 15, fontFamily: FontFamily.bold, color: '#363630' },
  modalBtnConfirm: {
    flex: 1, backgroundColor: '#c05050', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  modalBtnConfirmText: { fontSize: 15, fontFamily: FontFamily.bold, color: '#fff' },
});
