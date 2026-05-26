import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, StyleSheet, TouchableOpacity, ScrollView, FlatList, 
  ActivityIndicator, RefreshControl, Image, Modal, Platform,
  TextInput, TouchableWithoutFeedback
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, FontFamily, Spacing, BorderRadius, Shadows, FontSize } from '@/constants/theme';
import { Typography } from '@/components/ui/Typography';
import { ticketsApi } from '@/api/tickets.api';
import { getLocalWallets, LocalWallet } from '@/storage/wallets.local';
import { useAuthStore } from '@/store/auth.store';
import { normalizeUrl } from '@/utils/url.util';

const ALL_PAYMENT_METHODS = [
  { id: 'efectivo', label: 'En mano' },
  { id: 'transfer', label: 'Transferencia bancaria' },
  { id: 'mercadopago', label: 'Mercado Pago' },
  { id: 'debit', label: 'Tarjeta de Débito' },
  { id: 'credit', label: 'Tarjeta de Crédito' },
  { id: 'agency', label: 'Agencia de cobranza' },
  { id: 'abitab', label: 'Abitab' },
  { id: 'midinero', label: 'Mi Dinero' },
  { id: 'redpagos', label: 'RedPagos' },
  { id: 'rapipago', label: 'Rapipago' },
  { id: 'pagofacil', label: 'Pago Fácil' },
  { id: 'cobroexpress', label: 'Cobro Express' },
  { id: 'redlink', label: 'Red Link' },
];

const DIRECTION_OPTIONS = [
  { id: 'all', label: 'Todos' },
  { id: 'income', label: 'Cobros (Entradas)' },
  { id: 'expense', label: 'Pagos (Salidas)' },
];

const parseDateLiteral = (dateStr: string | Date | undefined | null) => {
  if (!dateStr) return null;
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

export const PaymentRecordsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [wallets, setWallets] = useState<LocalWallet[]>([]);
  
  const [filterWalletId, setFilterWalletId] = useState<string | null>(null);
  const [isWalletModalVisible, setIsWalletModalVisible] = useState(false);
  const [filterMethod, setFilterMethod] = useState<string | null>(null);
  const [isMethodModalVisible, setIsMethodModalVisible] = useState(false);
  const [filterDirection, setFilterDirection] = useState<'all' | 'income' | 'expense'>('all');
  const [isDirectionModalVisible, setIsDirectionModalVisible] = useState(false);
  
  const [viewImage, setViewImage] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isRangeModalVisible, setIsRangeModalVisible] = useState(false);
  const [rangeSelecting, setRangeSelecting] = useState<'start' | 'end' | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const [logsData, walletsData] = await Promise.all([
        ticketsApi.getMyPaymentLogs(),
        getLocalWallets()
      ]);
      setLogs(logsData);
      setWallets(walletsData);
    } catch (error) {
      console.error("[PaymentRecords] Error fetching data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLogs();
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchWallet = filterWalletId ? log.userWallet?.id === filterWalletId : true;
      const matchMethod = filterMethod ? (log.paymentMethod === filterMethod || (filterMethod === 'efectivo' && !log.paymentMethod)) : true;
      const matchDirection = filterDirection === 'all' ? true : log.direction === filterDirection;
      
      let matchDate = true;
      if (startDate || endDate) {
        const logTime = parseDateLiteral(log.createdAt);
        if (startDate) {
          const startTime = parseDateLiteral(startDate);
          if (logTime && startTime && logTime < startTime) matchDate = false;
        }
        if (endDate) {
          const endTime = parseDateLiteral(endDate);
          if (logTime && endTime && logTime > endTime) matchDate = false;
        }
      }

      let matchSearch = true;
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const ticketDesc = (log.ticket?.description || '').toLowerCase();
        const logComment = (log.comment || '').toLowerCase();
        matchSearch = ticketDesc.includes(query) || logComment.includes(query);
      }

      return matchWallet && matchMethod && matchDate && matchDirection && matchSearch;
    });
  }, [logs, filterWalletId, filterMethod, startDate, endDate, filterDirection, searchQuery]);

  const totals = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    for (const log of filteredLogs) {
      const amt = Math.abs(log.amount !== undefined ? Number(log.amount) : (Number(log.newValue) - (Number(log.oldValue) || 0)));
      if (log.direction === 'income') {
        totalIncome += amt;
      } else {
        totalExpense += amt;
      }
    }
    return { totalIncome, totalExpense, diff: totalIncome - totalExpense };
  }, [filteredLogs]);

  const renderSummary = () => {
    if (filteredLogs.length === 0) return null;
    // Determine main currency from first log
    const mainCurrency = filteredLogs[0]?.currency || filteredLogs[0]?.ticket?.currency || '';
    return (
      <View style={styles.summaryCard}>
        <Typography variant="labelXSmall" color="tertiary" uppercase style={{ letterSpacing: 1, marginBottom: 8 }}>
          Resumen del período
        </Typography>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 12 }}>
          <Typography variant="labelSmall" color="secondary">{mainCurrency}</Typography>
          <Typography style={{ fontSize: 28, fontFamily: FontFamily.bold, color: totals.diff >= 0 ? Colors.textPrimary : Colors.alertsError }}>
            $ {Math.abs(totals.diff).toLocaleString('es-AR')}
          </Typography>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.alertsSuccess }} />
            <Typography variant="labelSmall" color="secondary">Cobrar:</Typography>
            <Typography variant="labelSmall" color={Colors.alertsSuccess} style={{ fontFamily: FontFamily.bold }}>
              ${totals.totalIncome.toLocaleString('es-AR')}
            </Typography>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.alertsError }} />
            <Typography variant="labelSmall" color="secondary">Pagar:</Typography>
            <Typography variant="labelSmall" color={Colors.alertsError} style={{ fontFamily: FontFamily.bold }}>
              ${totals.totalExpense.toLocaleString('es-AR')}
            </Typography>
          </View>
        </View>
      </View>
    );
  };

  const renderLogItem = ({ item }: { item: any }) => {
    const isIncome = item.direction === 'income';
    const methodLabel = ALL_PAYMENT_METHODS.find(m => m.id === item.paymentMethod)?.label || item.paymentMethod || 'Efectivo';
    const amountValue = Math.abs(item.amount !== undefined ? Number(item.amount) : (Number(item.newValue) - (Number(item.oldValue) || 0)));
    const amountFormatted = `${item.currency || item.ticket?.currency || '$'} ${amountValue.toLocaleString('es-AR')}`;
    return (
      <TouchableOpacity 
        style={styles.logCard} 
        activeOpacity={0.7} 
        onPress={() => navigation.navigate('AddMovementModal', { ticketId: item.ticketId })}
      >
        <View style={styles.logHeader}>
          <View style={[styles.actionIcon, { backgroundColor: isIncome ? Colors.alertsSuccessSurface : '#fef2f2' }]}>
            {item.user?.avatarUrl ? (
              <Image source={{ uri: normalizeUrl(item.user.avatarUrl) }} style={{ width: 40, height: 40, borderRadius: 20 }} />
            ) : item.user?.displayName ? (
              <Typography variant="bodyLargeStrong" color={isIncome ? Colors.alertsSuccess : Colors.alertsError}>
                {item.user.displayName.charAt(0).toUpperCase()}
              </Typography>
            ) : (
              <Ionicons name={isIncome ? "arrow-down-circle" : "arrow-up-circle"} size={24} color={isIncome ? Colors.alertsSuccess : Colors.alertsError} />
            )}
          </View>
          <View style={styles.logMainInfo}>
            <Typography variant="bodyLargeStrong" color={isIncome ? Colors.textPrimary : Colors.alertsError}>
              {amountFormatted}
            </Typography>
            <Typography variant="labelSmall" color="secondary" numberOfLines={1}>
              {item.ticket?.description || 'Sin descripción del ticket'}
            </Typography>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {!!item.attachmentUrl && (
              <TouchableOpacity 
                onPress={(e) => { e.stopPropagation(); setViewImage(item.attachmentUrl); }}
                style={{ padding: 4 }}
              >
                <Ionicons name="attach" size={22} color="#737373" />
              </TouchableOpacity>
            )}
            <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
          </View>
        </View>

        <View style={styles.logBody}>
          {!!item.comment && (
            <View style={{ marginBottom: 12 }}>
              <Typography variant="labelXSmall" color="tertiary" uppercase style={{ marginBottom: 2 }}>Detalle del pago:</Typography>
              <Typography variant="bodySmall" color="secondary">{item.comment}</Typography>
            </View>
          )}
          
          <View style={styles.detailsGrid}>
            <View style={styles.detailRow}>
              <Ionicons name="person-outline" size={14} color={Colors.textTertiary} />
              <Typography variant="labelSmall" color="secondary" style={styles.detailText}>{item.user?.displayName || 'Usuario'}</Typography>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="wallet-outline" size={14} color={Colors.textTertiary} />
              <Typography variant="labelSmall" color="secondary" style={styles.detailText}>{item.userWallet?.name || 'Billetera'}</Typography>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="card-outline" size={14} color={Colors.textTertiary} />
              <Typography variant="labelSmall" color="secondary" style={styles.detailText}>{methodLabel}</Typography>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={14} color={Colors.textTertiary} />
              <Typography variant="labelSmall" color="secondary" style={styles.detailText}>
                {new Date(item.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </Typography>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {isSearchVisible ? (
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={Colors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por detalle..."
              placeholderTextColor="#737373"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            <TouchableOpacity onPress={() => { setIsSearchVisible(false); setSearchQuery(''); }}>
              <Ionicons name="close-circle" size={20} color={Colors.textTertiary} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.headerTop}>
            <TouchableOpacity 
              style={{ marginRight: 8, marginLeft: -8, padding: 8 }} 
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="chevron-back" size={28} color="#363630" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Typography variant="headingH2">Registros de Pagos</Typography>
              <Typography variant="labelSmall" color={Colors.textTertiary}>
                {filteredLogs.length} registros
              </Typography>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => setIsSearchVisible(true)}>
                <Ionicons name="search-outline" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <View style={styles.filtersContainer}>
        <View style={styles.topFiltersRow}>
          <TouchableOpacity 
            style={[styles.dateFilterBtn, (startDate || endDate) && styles.filterActive]} 
            onPress={() => setIsRangeModalVisible(true)}
          >
            <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
            <Typography variant="labelSmall" numberOfLines={1}>
              {startDate ? `${startDate.getDate()}/${startDate.getMonth()+1}` : 'Fecha'}
            </Typography>
            <Ionicons name="chevron-down" size={12} color={Colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.dateFilterBtn, filterWalletId && styles.filterActive]} 
            onPress={() => setIsWalletModalVisible(true)}
          >
            <Ionicons name="wallet-outline" size={16} color={Colors.primary} />
            <Typography variant="labelSmall" numberOfLines={1}>
              {filterWalletId ? (wallets.find(w => w.id === filterWalletId)?.name || 'Billetera') : 'Billetera'}
            </Typography>
            <Ionicons name="chevron-down" size={12} color={Colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.dateFilterBtn, filterMethod && styles.filterActive]} 
            onPress={() => setIsMethodModalVisible(true)}
          >
            <Ionicons name="card-outline" size={16} color={Colors.primary} />
            <Typography variant="labelSmall" numberOfLines={1}>
              {filterMethod ? (ALL_PAYMENT_METHODS.find(m => m.id === filterMethod)?.label || 'Medio') : 'Medio'}
            </Typography>
            <Ionicons name="chevron-down" size={12} color={Colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.dateFilterBtn, filterDirection !== 'all' && styles.filterActive]} 
            onPress={() => setIsDirectionModalVisible(true)}
          >
            <Ionicons name={filterDirection === 'income' ? "arrow-down-circle-outline" : (filterDirection === 'expense' ? "arrow-up-circle-outline" : "swap-vertical-outline")} size={16} color={Colors.primary} />
            <Typography variant="labelSmall" numberOfLines={1}>
              {filterDirection === 'all' ? 'Tipo' : (DIRECTION_OPTIONS.find(d => d.id === filterDirection)?.label.split(' ')[0])}
            </Typography>
            <Ionicons name="chevron-down" size={12} color={Colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredLogs}
          keyExtractor={(item, index) => item.logId || index.toString()}
          renderItem={renderLogItem}
          ListHeaderComponent={renderSummary}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={64} color={Colors.textTertiary} />
              <Typography variant="bodyLarge" color="secondary" style={{ marginTop: 16 }}>
                No se encontraron registros
              </Typography>
            </View>
          }
        />
      )}

      {/* Image Preview Modal */}
      <Modal visible={!!viewImage} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalClose} onPress={() => setViewImage(null)}>
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>
          {viewImage && (
            <Image 
              source={{ uri: normalizeUrl(viewImage) }} 
              style={styles.fullImage} 
              resizeMode="contain" 
            />
          )}
        </View>
      </Modal>

      {/* Wallet Select Modal */}
      <Modal visible={isWalletModalVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setIsWalletModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Typography variant="headingH3" style={styles.modalTitle}>Billeteras</Typography>
              <FlatList
                data={[{ id: null, name: 'Todas las billeteras' } as any, ...wallets]}
                keyExtractor={item => item.id || 'all'}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.modalItem} 
                    onPress={() => { setFilterWalletId(item.id); setIsWalletModalVisible(false); }}
                  >
                    <Typography variant="labelBase">{item.name}</Typography>
                    {filterWalletId === item.id && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Method Select Modal */}
      <Modal visible={isMethodModalVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setIsMethodModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Typography variant="headingH3" style={styles.modalTitle}>Medios de Pago</Typography>
              <FlatList
                data={[{ id: null, label: 'Todos los medios' } as any, ...ALL_PAYMENT_METHODS]}
                keyExtractor={item => item.id || 'all'}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.modalItem} 
                    onPress={() => { setFilterMethod(item.id); setIsMethodModalVisible(false); }}
                  >
                    <Typography variant="labelBase">{item.label}</Typography>
                    {filterMethod === item.id && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Direction Select Modal */}
      <Modal visible={isDirectionModalVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setIsDirectionModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Typography variant="headingH3" style={styles.modalTitle}>Tipo de Movimiento</Typography>
              <FlatList
                data={DIRECTION_OPTIONS}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.modalItem} 
                    onPress={() => { setFilterDirection(item.id as any); setIsDirectionModalVisible(false); }}
                  >
                    <Typography variant="labelBase">{item.label}</Typography>
                    {filterDirection === item.id && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
                style={[styles.actionBtn, { marginTop: 24, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.stroke }]} 
                onPress={() => {
                  setStartDate(null);
                  setEndDate(null);
                  setIsRangeModalVisible(false);
                }}
              >
                <Typography variant="labelBase" color={Colors.textSecondary}>Limpiar Filtro</Typography>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionBtn, { marginTop: 12 }]} 
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
            // Re-open main modal after closing picker
            setIsRangeModalVisible(true);
          }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: { 
    paddingHorizontal: 24, 
    paddingTop: 20, 
    paddingBottom: 16 
  },
  headerTop: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  iconBtn: { 
    width: 40, 
    height: 40, 
    backgroundColor: Colors.white, 
    borderRadius: 20, 
    alignItems: 'center', 
    justifyContent: 'center', 
    ...Shadows.card 
  },
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
    fontFamily: FontFamily.regular, 
    fontSize: 16, 
    color: Colors.textPrimary,
    // @ts-ignore
    outlineStyle: 'none'
  },
  filtersContainer: {
    paddingVertical: 8,
    gap: 8,
  },
  topFiltersRow: {
    paddingHorizontal: 16,
    marginBottom: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dateFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.button,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.strokeSubtle,
  },
  filterActive: {
    borderColor: Colors.primary,
    backgroundColor: '#f0f9ff',
  },
  listContent: {
    padding: 24,
    paddingTop: 8,
    gap: 16,
  },
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.strokeSubtle,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  logCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: 16,
    ...Shadows.card,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  logMainInfo: {
    flex: 1,
  },
  attachmentBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logBody: {
    borderTopWidth: 1,
    borderTopColor: Colors.strokeSubtle,
    paddingTop: 12,
    gap: 6,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    // flex: 1, // Removed to allow wrap
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: { 
    backgroundColor: Colors.white, 
    borderRadius: BorderRadius.xl, 
    padding: Spacing.xl, 
    maxHeight: '80%',
    width: '100%',
    ...Shadows.card,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.strokeSubtle,
  },
  modalTitle: { 
    marginBottom: Spacing.lg,
    fontFamily: FontFamily.bold,
    textAlign: 'center',
  },
  dateSelectorRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    padding: 16, 
    backgroundColor: Colors.surfaceMuted, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.strokeSubtle,
  },
  actionBtn: { 
    backgroundColor: Colors.primary, 
    padding: 16, 
    borderRadius: 12, 
    alignItems: 'center' 
  },
  fullImage: {
    width: '90%',
    height: '80%',
  },
  modalClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
});
