import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  Text,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '@/navigation/RootNavigator';
import { Colors, FontFamily } from '@/constants/theme';
import { ticketsApi } from '@/api/tickets.api';
import { useContactsStore } from '@/store/contacts.store';
import { getLocalTickets } from '@/storage/tickets.local';
import { getLocalWallets } from '@/storage/wallets.local';
import { useAuthStore } from '@/store/auth.store';
import { getRubroLabel, GENERAL_RUBROS_INGRESOS, GENERAL_RUBROS_GASTOS, WALLET_RUBROS_MAP, getPartitionedRubros } from '@/constants/rubros';

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const FREQ_LABELS: Record<string, string> = {
  weekly: '1 vez por semana',
  biweekly: '1 vez cada 15 días',
  monthly: '1 vez por mes',
  bimonthly: '1 vez cada 2 meses',
  'semi-annually': '1 vez cada 6 meses',
  yearly: '1 vez por año',
};

const CURRENCY_NAMES: Record<string, string> = {
  ARS: 'Peso Argentino',
  USD: 'Dólar Estadounidense',
  UYU: 'Peso Uruguayo',
  BRL: 'Real',
  CLP: 'Peso Chileno',
  COP: 'Peso Colombiano',
  MXN: 'Peso Mexicano',
  PEN: 'Sol',
  VES: 'Bolívar',
  BOB: 'Boliviano',
};

// ─── Contact Picker Modal ─────────────────────────────────────────────────────────────

const cleanPhone = (p?: string) => {
  if (!p) return '';
  if (p.includes('-') && p.length > 20) return p; // UUID
  const digits = p.replace(/\D/g, '');
  return digits.slice(-8); // Comparar solo los últimos 8 dígitos para evitar problemas de prefijos
};

interface Contact { name: string; phoneNumber: string; }

interface ContactPickerProps {
  selected: Contact[];
  onConfirm: (contacts: Contact[]) => void;
  onClose: () => void;
}

const ContactPickerModal: React.FC<ContactPickerProps> = ({ selected, onConfirm, onClose }) => {
  const { user } = useAuthStore();
  const { getContactName, loadContacts } = useContactsStore();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Contact[]>(selected);

  useEffect(() => {
    const load = async () => {
      await loadContacts();
      const tickets = await getLocalTickets();
      const map = new Map<string, Contact>();
      tickets.forEach((t: any) => {
        const add = (phone: string) => {
          if (!phone) return;
          // Normalizar a solo números (característica internacional)
          const clean = phone.replace(/[^0-9]/g, '');
          if (clean && clean !== user?.phoneNumber?.replace(/[^0-9]/g, '') && !map.has(clean))
            map.set(clean, { phoneNumber: clean, name: getContactName(clean) });
        };
        add(t.ownerId);
        add(t.toUser);
      });
      setContacts(Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name)));
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!search) return contacts;
    const lower = search.toLowerCase();
    return contacts.filter(c =>
      c.name.toLowerCase().includes(lower) || c.phoneNumber.includes(lower)
    );
  }, [contacts, search]);

  const toggle = (c: Contact) => {
    setDraft(prev =>
      prev.some(p => cleanPhone(p.phoneNumber) === cleanPhone(c.phoneNumber))
        ? prev.filter(p => cleanPhone(p.phoneNumber) !== cleanPhone(c.phoneNumber))
        : [...prev, c]
    );
  };

  const isSelected = (c: Contact) => draft.some(p => cleanPhone(p.phoneNumber) === cleanPhone(c.phoneNumber));

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={pickerStyles.contactModal} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          {/* Header */}
          <View style={pickerStyles.modalHeaderHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ fontSize: 15, fontFamily: FontFamily.medium, color: '#737373' }}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={pickerStyles.modalTitleMain}>Contactos</Text>
            <TouchableOpacity onPress={() => onConfirm(draft)}>
              <Text style={{ fontSize: 15, fontFamily: FontFamily.bold, color: '#16A34A' }}>Listo</Text>
            </TouchableOpacity>
          </View>

          {/* Búsqueda */}
          <View style={{ padding: 16 }}>
            <View style={pickerStyles.searchBarWrapper}>
              <Ionicons name="search" size={18} color="#A3A3A3" style={{ marginRight: 8 }} />
              <TextInput
                style={pickerStyles.searchBar}
                placeholder="Buscar por nombre o número..."
                placeholderTextColor="#737373"
                value={search}
                onChangeText={setSearch}
              />
              {search ? (
                <TouchableOpacity onPress={() => setSearch('')} style={{ padding: 6 }}>
                  <Ionicons name="close-circle" size={18} color="#A3A3A3" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* Horizontal Chips for Selected Contacts */}
          {draft.length > 0 && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {draft.map(c => (
                  <TouchableOpacity
                    key={c.phoneNumber}
                    style={pickerStyles.selectedChip}
                    onPress={() => toggle(c)}
                  >
                    <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#404040', alignItems: 'center', justifyContent: 'center', marginRight: 6 }}>
                      <Text style={{ fontSize: 10, color: 'white', fontFamily: FontFamily.bold }}>
                        {(c.name || '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={pickerStyles.selectedChipText}>{c.name.split(' ')[0]}</Text>
                    <Ionicons name="close-circle" size={16} color="white" style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {loading ? (
            <ActivityIndicator color="#363630" style={{ marginTop: 32 }} />
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={c => c.phoneNumber}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', marginTop: 40 }}>
                  <Text style={pickerStyles.empty}>No se encontraron contactos</Text>
                </View>
              }
              renderItem={({ item: c }) => {
                const selected = isSelected(c);
                return (
                  <TouchableOpacity
                    style={pickerStyles.contactRow}
                    onPress={() => toggle(c)}
                  >
                    <View style={pickerStyles.avatar}>
                      <Text style={pickerStyles.avatarText}>
                        {(c.name || '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={pickerStyles.contactName}>{c.name}</Text>
                      <Text style={pickerStyles.contactPhone}>{c.phoneNumber}</Text>
                    </View>
                    <Ionicons
                      name={selected ? "checkmark-circle" : "ellipse-outline"}
                      size={24}
                      color={selected ? "#16A34A" : "#D1D5DB"}
                    />
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

// â”€â”€â”€ Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const EditRecurringTicketScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, 'EditRecurringTicket'>>();
  const { item } = route.params;
  const { getContactName } = useContactsStore();

  // Estado inicial: todos los participantes
  const initParticipants = (): Contact[] => {
    if (!item.participants || item.participants.length === 0) return [];
    return item.participants.map((p: any) => ({
      phoneNumber: String(p.userId).replace(/[^0-9]/g, ''),
      name: getContactName(p.userId),
    }));
  };

  const [description, setDescription] = useState(String(item.description ?? ''));
  const [comment, setComment] = useState(String(item.comment ?? ''));
  const [amount, setAmount] = useState(String(Math.round(Number(item.amount ?? 0))));
  const [paymentProcedure, setPayProc] = useState(String(item.paymentProcedure ?? ''));
  const [privateNote, setPrivateNote] = useState(String(item.privateNote ?? ''));
  const [helpToCollect, setHelp] = useState(!!item.helpToCollect);
  const [totalInstallments, setTotal] = useState(String(item.totalInstallments ?? '12'));
  const [participants, setParticipants] = useState<Contact[]>(initParticipants);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [rubroPickerVisible, setRubroPickerVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const isIncome = item.type === 'income';
  const currencyName = CURRENCY_NAMES[item.currency] ?? item.currency;

  const [rubro, setRubro] = useState<string>(
    isIncome
      ? (item.rubroIncome ?? item.rubro ?? '')
      : (item.rubroExpense ?? item.rubro ?? '')
  );
  const [walletName, setWalletName] = useState<string>('...');
  const [walletType, setWalletType] = useState<string>('personal');
  const [walletEnabledCats, setWalletEnabledCats] = useState<string[] | null>(null);

  // Lista de rubros: enabledCategories del wallet > WALLET_RUBROS_MAP > todos
  const rubroList = (() => {
    let enabledIds: string[] = [];
    if (walletEnabledCats && walletEnabledCats.length > 0) {
      enabledIds = walletEnabledCats;
    } else {
      const mapEntry = WALLET_RUBROS_MAP[walletType] || WALLET_RUBROS_MAP['otro'];
      enabledIds = isIncome ? mapEntry.ingresos : mapEntry.gastos;
    }
    return getPartitionedRubros(item.type, enabledIds);
  })();
  const rubroLabel = getRubroLabel(rubro || undefined, item.type, item.globalType);

  useEffect(() => {
    getLocalWallets().then(ws => {
      const found = ws.find((w: any) => w.id === item.walletId);
      setWalletName(found?.name ?? 'Sin billetera');
      setWalletType(found?.type ?? 'personal');
      // enabledCategories: [{ categoryKey, type }] â€” filtramos por el tipo del ticket
      if (found?.enabledCategories && found.enabledCategories.length > 0) {
        const ids = found.enabledCategories
          .filter((c: any) => c.type === item.type)
          .map((c: any) => c.categoryKey);
        setWalletEnabledCats(ids.length > 0 ? ids : null);
      }
    });
  }, [item.walletId, item.type]);

  const handleSave = async () => {
    if (!description.trim()) {
      Alert.alert('Descripción requerida', 'Ingresá una descripción para la plantilla.');
      return;
    }
    const parsedAmount = parseInt(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Monto inválido', 'Ingresá un monto mayor a 0.');
      return;
    }

    setSaving(true);
    try {
      await ticketsApi.updateRecurringTicket(item.id, {
        description: description.trim(),
        comment: comment.trim() || null,
        amount: parsedAmount,
        paymentProcedure: paymentProcedure.trim() || null,
        privateNote: privateNote.trim() || null,
        helpToCollect,
        totalInstallments: item.totalInstallments,
        participants: participants.map(p => ({ userId: p.phoneNumber, role: 'user_id' })),
        ...(isIncome ? { rubroIncome: rubro || null } : { rubroExpense: rubro || null }),
      });
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'No se pudieron guardar los cambios. Revisá tu conexión.');
    } finally {
      setSaving(false);
    }
  };

  const formatAmount = (val: string) => {
    if (!val) return '';
    return val.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  return (
    <SafeAreaView style={styles.container}>

      {/* â”€â”€ Header: [spacer] [badge centrado] [X] â”€â”€ */}
      <View style={styles.header}>
        {/* Botón volver a la izquierda */}
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <View style={styles.closeBtnInner}>
            <Ionicons name="chevron-back" size={20} color="#363630" />
          </View>
        </TouchableOpacity>

        {/* Badge centrado */}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <View style={[styles.typeBadge, isIncome ? styles.typeBadgeIncome : styles.typeBadgeExpense]}>
            <Text style={[styles.typeBadgeText, isIncome ? styles.typeBadgeTextIncome : styles.typeBadgeTextExpense]}>
              {isIncome ? 'Cobro' : 'Pago'}
            </Text>
          </View>
          <Text style={styles.currencyNameText}>{currencyName}</Text>
        </View>

        {/* Spacer a la derecha para mantener el centrado */}
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: 120 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* â”€â”€ Monto â”€â”€ */}
          <View style={styles.amountBox}>
            <TextInput
              style={styles.amountInput}
              placeholder="0"
              keyboardType="number-pad"
              placeholderTextColor="#737373"
              value={formatAmount(amount)}
              onChangeText={(t) => setAmount(t.replace(/[^0-9]/g, ''))}
              maxLength={15}
            />
          </View>

          {/* â”€â”€ Descripción â”€â”€ */}
          <TextInput
            style={styles.descriptionInput}
            placeholder="Agregar un detalle"
            placeholderTextColor="#878778"
            value={description}
            onChangeText={setDescription}
          />

          {/* â”€â”€ Pill frecuencia (info) â”€â”€ */}
          <View style={styles.pillRow}>
            <View style={styles.infoPill}>
              <Ionicons name="repeat-outline" size={14} color="#878778" style={{ marginRight: 4 }} />
              <Text style={styles.infoPillText}>
                {FREQ_LABELS[item.frequency] ?? item.frequency}
              </Text>
            </View>
          </View>

          {/* ── Billetera | Categoría (billetera: readonly, categoría: editable) ── */}
          <View style={styles.infoDualRow}>
            <View style={styles.infoDualCol}>
              <Text style={styles.infoDualLabel}>Billetera</Text>
              <Text style={styles.infoDualValue} numberOfLines={1}>{walletName}</Text>
            </View>
            <View style={styles.infoDualDivider} />
            <TouchableOpacity
              style={[styles.infoDualCol, { alignItems: 'flex-end' }]}
              onPress={() => setRubroPickerVisible(true)}
            >
              <Text style={styles.infoDualLabel}>Categoría</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 }}>
                <Text style={[styles.infoDualValue, { flexShrink: 1 }]} numberOfLines={1} ellipsizeMode="tail">
                  {rubroLabel}
                </Text>
                <Ionicons name="chevron-forward" size={13} color="#b0b0a8" />
              </View>
            </TouchableOpacity>
          </View>

          {/* â”€â”€ Separador â”€â”€ */}
          <View style={styles.sectionSep} />

          {/* â”€â”€ Destinatario â”€â”€ */}
          <TouchableOpacity
            style={styles.row}
            onPress={() => setPickerVisible(true)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Destinatarios</Text>
              {participants.length > 0 && (
                <Text style={styles.rowSub}>
                  {participants.map(p => p.name).join(', ')}
                </Text>
              )}
            </View>
            <View style={styles.rowRight}>
              <Text style={[styles.rowValue, participants.length === 0 && styles.rowValuePlaceholder]}>
                {participants.length === 0 ? 'Elegir' : `${participants.length} contacto${participants.length !== 1 ? 's' : ''}`}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#b7b7ae" />
            </View>
          </TouchableOpacity>
          <View style={styles.rowSep} />

          {/* â”€â”€ Cantidad de repeticiones (solo lectura) â”€â”€ */}
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Cantidad de repeticiones</Text>
              <Text style={styles.rowSub}>
                {item.currentInstallment ?? 0} completadas de {item.totalInstallments}
              </Text>
            </View>
            <Text style={styles.rowValue}>{totalInstallments}</Text>
          </View>
          <View style={styles.rowSep} />

          {/* â”€â”€ Asistente de cobranza â”€â”€ */}
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Asistente de cobranza</Text>
              <Text style={styles.rowSub}>Ayudame a cobrar este ticket.</Text>
            </View>
            <Switch
              value={helpToCollect}
              onValueChange={setHelp}
              trackColor={{ false: '#f2f2f0', true: '#3a9e76' }}
              thumbColor={Platform.OS === 'android' ? (helpToCollect ? '#3a9e76' : '#f4f3f4') : undefined}
            />
          </View>
          <View style={styles.rowSep} />

          {/* â”€â”€ Instrucciones de pago â”€â”€ */}
          <TextInput
            style={styles.multiInput}
            placeholder="Instrucciones de pago"
            placeholderTextColor="#878778"
            value={paymentProcedure}
            onChangeText={setPayProc}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <View style={styles.rowSep} />

          {/* â”€â”€ Detalle público â”€â”€ */}
          <TextInput
            style={styles.multiInput}
            placeholder="Detalle del ticket (lo pueden ver todos)"
            placeholderTextColor="#878778"
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <View style={styles.rowSep} />

          {/* â”€â”€ Nota privada â”€â”€ */}
          <TextInput
            style={styles.multiInput}
            placeholder="Nota privada (solo la ves vos)"
            placeholderTextColor="#878778"
            value={privateNote}
            onChangeText={setPrivateNote}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <View style={{ height: 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* â”€â”€ Footer Guardar â”€â”€ */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.saveBtn, (saving || pressed) && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.saveBtnText}>Guardar cambios</Text>
          }
        </Pressable>
      </View>

      {/* â”€â”€ Modal selector de contactos (multi-select) â”€â”€ */}
      {pickerVisible && (
        <ContactPickerModal
          selected={participants}
          onConfirm={(sel) => { setParticipants(sel); setPickerVisible(false); }}
          onClose={() => setPickerVisible(false)}
        />
      )}

      {/* â”€â”€ Modal selector de rubro â”€â”€ */}
      <Modal
        visible={rubroPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRubroPickerVisible(false)}
      >
        <Pressable
          style={rubroStyles.overlay}
          onPress={() => setRubroPickerVisible(false)}
        />
        <View style={rubroStyles.sheet}>
          <View style={rubroStyles.sheetHeader}>
            <Text style={rubroStyles.sheetTitle}>Categoría</Text>
            <TouchableOpacity onPress={() => setRubroPickerVisible(false)}>
              <Ionicons name="close" size={22} color="#363630" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={rubroList}
            keyExtractor={r => r.id}
            renderItem={({ item: r }) => {
              if (r.isSeparator) {
                return (
                  <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                    <View style={{ height: 1, backgroundColor: '#f2f2f0', width: '100%' }} />
                    <Text style={{ fontSize: 10, color: '#b7b7ae', marginTop: 6, fontFamily: FontFamily.bold, textTransform: 'uppercase' }}>Otras categorías</Text>
                  </View>
                );
              }
              return (
                <TouchableOpacity
                  style={rubroStyles.rubroRow}
                  onPress={() => { setRubro(r.id); setRubroPickerVisible(false); }}
                >
                  <View style={rubroStyles.rubroIcon}>
                    <Ionicons name={r.icon as any} size={18} color="#363630" />
                  </View>
                  <Text style={rubroStyles.rubroLabel}>{r.label}</Text>
                  {rubro === r.id && (
                    <Ionicons name="checkmark" size={20} color="#207e52" />
                  )}
                </TouchableOpacity>
              );
            }}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#f2f2f0' }} />}
            contentContainerStyle={{ paddingBottom: 32 }}
          />
        </View>
      </Modal>

    </SafeAreaView>
  );
};

// â”€â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerSpacer: { width: 36, height: 36 }, // mismo tamaño que closeBtnInner
  closeBtn: {},  // ya no necesita posición absoluta
  closeBtnInner: { backgroundColor: '#f2f2f0', borderRadius: 100, padding: 8 },

  typeToggleRow: { alignItems: 'center', paddingTop: 8, paddingBottom: 4, gap: 4 },
  typeBadge: { borderRadius: 100, paddingHorizontal: 28, paddingVertical: 10 },
  typeBadgeIncome: { backgroundColor: '#3a9e7620' },
  typeBadgeExpense: { backgroundColor: '#c0505020' },
  typeBadgeText: { fontSize: 15, fontFamily: FontFamily.bold },
  typeBadgeTextIncome: { color: '#3a9e76' },
  typeBadgeTextExpense: { color: '#c05050' },
  currencyNameText: { fontSize: 12, color: '#878778', fontFamily: FontFamily.medium, marginTop: 2 },

  content: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 20 },

  amountBox: {
    backgroundColor: '#f2f2f0', borderRadius: 20,
    paddingVertical: 16, paddingHorizontal: 24, alignItems: 'center', marginBottom: 4,
  },
  amountInput: {
    fontSize: 52, fontFamily: FontFamily.bold, color: '#363630',
    textAlign: 'center', width: '100%',
  },

  descriptionInput: {
    width: '100%', fontSize: 15, fontFamily: FontFamily.regular,
    color: '#878778', textAlign: 'center', paddingVertical: 8, marginBottom: 4,
  },

  pillRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  infoPill: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#e7e7e4', borderRadius: 100,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  infoPillText: { fontSize: 14, color: '#878778', fontFamily: FontFamily.regular },

  sectionSep: { height: 1, backgroundColor: '#f2f2f0', marginTop: 20 },

  // Billetera | CategorÃ­a
  infoDualRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, marginBottom: 4,
  },
  infoDualCol: { flex: 1 },
  infoDualDivider: { width: 1, height: 36, backgroundColor: '#e8e8e4', marginHorizontal: 12 },
  infoDualLabel: { fontSize: 11, color: '#b0b0a8', fontFamily: FontFamily.regular, marginBottom: 3 },
  infoDualValue: { fontSize: 15, color: '#363630', fontFamily: FontFamily.semibold },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  rowLabel: { flex: 1, fontSize: 15, color: '#363630', fontFamily: FontFamily.medium },
  rowSub: { fontSize: 12, color: '#878778', marginTop: 2 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowValue: { fontSize: 15, color: '#878778', fontFamily: FontFamily.regular },
  rowValuePlaceholder: { color: '#878778' },
  rowValueInput: {
    fontSize: 15, color: '#363630', fontFamily: FontFamily.regular,
    minWidth: 50, textAlign: 'right',
  },
  rowSep: { height: 1, backgroundColor: '#f2f2f0' },

  multiInput: {
    fontSize: 15, color: '#363630', fontFamily: FontFamily.regular,
    paddingVertical: 14, minHeight: 60,
  },

  footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#f2f2f0' },
  saveBtn: { backgroundColor: '#196342', borderRadius: 1000, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontFamily: FontFamily.bold },
});

// â”€â”€â”€ Picker Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const pickerStyles = StyleSheet.create({
  contactModal: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeaderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitleMain: {
    fontSize: 17,
    fontFamily: FontFamily.bold,
    color: '#171717',
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 48,
  },
  searchBar: {
    flex: 1,
    fontSize: 15,
    fontFamily: FontFamily.regular,
    color: '#171717',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  avatarText: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    color: '#737373',
  },
  contactName: {
    fontSize: 15,
    fontFamily: FontFamily.semibold,
    color: '#171717',
  },
  contactPhone: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: '#737373',
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary || '#171717',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  selectedChipText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontFamily: FontFamily.medium,
  },
  empty: {
    textAlign: 'center',
    color: '#878778',
    marginTop: 40,
    fontSize: 14,
  },
});

const rubroStyles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#f2f2f0',
  },
  sheetTitle: { fontSize: 17, fontFamily: FontFamily.bold, color: '#1a1a18' },
  rubroRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
  },
  rubroIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#f2f2f0', alignItems: 'center', justifyContent: 'center',
  },
  rubroLabel: { flex: 1, fontSize: 15, color: '#363630', fontFamily: FontFamily.medium },
});

