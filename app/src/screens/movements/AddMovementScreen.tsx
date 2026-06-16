import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  Platform,
  ScrollView,
  Switch,
  Alert,
  Animated,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  TouchableWithoutFeedback,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';




import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '@/navigation/RootNavigator';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import NativeDatePicker from '@/components/ui/NativeDatePicker';

import { getLocalWallets, LocalWallet } from '@/storage/wallets.local';
import { addLocalTicket, getLocalTickets, updateLocalTicket, markTicketAsOpened } from '@/storage/tickets.local';
import { ticketsApi } from '@/api/tickets.api';
import { API_URL, WEB_SHARE_URL } from '@/api/api.client';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';
import { useContactsStore } from '@/store/contacts.store';
import { getContactByPhoneNumber, getContacts, normalizePhone } from '@/services/contacts.service';
import { getSmartDisplayName, getSmartAvatarUrl } from '@/utils/userDisplay';
import { Colors, FontFamily } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { QRScannerModal } from '@/components/ui/QRScannerModal';
import { GENERAL_RUBROS_GASTOS, GENERAL_RUBROS_INGRESOS, WALLET_RUBROS_MAP, getRubroLabel, getPartitionedRubros } from '@/constants/rubros';
import { aiApi } from '@/api/ai.api';
import { SYSTEM_WALLET_NAME } from '@/constants';
import { normalizeUrl } from '@/utils/url.util';

const cleanPhone = (p?: string) => {
  if (!p) return '';
  if (p.includes('-') && p.length > 20) return p; // UUID
  const digits = p.replace(/\D/g, '');
  return digits.slice(-8); // Comparar solo los últimos 8 dígitos para evitar problemas de prefijos
};



const formatAmount = (val: string) => {
  if (!val) return '';
  const [int, dec] = val.split('.');
  const formattedInt = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return dec !== undefined ? `${formattedInt},${dec}` : formattedInt;
};

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

/**
 * Normaliza una fecha para evitar el desfase de zona horaria (clásico error de un día menos).
 * Si es un string YYYY-MM-DD, lo trata como local. Si es ISO, asegura que no cambie de día al mostrarlo.
 */
const parseSafeDate = (dateSource: any): Date => {
  if (!dateSource) return new Date();
  const d = new Date(dateSource);
  if (isNaN(d.getTime())) return new Date();

  // Si el string no incluye hora (ej: "2023-10-25"), JS lo interpreta como UTC 00:00.
  // Al pasarlo a local en zonas horarias negativas (América), resta un día.
  if (typeof dateSource === 'string' && dateSource.length <= 10) {
    // Reemplazar guiones por barras para que JS lo trate como local en algunos navegadores
    // o simplemente añadir una hora segura al mediodía.
    return new Date(dateSource.replace(/-/g, '/') + ' 12:00:00');
  }

  return d;
};

// Mocked Payment Methods
// Mocked Payment Methods base list (will be filtered/extended by country)
const BASE_PAYMENT_METHODS = [
  { id: 'cash', label: 'En mano' },
  { id: 'transfer', label: 'Transferencia bancaria' },
  { id: 'mercadopago', label: 'Mercado Pago' },
  { id: 'debit', label: 'Tarjeta de Débito' },
  { id: 'credit', label: 'Tarjeta de Crédito' },
  { id: 'agency', label: 'Agencia de cobranza' },
];

const DATE_QUICK_OPTIONS = [
  { id: 'today', label: 'Hoy' },
  { id: 'tomorrow', label: 'Mañana' },
  { id: '1week', label: 'Dentro de 1 semana' },
  { id: '15days', label: 'Dentro de 15 días' },
  { id: '1month', label: 'Dentro de 1 mes' },
  { id: 'custom', label: 'Seleccionar Fecha' },
];

interface ContactInfo {
  name: string;
  phone: string;
  imageUri?: string;
}

const MOCK_CONTACTS: ContactInfo[] = [
  { name: 'DEMO_1', phone: '+59811223344' },
  { name: 'DEMO_2', phone: '+59822334455' },
  { name: 'DEMO_3', phone: '+59833445566' },
  { name: 'DEMO_4', phone: '+59844556677' },
  { name: 'DEMO_5', phone: '+59855667788' },
  { name: 'DEMO_6', phone: '+59866778899' },
  { name: 'DEMO_7', phone: '+59877889900' },
  { name: 'DEMO_8', phone: '+59888990011' },
  { name: 'DEMO_NO_NORMALIZADO', phone: '096775523323' },
  { name: 'Ana Gómez', phone: '+5491112345678' },
  { name: 'Carlos López', phone: '+5491123456789' },
  { name: 'Lucía Fernández', phone: '+5491134567890' },
  { name: 'Mario Torres', phone: '+5491145678901' },
  { name: 'Cliente Frecuente', phone: '1156789012' },
];

const CURRENCIES = [
  { code: 'ARS', name: 'Peso Argentino' },
  { code: 'USD', name: 'Dólar Estadounidense' },
  { code: 'UYU', name: 'Peso Uruguayo' },
  { code: 'BRL', name: 'Real' },
  { code: 'CLP', name: 'Peso Chileno' },
  { code: 'COP', name: 'Peso Colombiano' },
  { code: 'MXN', name: 'Peso Mexicano' },
  { code: 'PEN', name: 'Sol' },
  { code: 'VES', name: 'Bolívar' },
  { code: 'BOB', name: 'Boliviano' },
  { code: 'CRC', name: 'Colón Costarricense' },
  { code: 'CUP', name: 'Peso Cubano' },
  { code: 'DOP', name: 'Peso Dominicano' },
  { code: 'GTQ', name: 'Quetzal' },
  { code: 'HNL', name: 'Lempira' },
  { code: 'NIO', name: 'Córdoba' },
  { code: 'PAB', name: 'Balboa' },
  { code: 'PYG', name: 'Guaraní' },
];

export const AddMovementScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'AddMovementModal'>>();
  const initialWalletId = route.params?.walletId;
  const ticketId = route.params?.ticketId;
  const { user } = useAuthStore();
  const [ticketOwnerId, setTicketOwnerId] = useState<string | null>(null);
  const [toUserId, setToUserId] = useState<string | null>(null);
  const [wallets, setWallets] = useState<LocalWallet[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(initialWalletId || null);
  const [toWalletId, setToWalletId] = useState<string | null>(null);
  const [toRubroId, setToRubroId] = useState<string | null>(null);

  // Si no hay ticketId (nuevo) es dueño. Si hay ticketId, DEBE haber un ownerId cargado y coincidir.
  const isOwner = !ticketId || (ticketOwnerId !== null && ticketOwnerId === user?.id);
  const isParticipant = (toUserId !== null && toUserId === user?.phoneNumber);
  const selectedWallet = wallets.find(w => w.id === selectedWalletId);
  const isWalletMember = selectedWallet?.members?.some(m => m.userId === user?.id || m.userId === user?.phoneNumber) || false;
  const canEditAsOwner = isOwner || isWalletMember;

  const [type, setType] = useState<'income' | 'expense' | 'transfer' | 'adjustment'>('income');
  const [globalType, setGlobalType] = useState<string | null>(null);
  const isTransferOrAdjustment = type === 'transfer' || type === 'adjustment' || globalType === 'transfer' || globalType === 'adjustment';

  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(user?.currency || 'USD');
  const [description, setDescription] = useState('');
  const [originalDescription, setOriginalDescription] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [originalComment, setOriginalComment] = useState<string | null>(null);
  const [assignedContacts, setAssignedContacts] = useState<ContactInfo[]>([]);
  const [assignedListName, setAssignedListName] = useState<string | null>(null);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isCustomDateActive, setIsCustomDateActive] = useState(false);
  const [status, setStatus] = useState<'pending' | 'completed' | 'cancelled'>('pending');
  const [generatePeilink, setGeneratePeilink] = useState(true);
  const [helpToCollect, setHelpToCollect] = useState(false);

  // Recurrence state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceCount, setRecurrenceCount] = useState('12');
  const [recurrenceFrequency, setRecurrenceFrequency] = useState('monthly');
  const [isRecurrenceModalVisible, setIsRecurrenceModalVisible] = useState(false);
  const [privateNote, setPrivateNote] = useState('');
  const [paymentProcedure, setPaymentProcedure] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [expenses, setExpenses] = useState('');
  const [expensesDetail, setExpensesDetail] = useState('');
  const [reference, setReference] = useState('');
  const [attachmentUri, setAttachmentUri] = useState<string | null>(null);

  const [isCancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const [isWalletModalVisible, setWalletModalVisible] = useState(false);
  const [isPaymentMethodModalVisible, setPaymentMethodModalVisible] = useState(false);
  const [isDateOptionsModalVisible, setDateOptionsModalVisible] = useState(false);

  const [isContactModalVisible, setContactModalVisible] = useState(false);
  const [isListModalVisible, setListModalVisible] = useState(false);
  const [isContactOptionsModalVisible, setContactOptionsModalVisible] = useState(false);
  const [contactsList, setContactsList] = useState<ContactInfo[]>([]);
  const [selectedContactsTemp, setSelectedContactsTemp] = useState<ContactInfo[]>([]);
  const [contactSearchText, setContactSearchText] = useState('');
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [isReviewModalVisible, setReviewModalVisible] = useState(false);
  const [listSearchText, setListSearchText] = useState('');
  const [reviewSearchText, setReviewSearchText] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'attach'>('info');

  const [isLogModalVisible, setIsLogModalVisible] = useState(false);

  const [selectedRubroId, setSelectedRubroId] = useState<string | null>(null);
  const [isRubroModalVisible, setRubroModalVisible] = useState(false);
  const [initialAmount, setInitialAmount] = useState<number | null>(null);
  const [initialDueDate, setInitialDueDate] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);


  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [ownerInfo, setOwnerInfo] = useState<{ displayName?: string; avatarUrl?: string } | null>(null);

  const [amountPaid, setAmountPaid] = useState(0);
  const [source, setSource] = useState('app');
  const [sourceInfo, setSourceInfo] = useState('');


  // Payment Modal State
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payDescription, setPayDescription] = useState('');
  const [payMethod, setPayMethod] = useState('');
  const [payAttachment, setPayAttachment] = useState<string | null>(null);
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const [assignedContactAvatar, setAssignedContactAvatar] = useState<string | null>(null);
  const [originalRubroId, setOriginalRubroId] = useState<string | null>(null);
  const [originalAmount, setOriginalAmount] = useState<string | null>(null);

  const paymentMethods = useMemo(() => {
    const list = [...BASE_PAYMENT_METHODS];
    if (user?.country === 'UY' || user?.country === 'Uruguay') {
      list.push(
        { id: 'abitab', label: 'Abitab' },
        { id: 'midinero', label: 'Mi Dinero' },
        { id: 'redpagos', label: 'RedPagos' }
      );
    } else if (user?.country === 'AR' || user?.country === 'Argentina') {
      list.push(
        { id: 'rapipago', label: 'Rapipago' },
        { id: 'pagofacil', label: 'Pago Fácil' },
        { id: 'cobroexpress', label: 'Cobro Express' },
        { id: 'redlink', label: 'Red Link' }
      );
    }
    return list;
  }, [user?.country]);
  const [isPredicting, setIsPredicting] = useState(false);

  const [ownerRating, setOwnerRating] = useState(0);
  const [participantRating, setParticipantRating] = useState(0);
  const [shortId, setShortId] = useState<string | null>(null);
  const [originalDate, setOriginalDate] = useState<Date | null>(null);
  const [isScannerVisible, setScannerVisible] = useState(false);

  const generateShortId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleShare = async () => {
    const sid = shortId || generateShortId();
    if (!shortId) setShortId(sid);
    await performShare(sid);
  };

  const performShare = async (sid: string) => {
    try {
      const userName = user?.displayName || user?.phoneNumber || 'Un usuario';
      const shareUrl = `${WEB_SHARE_URL}/t/${sid}`;
      const message = `${userName} te envió un ticket de PeIApp.\n\nPodés ver los detalles, postergar la fecha o cargar un pago acá:\n${shareUrl}\n\n¡Mejorá tus finanzas grátis con PeIApp! www.peiapp.tech`;

      await Share.share({
        message,
        url: shareUrl, // iOS solo
      });
    } catch (error) {
      console.error('Error sharing ticket:', error);
    }
  };

  // Upfront Payment during creation
  const [isAlreadyPaid, setIsAlreadyPaid] = useState(false);
  const [createPayMethod, setCreatePayMethod] = useState('');
  const [createPayAttachment, setCreatePayAttachment] = useState<string | null>(null);

  const handleProrateAmount = () => {
    const count = parseInt(recurrenceCount);
    const currentAmount = parseFloat(amount.replace(/\./g, '').replace(',', '.'));
    if (!isNaN(count) && count > 1 && !isNaN(currentAmount) && currentAmount > 0) {
      const prorated = Math.round(currentAmount / count).toString();
      setAmount(prorated);
      showToast(`Monto dividido: ${count} cuotas de $${Number(prorated).toLocaleString('es-AR')}`);
    } else {
      Alert.alert('Error', 'Ingresa un monto y cantidad de cuotas válidos (mayor a 1).');
    }
  };

  const aiPulseAnim = useRef(new Animated.Value(1)).current;

  // Manejar animación de pulso para la predicción de IA
  useEffect(() => {
    if (isPredicting) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(aiPulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
          Animated.timing(aiPulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      aiPulseAnim.setValue(1);
    }
  }, [isPredicting]);



  // Toast state
  const [toastAlpha] = useState(new Animated.Value(0));
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    Animated.sequence([
      Animated.timing(toastAlpha, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(toastAlpha, { toValue: 0, duration: 250, useNativeDriver: true })
    ]).start();
  };

  useEffect(() => {
    const fetchWallets = async () => {
      const local = await getLocalWallets();
      setWallets(local);
      if (local.length > 0 && !ticketId) {
        if (initialWalletId && local.some(w => w.id === initialWalletId)) {
          setSelectedWalletId(initialWalletId);
        } else if (user?.defaultWalletId && local.some(w => w.id === user.defaultWalletId)) {
          setSelectedWalletId(user.defaultWalletId);
        } else {
          setSelectedWalletId(local[0].id);
        }
      }
    };
    fetchWallets();

    if (Platform.OS === 'web') {
      setContactsList(MOCK_CONTACTS);
    }
  }, [user?.defaultWalletId]);

  // Sincronizar moneda con la billetera seleccionada (solo para nuevos tickets)
  useEffect(() => {
    if (selectedWallet && !ticketId) {
      setCurrency(selectedWallet.currency || 'USD');
    }
  }, [selectedWalletId, wallets]);

  const currencyName = useMemo(() => {
    return CURRENCIES.find(c => c.code === currency)?.name || currency;
  }, [currency]);

  // Cargar datos si es edición
  useEffect(() => {
    if (ticketId) {
      const loadTicket = async () => {
        await markTicketAsOpened(ticketId);
        const all = await getLocalTickets();
        const t = (all as any[]).find((x: any) => x.id === ticketId);
        if (t) {
          setTicketOwnerId(t.ownerId || null);
          setAmount(t.amount.toString());
          setOriginalAmount(t.amount.toString());
          setInitialAmount(t.initialAmount ?? null);
          setInitialDueDate(t.initialDueDate ?? null);
          // Cargar logs y mensajes de auditoría del chat
          setLoadingLogs(true);
          try {
            const [logsRes, chatRes] = await Promise.all([
              ticketsApi.getTicketLogs(ticketId),
              ticketsApi.getChatMessages(ticketId)
            ]);

            // Convertir mensajes de auditoría (que empiezan con ***) en logs sintéticos
            const auditLogs = chatRes
              .filter(m => m.message && m.message.trim().startsWith('***'))
              .map(m => ({
                logId: `audit_${m.id || Math.random()}`,
                action: 'audit_message',
                newValue: m.message,
                createdAt: m.createdAt,
                user: { displayName: m.senderName || m.userId },
                attachmentUrl: m.attachmentUrl,
                attachmentType: m.attachmentType
              }));

            // Combinar y ordenar por fecha descendente (más nuevos arriba) o ascendente según la UI
            // La UI parece iterar logs.map, asÃ­ que mantendremos el orden cronológico o inverso.
            // Los logs del servidor suelen venir ordenados.
            const combined = [...logsRes, ...auditLogs].sort((a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );

            setLogs(combined);
          } catch (error) {
            console.warn("Error fetching combined history", error);
          } finally {
            setLoadingLogs(false);
          }
          setOwnerInfo(t.ownerUserObj || (t as any).owner || {
            displayName: t.ownerDisplayName,
            avatarUrl: t.ownerAvatarUrl
          });
          setCreatedAt(t.createdAt || null);
          setType(t.type);
          setGlobalType(t.globalType || t.type);
          setCurrency(t.currency);
          setDescription(t.description);
          setOriginalDescription(t.description);
          const parsedDate = parseSafeDate(t.dueDate);
          setDate(parsedDate);
          setOriginalDate(parsedDate);
          setStatus(t.status);
          console.log("[DEBUG] loaded ticket status:", t.status, "ticketId:", ticketId);
          setGeneratePeilink(t.generatePeilink);
          setHelpToCollect(t.helpToCollect);
          setPaymentMethod(t.paymentMethod || '');
          setPaymentProcedure(t.paymentProcedure || '');
          setPrivateNote(t.privateNote || '');
          setReference(t.reference || '');
          setExpenses(t.expenses?.toString() || '');
          setExpensesDetail(t.expensesDetail || '');

          let wId = t.walletId;
          if (!wId && wallets.length > 0) {
            const systemWallet = wallets.find(w =>
              (w.type === 'mycollects' || w.name.toLowerCase().startsWith(SYSTEM_WALLET_NAME.toLowerCase()))
              && w.currency === t.currency
            ) || wallets.find(w =>
              w.type === 'mycollects' || w.name.toLowerCase().startsWith(SYSTEM_WALLET_NAME.toLowerCase())
            );
            if (systemWallet) wId = systemWallet.id;
          }
          if (wId) setSelectedWalletId(wId);
          setAttachmentUri(t.attachmentUrl || null);
          setAmountPaid(Number(t.amountPaid) || 0);

          setSource(t.source || 'app');
          setSourceInfo(t.sourceInfo || '');
          setComment(t.comment || '');
          setOriginalComment(t.comment || '');

          setOwnerRating(t.ownerRating || 0);
          setParticipantRating(t.participantRating || 0);
          setToUserId(t.toUser || null);



          if (t.toUser) {
            const phone = t.toUserObj?.phone || t.toUser;
            setAssignedContacts([{ name: getSmartDisplayName(phone, t.toUserDisplayName || t.contactName || t.toUserObj?.displayName || phone), phone }]);

            // Buscar avatar en contactos locales
            getContactByPhoneNumber(phone).then(c => {
              if (c?.imageUri) setAssignedContactAvatar(c.imageUri);
            }).catch(() => { });
          } else if (t.contactName) {
            setAssignedContacts([{ name: t.contactName, phone: '' }]);
          }

          // 2. Intentar cargar rubro por ID (nuevo formato de mnemónicos)
          if (t.rubro) {
            setSelectedRubroId(t.rubro);
            setOriginalRubroId(t.rubro);
          } else {
            // Fallback legacy (label matching)
            if (t.type === 'income' && t.rubroIncome) {
              const r = GENERAL_RUBROS_INGRESOS.find(x => x.label === t.rubroIncome);
              if (r) {
                setSelectedRubroId(r.id);
                setOriginalRubroId(r.id);
              }
            } else if (t.type === 'expense' && t.rubroExpense) {
              const r = GENERAL_RUBROS_GASTOS.find(x => x.label === t.rubroExpense);
              if (r) {
                setSelectedRubroId(r.id);
                setOriginalRubroId(r.id);
              }
            }
          }
          setShortId(t.shortId || null);
        }
      };
      loadTicket();
    }
  }, [ticketId, wallets]);

  const selectedList = selectedWallet?.distributionLists?.find(l => l.id === selectedListId);

  useEffect(() => {
    if (selectedWallet) {
      // SOLO si es un ticket nuevo, aplicamos los valores por defecto de la billetera
      if (!ticketId) {
        setPaymentProcedure(selectedWallet.defaultPaymentMethod || '');
        setCurrency(selectedWallet.currency || 'USD');
        setHelpToCollect(!!selectedWallet.helpToCollect);

        if (selectedWallet.defaultTransactionType) {
          setType(selectedWallet.defaultTransactionType);
        } else {
          // Fallback legacy logic
          const isBusiness = selectedWallet.type.includes('negocio') || selectedWallet.type === 'business';
          setType(isBusiness ? 'income' : 'expense');
        }
      }

      // Reset list if wallet changes and list not in it
      if (selectedListId && !selectedWallet.distributionLists?.some(l => l.id === selectedListId)) {
        setSelectedListId(null);
      }
    }
  }, [selectedWallet]);

  // Efecto reactivo para predecir rubro mientras se escribe (Debounced)
  useEffect(() => {
    if (!!ticketId || !description || description.trim().length < 4) return;

    const timer = setTimeout(() => {
      triggerRubroPrediction();
    }, 1200); // 1.2s de delay para no saturar la IA

    return () => clearTimeout(timer);
  }, [description, type]);

  const triggerRubroPrediction = async (forceInEdit: boolean = false) => {
    // Si estamos en edición y la descripción no ha cambiado desde la original, no predecimos
    if (!!ticketId && description === originalDescription && !forceInEdit) return;

    // Permitimos predecir tanto en alta como en edición si hay descripción suficiente
    if (!description || description.trim().length < 4) return;

    // Si ya estamos prediciendo, evitamos duplicidad (aunque el debounce ayuda)
    if (isPredicting) return;

    console.log(`[AI-Pred] Triggering for: "${description}" (force: ${forceInEdit}, edit: ${!!ticketId})`);

    setIsPredicting(true);
    try {
      let allowedRubros = [];
      if (selectedWallet) {
        // Usar la misma lógica que getAvailableRubros() para filtrar
        if (selectedWallet.enabledCategories && selectedWallet.enabledCategories.length > 0) {
          const ids = selectedWallet.enabledCategories
            .filter(c => c.type === type)
            .map(c => c.categoryKey);

          const general = type === 'income' ? GENERAL_RUBROS_INGRESOS : GENERAL_RUBROS_GASTOS;
          allowedRubros = general.filter(r => ids.includes(r.id));
        } else {
          // Fallback legacy logic
          const walletType = selectedWallet.type || 'otro';
          const mapping = WALLET_RUBROS_MAP[walletType] || { gastos: [], ingresos: [] };
          const ids = type === 'income' ? mapping.ingresos : mapping.gastos;
          const general = type === 'income' ? GENERAL_RUBROS_INGRESOS : GENERAL_RUBROS_GASTOS;
          allowedRubros = general.filter(r => ids.includes(r.id));
        }
      }

      // Si no hay rubros específicos para esta billetera/tipo, usar la lista completa
      if (!allowedRubros || allowedRubros.length === 0) {
        allowedRubros = type === 'income' ? GENERAL_RUBROS_INGRESOS : GENERAL_RUBROS_GASTOS;
        console.log(`[AI-Pred] No specific rubros for wallet, using full ${type} list (${allowedRubros.length} items)`);
      }
      console.log(`[AI-Pred] Selected Wallet: ${selectedWallet ? `${selectedWallet.name} (${selectedWallet.type})` : 'null'}, Type: ${type}, Allowed Rubros:`, allowedRubros.map(r => r.id));

      const predictedId = await aiApi.predictRubro(description, type, allowedRubros);
      console.log(`[AI-Pred] Predicted ID: "${predictedId}", type: ${type}, current selectedRubroId: "${selectedRubroId}"`);

      // Si la IA no está segura o no encuentra uno consistente entre los permitidos, 1
      // el backend debería devolver null y aquí no actualizamos nada.
      if (predictedId) {
        console.log(`[AI-Pred] ✅ Setting selectedRubroId to: "${predictedId}"`);
        setSelectedRubroId(predictedId);
      } else {
        console.log(`[AI-Pred] ⚠️ No prediction received, keeping current selection`);
        // Opcional: Si queremos borrar la selección previa si la IA ya no está segura
        // setSelectedRubroId(null); 
      }

      // Predecir siempre el rubro contrario, sin importar si ya seleccionó contacto o no.
      // Así ya lo tenemos guardado para cuando asigne el contacto y guarde el ticket.
      const oppType = type === 'income' ? 'expense' : 'income';
      const oppPredictedId = await aiApi.predictRubro(description, oppType);
      console.log(`[AI-Pred] Opposite predicted ID: "${oppPredictedId}" (type: ${oppType})`);
      if (oppPredictedId) {
        setToRubroId(oppPredictedId);
      }
    } catch (e) {
      console.error("[AI-Pred] Failed", e);
    } finally {
      setIsPredicting(false);
    }
  };

  const performCancellation = async (reason?: string) => {
    if (!ticketId) return;

    setIsSaving(true);
    try {
      await ticketsApi.cancelTicket(ticketId, reason);

      setStatus('cancelled');
      const updatedNote = reason?.trim()
        ? (privateNote ? `${privateNote}\nMOTIVO CANCELACIÓN: ${reason}` : `MOTIVO CANCELACIÓN: ${reason}`)
        : privateNote;

      if (reason?.trim()) {
        setPrivateNote(updatedNote);
      }

      await updateLocalTicket(ticketId, {
        status: 'cancelled',
        privateNote: updatedNote,
        synced: true
      });

      // Refresh logs
      try {
        const res = await ticketsApi.getTicketLogs(ticketId);
        setLogs(res);
      } catch (logErr) {
        console.warn("Failed to refresh logs after cancellation", logErr);
      }

      showToast('Ticket cancelado correctamente');
      navigation.goBack();

    } catch (e: any) {
      console.error("Error cancelling ticket", e);
      const errorMsg = e.response?.data?.message || 'No se pudo cancelar el ticket. Revisa tu conexión.';
      Alert.alert('Error', errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelTicket = () => {
    if (status === 'cancelled') return;
    setCancelReason('');
    setCancelModalVisible(true);
  };




  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!amount || !selectedWalletId) {
      Alert.alert('Datos faltantes', 'Por favor, ingresa el monto para continuar.');
      return;
    }

    setIsSaving(true);
    const parsedAmount = parseFloat(amount.replace(/[^0-9.-]+/g, ""));
    let lastCreatedTicketId: string | null = null;

    let finalAttachmentUrl = attachmentUri;
    // Si es una URI local, subirla primero
    if (attachmentUri && (attachmentUri.startsWith('file://') || attachmentUri.startsWith('content://') || attachmentUri.startsWith('blob:'))) {
      try {
        const uploadResult = await ticketsApi.uploadTicketFile(attachmentUri);
        finalAttachmentUrl = uploadResult.url;
      } catch (uploadErr) {
        console.warn("Failed to upload attachment", uploadErr);
        // Si falló y era un blob de la edición anterior, lo quitamos para que no rompa el save
        if (attachmentUri.startsWith('blob:')) {
          finalAttachmentUrl = null;
        }
      }

    }


    const finalShortId = shortId || generateShortId();
    if (!shortId) setShortId(finalShortId);

    // Estructura común del ticket
    const commonDto = {
      walletId: selectedWalletId,
      type,
      amount: parsedAmount,
      currency,
      description,
      dueDate: date,
      status,
      generatePeilink,
      helpToCollect,
      paymentMethod,
      paymentProcedure: paymentProcedure || undefined,
      privateNote: privateNote || undefined,
      expenses: type === 'income' ? parseFloat(expenses) || 0 : 0,
      expensesDetail: type === 'income' ? expensesDetail : undefined,
      reference: reference || undefined,
      attachmentUrl: finalAttachmentUrl || undefined,
      rubro: selectedRubroId?.toString() || undefined,
      source,
      sourceInfo: sourceInfo || undefined,
      comment: (isOwner || isParticipant) ? (comment || undefined) : undefined,
      ownerRating: ownerRating || undefined,
      participantRating: participantRating || undefined,
      shortId: finalShortId,
      toWalletId: toWalletId || undefined,
      toRubro: toRubroId || undefined,
    };



    try {
      if (ticketId) {
        // CASO EDICIÃ“N
        const recipient = assignedContacts[0];
        const updateDto = {
          ...commonDto,
          toUser: recipient && recipient.phone ? (recipient.phone.includes('-') && recipient.phone.length > 20 ? recipient.phone : normalizePhone(recipient.phone)) : undefined,
        };

        try {
          const updated = await ticketsApi.updateTicket(ticketId, updateDto);
          await updateLocalTicket(ticketId, {
            ...updateDto,
            dueDate: updateDto.dueDate.toISOString(),
            synced: true,
          });

          // Inyectar en Chat si hubo cambios en descripción o rubro
          try {
            const changedFields = [];
            if (description !== originalDescription) changedFields.push(`la descripción a "${description}"`);
            if (selectedRubroId !== originalRubroId) {
              const newRubroLabel = selectedRubro?.label || 'Sin Categoría';
              changedFields.push(`el rubro a ${newRubroLabel}`);
            }
            if (amount !== originalAmount) {
              changedFields.push(`el importe de $${Number(originalAmount).toLocaleString('es-AR')} a $${Number(amount).toLocaleString('es-AR')}`);
              // Si es el primer cambio, persistir el monto inicial
              if (initialAmount === null) {
                (updateDto as any).initialAmount = Number(originalAmount);
              }
            }

            if (changedFields.length > 0) {
              const userName = user?.displayName || user?.phoneNumber || 'Usuario';
              const todayStr = new Date().toLocaleDateString('es-AR');
              const auditMsg = `*** Ticket ACTUALIZADO - El ${todayStr}, ${userName} modificó: ${changedFields.join(', ')}`;
              await ticketsApi.addChatMessage(ticketId, auditMsg);
            }
          } catch (chatErr) {
            console.warn("Error injecting update message in chat", chatErr);
          }

          // Refresh logs after update
          const res = await ticketsApi.getTicketLogs(ticketId);
          setLogs(res);
        } catch (e) {
          console.warn("Error updating on server, update locally", e);
          await updateLocalTicket(ticketId, {
            ...updateDto,
            dueDate: updateDto.dueDate.toISOString(),
            synced: false,
          });
        }
      } else {
        // CASO NUEVO (Bulk)
        const recipients = assignedContacts.length > 0 ? assignedContacts : [null];
        for (const recipient of recipients) {
          const createDto = {
            ...commonDto,
            toUser: recipient && recipient.phone ? (recipient.phone.includes('-') && recipient.phone.length > 20 ? recipient.phone : normalizePhone(recipient.phone)) : undefined,
            shortId: recipients.length > 1 ? generateShortId() : commonDto.shortId,
          };

          try {
            const finalCreateDto = {
              ...createDto,
              status: createDto.status, // Let recordPayment handle 'completed' to avoid doubling
            };

            if (isRecurring) {
              const recurringDto = {
                ...finalCreateDto,
                totalInstallments: parseInt(recurrenceCount),
                frequency: recurrenceFrequency,
                participants: recipient ? [{ userId: recipient.phone, role: 'user_id' }] : [],
                // Campos explÃ­citos para garantizar que TypeORM los mapee correctamente
                paymentProcedure: paymentProcedure || undefined,
                paymentMethod: paymentMethod || undefined,
                privateNote: privateNote || undefined,
                comment: comment || undefined,
                helpToCollect,
              };
              await ticketsApi.createRecurringTicket(recurringDto);
              // For recurring tickets, we might not need to add it to local tickets immediately 
              // if the server will generate the first one at 10am or if we want it NOW.
              // The user said "chequee si es necesario volver a repetir... todos los dias a las 10am".
              // Usually the first installment is created IMMEDIATELY and the next ones are scheduled.
              // Let's create the FIRST one immediately too.
            }

            const serverTicket = await ticketsApi.createTicket(finalCreateDto);
            lastCreatedTicketId = serverTicket.ticketId;

            // Si ya se cobró/pagó, subir comprobante y registrar pago
            if (isAlreadyPaid) {
              try {
                let finalPayAttachment = createPayAttachment;
                if (createPayAttachment && (createPayAttachment.startsWith('file://') || createPayAttachment.startsWith('content://') || createPayAttachment.startsWith('blob:'))) {
                  const uploadResult = await ticketsApi.uploadTicketFile(createPayAttachment);
                  finalPayAttachment = uploadResult.url;
                }

                await ticketsApi.recordPayment(serverTicket.ticketId, {
                  amount: Number(amount),
                  paymentMethod: createPayMethod,
                  description: 'Saldado al inicio',
                  attachmentUrl: finalPayAttachment || undefined
                });

                const actionLabel = isIncome ? 'COBRADO' : 'PAGADO';
                const methodLabel = paymentMethods.find(m => m.id === createPayMethod)?.label || 'En mano';
                const msg = `*** PAGO REGISTRADO de $${Number(amount).toLocaleString('es-AR')}. Método: ${methodLabel}. Estado Ticket: CUMPLIDO (Saldado al inicio)`;

                await ticketsApi.addChatMessage(
                  serverTicket.ticketId,
                  msg,
                  user?.displayName || user?.phoneNumber,
                  finalPayAttachment || undefined,
                  finalPayAttachment ? (finalPayAttachment.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif)$/) ? 'image' : 'file') : undefined
                );
              } catch (payAtStartErr) {
                console.warn("Failed to register initial payment / upload attachment", payAtStartErr);
              }
            }

            // If it was recurring, we need to update the recurring record that we ALREADY generated the first one.
            // But since I set currentInstallment: 0 in createRecurring, and the first ticket is created NOW manually,
            // I should probably set currentInstallment: 1 and lastGeneratedDate: now.
            // Actually, my backend createRecurring starts with 0.

            await addLocalTicket({
              ...finalCreateDto as any,
              id: serverTicket.ticketId,
              ownerId: serverTicket.ownerId,
              dueDate: finalCreateDto.dueDate.toISOString(),
              synced: true,
              createdAt: serverTicket.createdAt,
              amountPaid: isAlreadyPaid ? Number(amount) : 0,
            });
          } catch (e) {
            await addLocalTicket({
              ...createDto as any,
              id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              ownerId: user?.id || 'offline_user',
              dueDate: createDto.dueDate.toISOString(),
              synced: false,
              createdAt: new Date().toISOString(),
            });
          }
        }
      }

      setIsSaving(false);
      const walletName = wallets.find(w => w.id === selectedWalletId)?.name || 'su billetera';
      const formattedAmount = Number(amount).toLocaleString('es-AR');
      const detail = description ? ` "${description}"` : '';
      const toastMsg = ticketId
        ? `Ticket actualizado: ${currency} $${formattedAmount}${detail} en ${walletName}`
        : `Ticket guardado: ${currency} $${formattedAmount}${detail} en ${walletName}`;

      // Mostrar Toast Global con opción de Ver
      const targetId = ticketId || lastCreatedTicketId;
      useUIStore.getState().showToast(toastMsg, 'success', targetId ? {
        label: 'Ver >',
        onPress: () => {
          (navigation as any).navigate('AddMovementModal', { ticketId: targetId });
        }
      } : undefined);

      // Regresar
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        (navigation as any).navigate('MainTabs');
      }
    } catch (err) {
      console.error("Critical error in handleSave", err);
      setIsSaving(false);
      Alert.alert('Error', 'No se pudo procesar la solicitud.');
    }
  };

  const handlePickContact = async () => {
    if (!selectedWalletId) {
      Alert.alert('Billetera Requerida', 'Por favor selecciona una billetera primero.');
      return;
    }

    const hasLists = selectedWallet?.distributionLists && selectedWallet.distributionLists.length > 0;

    if (hasLists) {
      setContactOptionsModalVisible(true);
    } else {
      openNativeContacts();
    }
  };

  const openNativeContacts = async () => {
    setContactOptionsModalVisible(false);
    setSelectedContactsTemp(assignedContacts);
    try {
      const data = await getContacts();
      if (data.length > 0) {
        const mapped: ContactInfo[] = data.map(c => ({
          name: c.name,
          phone: normalizePhone(c.phoneNumbers?.[0] || ''),
          imageUri: c.imageUri
        }));
        setContactsList(mapped);
        setContactModalVisible(true);
      } else {
        Alert.alert('Libreta Vacía', 'No tienes contactos con número de teléfono.');
      }
    } catch (e) {
      console.warn("Could not load native contacts: ", e);
      Alert.alert('Error', 'No se pudo abrir la libreta de contactos.');
    }
  };

  const toggleContactSelection = (contact: ContactInfo) => {
    const isSelected = selectedContactsTemp.some(c => cleanPhone(c.phone) === cleanPhone(contact.phone));
    if (isSelected) {
      setSelectedContactsTemp(selectedContactsTemp.filter(c => cleanPhone(c.phone) !== cleanPhone(contact.phone)));
    } else {
      setSelectedContactsTemp([...selectedContactsTemp, contact]);
    }
  };

  const confirmContactsSelection = () => {
    setAssignedContacts(selectedContactsTemp);
    setAssignedListName(null);
    setSelectedListId(null);
    setContactModalVisible(false);
  };

  const handleRemoveContact = (phone: string) => {
    setAssignedContacts(prev => prev.filter(c => c.phone !== phone));
  };


  const handleClearSelection = () => {
    setAssignedContacts([]);
    setAssignedListName(null);
    setSelectedListId(null);
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a tu galería.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setAttachmentUri(result.assets[0].uri);
      showToast('Imagen adjunta con éxito (Imagen)');
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a tu cámara.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setAttachmentUri(result.assets[0].uri);
      showToast('Foto capturada con éxito (Cámara)');
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        setAttachmentUri(result.assets[0].uri);
        showToast('Documento adjunto con éxito (Archivo)');
      }
    } catch (err) {
      console.warn('Error picking document:', err);
      Alert.alert('Error', 'No se pudo seleccionar el archivo.');
    }
  };

  const removeAttachment = () => {
    setAttachmentUri(null);
  };

  const handleShareAttachment = async (uri: string) => {
    if (!uri) return;

    try {
      const normalizedUri = normalizeUrl(uri);
      if (!normalizedUri) return;

      let localUri = normalizedUri;

      // Si es una URL remota, descargarla primero
      if (normalizedUri.startsWith('http')) {
        const filename = normalizedUri.split('/').pop()?.split('?')[0] || 'attachment';
        const extension = filename.includes('.') ? '' : '.jpg';
        const fileUri = `${FileSystem.cacheDirectory}${filename}${extension}`;

        const downloadRes = await FileSystem.downloadAsync(normalizedUri, fileUri);
        localUri = downloadRes.uri;
      }

      // Asegurar esquema file:// para archivos locales si no lo tiene
      if (!localUri.includes('://')) {
        localUri = 'file://' + localUri;
      }

      console.log("[AddMovementScreen] Sharing localUri:", localUri);

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Error', 'El uso compartido no está disponible en este dispositivo');
        return;
      }

      await Sharing.shareAsync(localUri);
    } catch (error) {
      console.error('Error sharing attachment:', error);
      Alert.alert('Error', 'No se pudo compartir el archivo');
    }
  };

  const handleViewAttachment = async (uri: string) => {
    if (!uri) {
      Alert.alert('Error', 'No hay URI de adjunto');
      return;
    }

    try {
      const normalizedUri = normalizeUrl(uri);
      if (!normalizedUri) return;

      if (Platform.OS === 'web') {
        Linking.openURL(normalizedUri).catch(() => Alert.alert('Error', 'No se pudo abrir el archivo en el navegador'));
        return;
      }

      let localUri = normalizedUri;
      if (normalizedUri.startsWith('http')) {
        const filename = normalizedUri.split('/').pop()?.split('?')[0] || 'attachment';
        const extension = filename.includes('.') ? '' : '.jpg';
        const fileUri = `${FileSystem.cacheDirectory}${filename}${extension}`;

        const downloadRes = await FileSystem.downloadAsync(normalizedUri, fileUri);
        localUri = downloadRes.uri;
      }

      // Asegurar esquema file:// para archivos locales si no lo tiene
      if (!localUri.includes('://')) {
        localUri = 'file://' + localUri;
      }

      console.log("[AddMovementScreen] Viewing localUri:", localUri);

      await Sharing.shareAsync(localUri, {
        dialogTitle: 'Ver adjunto',
        UTI: localUri.endsWith('.pdf') ? 'com.adobe.pdf' : 'public.image'
      });

    } catch (error) {
      console.error('Error viewing attachment:', error);
      Alert.alert('Error', 'No se pudo abrir el archivo: ' + (error as any).message);
    }
  };

  const filteredContacts = contactsList.filter(c => {
    const searchLower = contactSearchText.toLowerCase();
    const searchDigits = contactSearchText.replace(/\D/g, '');

    const nameMatch = c.name.toLowerCase().includes(searchLower);
    const phoneMatch = searchDigits.length > 0 && c.phone.replace(/\D/g, '').includes(searchDigits);

    return nameMatch || phoneMatch;
  });

  const applyDateChange = async (newDate: Date) => {
    if (!ticketId) {
      setDate(newDate);
      return;
    }

    setIsSaving(true);
    try {
      const updated = await ticketsApi.updateTicketDueDate(ticketId, newDate);
      setDate(newDate);
      await updateLocalTicket(ticketId, {
        dueDate: updated.dueDate.toString(),
        initialDueDate: updated.initialDueDate?.toString()
      });

      // Inyectar en Chat
      try {
        const userName = user?.displayName || user?.phoneNumber || 'Usuario';
        const todayStr = new Date().toLocaleDateString('es-AR');
        const oldDateStr = date.toLocaleDateString('es-AR');
        const newDateStr = newDate.toLocaleDateString('es-AR');

        await ticketsApi.addChatMessage(
          ticketId,
          `*** Ticket ACTUALIZADO - El ${todayStr}, ${userName} cambió el vencimiento del ${oldDateStr} al ${newDateStr}`
        );
      } catch (chatErr) {
        console.warn("Failed to inject date change in chat", chatErr);
      }

      // Refresh logs
      const res = await ticketsApi.getTicketLogs(ticketId);
      setLogs(res);

      showToast('Fecha de pago actualizada');
    } catch (err) {
      console.error("Error updating due date", err);
      Alert.alert('Error', 'No se pudo actualizar la fecha de pago.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!ticketId || !payAmount) return;
    setIsSavingPayment(true);
    const parsedAmount = parseFloat(payAmount);

    try {
      let finalPayAttachment = payAttachment;
      if (payAttachment && (payAttachment.startsWith('file://') || payAttachment.startsWith('content://') || payAttachment.startsWith('blob:'))) {
        const uploadResult = await ticketsApi.uploadTicketFile(payAttachment);
        finalPayAttachment = uploadResult.url;
        setPayAttachment(finalPayAttachment);
      }

      const updated = await ticketsApi.recordPayment(ticketId, {
        amount: parsedAmount,
        paymentMethod: payMethod,
        description: payDescription,
        attachmentUrl: finalPayAttachment || undefined
      });

      // Actualizar localmente
      const newPaid = Number(updated.amountPaid) || 0;
      setAmountPaid(newPaid);
      setStatus(updated.status);

      await updateLocalTicket(ticketId, {
        amountPaid: newPaid,
        status: updated.status,
        synced: true
      });

      // Inyectar en Chat
      try {
        const methodLabel = paymentMethods.find(m => m.id === payMethod)?.label || 'En mano';
        const msg = `*** PAGO REGISTRADO de $${parsedAmount.toLocaleString('es-AR')}. Método: ${methodLabel}. Estado Ticket: ${updated.status === 'completed' ? 'CUMPLIDO' : 'PENDIENTE'}`;
        await ticketsApi.addChatMessage(
          ticketId,
          msg,
          user?.displayName || user?.phoneNumber,
          finalPayAttachment || undefined,
          finalPayAttachment ? (finalPayAttachment.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif)$/) ? 'image' : 'file') : undefined
        );
      } catch (chatErr) {
        console.warn("Failed to inject payment message in chat", chatErr);
      }

      // Refrescar logs combinados (logs + chat audit)
      try {
        const [logsRes, chatRes] = await Promise.all([
          ticketsApi.getTicketLogs(ticketId),
          ticketsApi.getChatMessages(ticketId)
        ]);

        const auditLogs = chatRes
          .filter(m => m.message && m.message.trim().startsWith('***'))
          .map(m => ({
            logId: `audit_${m.id || Math.random()}`,
            action: 'audit_message',
            newValue: m.message,
            createdAt: m.createdAt,
            user: { displayName: m.senderName || m.userId },
            attachmentUrl: m.attachmentUrl,
            attachmentType: m.attachmentType
          }));

        const combined = [...logsRes, ...auditLogs].sort((a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        setLogs(combined);
      } catch (logErr) {
        console.warn("Error refreshing combined logs", logErr);
      }

      setIsPaymentModalVisible(false);
      setPayAmount('');
      setPayDescription('');
      setPayAttachment(null);
      showToast('Pago registrado con éxito');

      // Regresar a la pantalla anterior tras registrar el pago
      if (navigation.canGoBack()) {
        navigation.goBack();
      }

    } catch (err) {
      console.error("Error recording payment", err);
      Alert.alert('Error', 'No se pudo registrar el pago');
    } finally {
      setIsSavingPayment(false);
    }
  };

  const handleScanQR = (data: string) => {
    setScannerVisible(false);
    console.log("[QR-SCAN] Scanned data:", data);

    try {
      const parsed = JSON.parse(data);
      if (parsed.amount !== undefined || parsed.detail || parsed.payment_method || parsed.user_id || parsed.rubro) {

        // Verificar moneda si hay una billetera destino o seleccionada
        const myWallet = wallets.find(w => w.id === selectedWalletId);

        if (parsed.currency && myWallet && parsed.currency !== myWallet.currency) {
          Alert.alert(
            "Moneda Distinta",
            `No es posible cargar la información porque la moneda del QR (${parsed.currency}) es distinta a la de mi billetera seleccionada (${myWallet.currency}).`
          );
          return;
        }

        const alertMsg = [
          parsed.detail ? `ðŸ“ Detalle: ${parsed.detail}` : null,
          (parsed.amount !== undefined || parsed.rubro) ?
            `ðŸ’° ${parsed.currency || ''} $${Number(parsed.amount || 0).toLocaleString('es-AR')}${parsed.rubro ? ` (${getRubroLabel(parsed.rubro, 'income')})` : ''}` : null,
          parsed.payment_method ? `ðŸ’³ Pago: ${parsed.payment_method}` : null,
          (parsed.user_name || parsed.user_phone) ? `ðŸ‘¤ Contacto: ${parsed.user_name || ''} ${parsed.user_phone ? `(${parsed.user_phone})` : ''}` : null,
        ].filter(Boolean).join('\n\n');

        Alert.alert(
          "Ticket Detectado",
          alertMsg,
          [
            {
              text: "Aplicar Datos",
              onPress: () => {
                if (parsed.wallet_id) {
                  if (wallets.some(w => w.id === parsed.wallet_id)) {
                    setSelectedWalletId(parsed.wallet_id);
                  } else {
                    setToWalletId(parsed.wallet_id);
                  }
                }
                if (parsed.amount !== undefined) {
                  setAmount(parsed.amount.toString());
                }
                if (parsed.detail) setDescription(parsed.detail);
                if (parsed.payment_method) setPaymentProcedure(parsed.payment_method);
                if (parsed.rubro) {
                  setToRubroId(parsed.rubro);
                }
                if (parsed.user_phone || parsed.user_id) {
                  const phone = parsed.user_phone || parsed.user_id;
                  const name = parsed.user_name || phone;
                  setAssignedContacts([{ name, phone }]);
                }
                if (parsed.currency) setCurrency(parsed.currency);
                showToast('Datos del QR aplicados al destino');
              }
            },
            { text: "Cancelar", style: "cancel" }
          ]
        );
      } else {
        Alert.alert("Código QR Escaneado", `Datos: ${data}`);
      }
    } catch (e) {
      Alert.alert("Código QR Escaneado", `Datos: ${data}`);
    }
  };



  const handleUpdateRating = async (newRating: number) => {
    if (!ticketId) return;

    try {
      const updateData: any = {};
      if (isOwner) {
        setOwnerRating(newRating);
        updateData.ownerRating = newRating;
      } else {
        setParticipantRating(newRating);
        updateData.participantRating = newRating;
      }

      await ticketsApi.updateTicket(ticketId, updateData);
    } catch (error) {
      console.warn("[AddMovementScreen] Error updating rating:", error);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const normalized = new Date(selectedDate);
      normalized.setHours(12, 0, 0, 0);
      applyDateChange(normalized);
    }
  };

  const handleCustomDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      if (event.type === 'set' && selectedDate) {
        const normalized = new Date(selectedDate);
        normalized.setHours(12, 0, 0, 0);
        setDate(normalized);
      }
      // On Android, if it's a popup (not inline), we might need to handle closing here
      // But we are using inline or a button 'Listo'
    } else {
      if (selectedDate) {
        const normalized = new Date(selectedDate);
        normalized.setHours(12, 0, 0, 0);
        setDate(normalized);
      }
    }
  };

  // El estado isCustomDateActive ya está definido arriba

  const handleSelectQuickDate = (optionId: string) => {
    if (optionId === 'custom') {
      if (Platform.OS === 'android') {
        setShowDatePicker(true);
        // No cerramos el modal de opciones de fecha para que el picker se superponga
        // Pero en Android el picker es un diálogo nativo separado.
      } else {
        setIsCustomDateActive(true);
      }
      return;
    }

    let newDate = new Date();
    // Forzamos mediodía para evitar errores de zona horaria
    newDate.setHours(12, 0, 0, 0);

    switch (optionId) {
      case 'today':
        // Ya es hoy
        break;
      case 'tomorrow':
        newDate.setDate(newDate.getDate() + 1);
        break;
      case '1week':
        newDate.setDate(newDate.getDate() + 7);
        break;
      case '15days':
        newDate.setDate(newDate.getDate() + 15);
        break;
      case '1month':
        newDate.setMonth(newDate.getMonth() + 1);
        break;
    }

    applyDateChange(newDate);
    setDateOptionsModalVisible(false);
  };


  const getAvailableRubros = () => {
    if (!selectedWallet) return [];

    let enabledIds: string[] = [];
    if (selectedWallet.enabledCategories && selectedWallet.enabledCategories.length > 0) {
      enabledIds = selectedWallet.enabledCategories
        .filter(c => c.type === type)
        .map(c => c.categoryKey);
    } else {
      const walletType = selectedWallet.type || 'otro';
      const mapping = WALLET_RUBROS_MAP[walletType] || { gastos: [], ingresos: [] };
      enabledIds = type === 'income' ? mapping.ingresos : mapping.gastos;
    }

    return getPartitionedRubros(type, enabledIds);
  };

  const selectedRubro = (type === 'income' ? GENERAL_RUBROS_INGRESOS : GENERAL_RUBROS_GASTOS).find(r => r.id === selectedRubroId);

  const isIncome = type === 'income';
  const mainColor = isIncome ? '#16A34A' : '#DC2626';
  const bgColor = isIncome ? '#F0FDF4' : '#FEF2F2';
  const borderColor = isIncome ? '#bbf7d0' : '#fecaca';

  const isEdit = !!ticketId;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={{ flex: 1, maxWidth: 600, width: '100%', alignSelf: 'center' }}>

        {/* QUICK ACTIONS TOP */}
        <View style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingTop: 8 }}>
          <View style={{ alignItems: 'center' }}>
            {!!ticketId ? (
              <View style={{ backgroundColor: type === 'income' ? '#3a9e7620' : '#c0505020', borderRadius: 100, paddingHorizontal: 20, paddingVertical: 8 }}>
                <Text style={{ color: type === 'income' ? '#3a9e76' : '#c05050', fontSize: 15, fontFamily: FontFamily.bold }}>
                  {type === 'income' ? 'Cobro' : 'Pago'}
                </Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', backgroundColor: '#f2f2f0', borderRadius: 100, padding: 4 }}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, backgroundColor: type === 'expense' ? '#c05050' : 'transparent' }}
                  onPress={() => setType('expense')}
                >
                  <Ionicons name="remove-circle" size={16} color={type === 'expense' ? '#fff' : '#878778'} />
                  <Text style={{ marginLeft: 4, color: type === 'expense' ? '#fff' : '#878778', fontSize: 13, fontFamily: FontFamily.regular }}>Pago</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, backgroundColor: type === 'income' ? '#3a9e76' : 'transparent' }}
                  onPress={() => setType('income')}
                >
                  <Ionicons name="add-circle" size={16} color={type === 'income' ? '#fff' : '#878778'} />
                  <Text style={{ marginLeft: 4, color: type === 'income' ? '#fff' : '#878778', fontSize: 13, fontFamily: FontFamily.regular }}>Cobro</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={{ fontSize: 12, color: '#878778', marginTop: 6, fontFamily: FontFamily.medium }}>
              {currencyName}
            </Text>
          </View>

          <View style={{ position: 'absolute', left: 16, top: 0 }}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <View style={{ backgroundColor: '#f2f2f0', borderRadius: 100, padding: 8 }}>
                <Ionicons name="chevron-back" size={20} color="#363630" />
              </View>
            </TouchableOpacity>
          </View>

          <View style={{ position: 'absolute', right: 16, top: 0, flexDirection: 'row', gap: 8 }}>
            {!!ticketId && (
              <TouchableOpacity onPress={handleShare}>
                <View style={{ backgroundColor: '#f2f2f0', borderRadius: 100, padding: 8 }}>
                  <Ionicons name="share-social" size={20} color="#363630" />
                </View>
              </TouchableOpacity>
            )}
            {!ticketId && (
              <TouchableOpacity onPress={() => setScannerVisible(true)}>
                <View style={{ backgroundColor: '#f2f2f0', borderRadius: 100, padding: 8 }}>
                  <Ionicons name="qr-code-outline" size={20} color="#363630" />
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">

            {/* CONTENT BASED ON ACTIVE TAB */}
            {activeTab === 'info' && (
              <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 16 }}>
                {status === 'cancelled' && (
                  <View style={{ backgroundColor: '#FEF2F2', borderColor: '#FEE2E2', borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 24, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Ionicons name="alert-circle" size={24} color="#DC2626" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, color: '#991B1B', fontFamily: FontFamily.bold }}>Ticket Anulado</Text>
                      <Text style={{ fontSize: 13, color: '#991B1B', marginTop: 2 }}>
                        Este ticket ha sido cancelado y no admite modificaciones ni registros de pagos.
                      </Text>
                    </View>
                  </View>
                )}
                {/* BIG AMOUNT */}
                <View style={styles.amountInputContainer}>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0"
                    keyboardType="numeric"
                    placeholderTextColor="#737373"
                    value={formatAmount(amount)}
                    onChangeText={(t) => {
                      let clean = t.replace(/[^0-9,]/g, '').replace(',', '.');
                      setAmount(clean);
                    }}
                    autoFocus={!ticketId}
                    editable={canEditAsOwner && (!ticketId || status === 'pending')}
                    maxLength={15}
                  />
                </View>


                {ticketId && amountPaid > 0 && status === 'pending' && (
                  <View style={{
                    marginTop: 8,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    backgroundColor: type === 'income' ? '#f0fdf4' : '#fef2f2',
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: type === 'income' ? '#dcfce7' : '#fee2e2',
                    marginBottom: 16
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: type === 'income' ? '#dcfce7' : '#fee2e2',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Ionicons
                          name={type === 'income' ? "arrow-up" : "arrow-down"}
                          size={16}
                          color={type === 'income' ? '#16a34a' : '#dc2626'}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{
                          fontSize: 14,
                          color: type === 'income' ? '#16a34a' : '#dc2626',
                          fontFamily: FontFamily.semibold
                        }}>
                          Saldo pendiente
                        </Text>
                        <Text style={{
                          fontSize: 13,
                          color: '#878778',
                          marginTop: 2
                        }}>
                          Ya hay {type === 'income' ? 'cobros' : 'pagos'} por $ {amountPaid.toLocaleString('es-AR')}.
                          Resta {type === 'income' ? 'cobrar' : 'pagar'} <Text style={{ fontFamily: FontFamily.bold, color: type === 'income' ? '#16a34a' : '#dc2626' }}>$ {(Math.max(0, Number(amount) - amountPaid)).toLocaleString('es-AR')}</Text>
                        </Text>
                      </View>
                    </View>
                  </View>
                )}




                <TextInput
                  style={{ width: '100%', fontSize: 15, fontFamily: FontFamily.regular, color: '#878778', textAlign: 'center', marginTop: 8 }}
                  placeholder="Agregar un detalle"
                  placeholderTextColor="#878778"
                  value={description}
                  onChangeText={setDescription}
                  onBlur={() => triggerRubroPrediction()}
                  editable={status !== 'cancelled' && status !== 'completed'}
                />

                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 32 }}>
                  <TouchableOpacity
                    style={{ borderStyle: 'solid', borderWidth: 1, borderColor: '#e7e7e4', borderRadius: 100, paddingHorizontal: 16, paddingVertical: 8 }}
                    onPress={() => setDateOptionsModalVisible(true)}
                    disabled={!canEditAsOwner || status === 'cancelled' || status === 'completed'}
                  >
                    <Text style={{ fontSize: 15, color: '#878778' }}>
                      Vence el {date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                  </TouchableOpacity>
                </View>

                {isEdit && (
                  (amount !== originalAmount && originalAmount !== null) ||
                  (initialAmount !== null && Number(amount) !== initialAmount)
                ) && (
                    <View style={{ marginTop: 12, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#F0F9FF', borderRadius: 16, borderWidth: 1, borderColor: '#BAE6FD', alignSelf: 'center', width: '90%' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#BAE6FD', alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name="information-circle" size={16} color="#0369A1" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12, color: '#0369A1', fontFamily: FontFamily.medium }}>
                            {amount !== originalAmount
                              ? `Estás cambiando el importe (antes $${Number(originalAmount).toLocaleString('es-AR')}).`
                              : `Este ticket fue modificado anteriormente (inicialmente $${Number(initialAmount).toLocaleString('es-AR')}).`}
                          </Text>
                          <Text style={{ fontSize: 11, color: '#0369A1', opacity: 0.8, marginTop: 2 }}>
                            Al guardar se registrará en el historial de auditoría.
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}

                {isEdit && initialDueDate && (
                  new Date(date).toISOString().split('T')[0] !== new Date(initialDueDate).toISOString().split('T')[0]
                ) && (() => {
                  const d1 = new Date(date);
                  const d2 = new Date(initialDueDate);
                  d1.setHours(12, 0, 0, 0);
                  d2.setHours(12, 0, 0, 0);
                  const diffTime = d1.getTime() - d2.getTime();
                  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                  const diffText = diffDays > 0 ? `retrasó ${diffDays} días` : `adelantó ${Math.abs(diffDays)} días`;

                  return (
                    <View style={{
                      marginTop: 8,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      backgroundColor: Colors.background,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: '#fef3c7',
                      marginBottom: 16
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: '#fef3c7',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Ionicons name="calendar" size={16} color="#b45309" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{
                            fontSize: 14,
                            color: '#b45309',
                            fontFamily: FontFamily.semibold
                          }}>
                            Vencimiento inicial modificado
                          </Text>
                          <Text style={{
                            fontSize: 13,
                            color: '#878778',
                            marginTop: 2
                          }}>
                            Era el {new Date(initialDueDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}.
                            Se <Text style={{ fontFamily: FontFamily.bold }}>{diffText}</Text>.
                          </Text>
                          {originalDate && new Date(date).toISOString().split('T')[0] !== new Date(originalDate).toISOString().split('T')[0] && (
                            <Text style={{ fontSize: 11, color: '#b45309', opacity: 0.8, marginTop: 4 }}>
                              * Tienes cambios sin guardar en la fecha actual.
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })()}

                {/* Opposite User Info (if editing) */}
                {(() => {
                  if (!isEdit) return null;
                  let oppName = '';
                  let oppAvatar: string | null = null;
                  let oppPhone = '';

                  if (isOwner) {
                    if (assignedContacts.length === 1) {
                      oppName = getSmartDisplayName(assignedContacts[0].phone, assignedContacts[0].name);
                      oppPhone = assignedContacts[0].phone;
                      oppAvatar = getSmartAvatarUrl(oppPhone, assignedContactAvatar);
                    } else if (assignedContacts.length > 1) {
                      oppName = assignedListName ? `${assignedListName} (${assignedContacts.length})` : `${assignedContacts.length} destinatarios`;
                    } else {
                      return null;
                    }
                  } else {
                    const ownerPhone = ownerInfo?.phone || ticketOwnerId || '';
                    oppName = getSmartDisplayName(ownerPhone, ownerInfo?.displayName || 'Propietario');
                    oppAvatar = getSmartAvatarUrl(ownerPhone, ownerInfo?.avatarUrl);
                  }

                  return (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, marginBottom: 8 }}>
                      {oppAvatar ? (
                        <Image source={{ uri: normalizeUrl(oppAvatar) }} style={{ width: 28, height: 28, borderRadius: 14, marginRight: 8 }} />
                      ) : (
                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                          <Text style={{ color: Colors.white, fontSize: 12, fontFamily: FontFamily.bold }}>
                            {oppName.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <Text style={{ fontSize: 14, color: '#363630', fontFamily: FontFamily.medium }}>
                        {isOwner ? 'Con ' : 'De '}{oppName}
                      </Text>
                    </View>
                  );
                })()}



                {/* Billetera / Categoría pills */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: 42, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f2f2f0' }}>
                  <TouchableOpacity
                    style={{ flex: 1, alignItems: 'flex-start' }}
                    onPress={() => setWalletModalVisible(true)}
                    disabled={status === 'cancelled'}
                  >
                    <Text style={{ fontSize: 13, color: '#878778' }}>Billetera</Text>
                    <Text style={{ fontSize: 17, fontFamily: FontFamily.semibold, color: '#363630', marginTop: 4 }} numberOfLines={1}>
                      {selectedWallet ? selectedWallet.name : 'Seleccionar'}
                    </Text>
                  </TouchableOpacity>
                  <View style={{ width: 1, height: 40, backgroundColor: '#f2f2f0', marginHorizontal: 16 }} />
                  <TouchableOpacity
                    style={{ flex: 1, alignItems: 'flex-end' }}
                    onPress={() => setRubroModalVisible(true)}
                    disabled={status === 'cancelled'}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 13, color: '#878778' }}>{type === 'income' ? 'Origen' : 'Categoría'}</Text>
                      {isPredicting && (
                        <Animated.View style={{ opacity: aiPulseAnim }}>
                          <Ionicons name="sparkles" size={14} color="#7c3aed" />
                        </Animated.View>
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      {selectedRubro && <Ionicons name={selectedRubro.icon as any} size={16} color="#363630" />}
                      <Text style={{ fontSize: 17, fontFamily: FontFamily.semibold, color: '#363630' }} numberOfLines={1}>
                        {selectedRubro ? selectedRubro.label : 'Seleccionar'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Action Buttons for Edit Mode */}
                {!!ticketId && status === 'pending' && (
                  <View style={{ width: '100%', marginTop: 24, gap: 12 }}>
                    <TouchableOpacity
                      style={{ backgroundColor: '#fff', borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#eceae3' }}
                      onPress={() => {
                        setPayAmount((Number(amount) - Number(amountPaid)).toString());
                        setIsPaymentModalVisible(true);
                      }}
                    >
                      <Text style={{ color: '#363630', fontSize: 15, fontFamily: FontFamily.semibold }}>
                        {type === 'income' ? 'Registrar cobro' : 'Registrar pago'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ backgroundColor: '#fff', borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#eceae3' }}
                      onPress={() => setDateOptionsModalVisible(true)}
                    >
                      <Text style={{ color: '#363630', fontSize: 15, fontFamily: FontFamily.semibold }}>Cambiar fecha de pago</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{
                        backgroundColor: '#fae6e6ff',
                        borderColor: '#FEE2E2',
                        borderWidth: 1,
                        borderRadius: 12,
                        paddingVertical: 14,
                        alignItems: 'center',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        gap: 8
                      }}
                      onPress={handleCancelTicket}
                    >
                      <Ionicons name="trash-outline" size={18} color="#9f9f93" />
                      <Text style={{ color: '#c05050', fontSize: 15, fontFamily: FontFamily.bold }}>Cancelar ticket</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Other details in info tab */}
                <View style={{ width: '100%', marginTop: 16 }}>
                  {(!ticketId) && (
                    <View style={{ borderBottomWidth: 1, borderBottomColor: '#f2f2f0' }}>
                      <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 }}
                        onPress={handlePickContact}
                        disabled={!canEditAsOwner}
                      >
                        <Text style={{ fontSize: 15, color: '#363630', fontFamily: FontFamily.medium, marginBottom: 2 }}>Destinatario</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={{ fontSize: 15, color: '#878778' }}>
                            {assignedContacts.length > 0 ? (
                              assignedContacts.length === 1
                                ? assignedContacts[0].name
                                : (assignedListName ? `${assignedListName} (${assignedContacts.length})` : `${assignedContacts.length} destinatarios`)
                            ) : 'Elegir'}
                          </Text>
                          <Ionicons name="chevron-forward" size={16} color="#b7b7ae" />
                        </View>
                      </TouchableOpacity>

                      {(assignedContacts.length > 0) && (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12 }}>
                          {assignedContacts.length >= 1 ? (
                            <TouchableOpacity onPress={openNativeContacts}>
                              <Text style={{ fontSize: 13, color: '#3a9e76', fontFamily: FontFamily.semibold }}>Ver / Editar lista ({assignedContacts.length})</Text>
                            </TouchableOpacity>
                          ) : <View />}

                          <TouchableOpacity onPress={handleClearSelection}>
                            <Text style={{ fontSize: 12, color: '#c05050', fontFamily: FontFamily.medium }}>Limpiar selección</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}

                  {!ticketId && (
                    <View style={{ borderBottomWidth: 1, borderBottomColor: '#f2f2f0' }}>

                      {/* ALREADY PAID SWITCH */}
                      <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f2f2f0' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 15, color: '#363630', fontFamily: FontFamily.semibold }}>¿Ya se {type === 'income' ? 'cobró' : 'pagó'}?</Text>
                            <Text style={{ fontSize: 12, color: '#878778' }}>Marca esto si la transacción ya se completó</Text>
                          </View>
                          <Switch
                            value={isAlreadyPaid}
                            onValueChange={setIsAlreadyPaid}
                            trackColor={{ false: '#f2f2f0', true: '#363630' }}
                            thumbColor="#fff"
                          />
                        </View>

                        {isAlreadyPaid && (
                          <View style={{ marginTop: 12, gap: 12 }}>
                            <View>
                              <Text style={{ fontSize: 13, color: '#878778', marginBottom: 6 }}>Medio de {type === 'income' ? 'Cobro' : 'Pago'}</Text>
                              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                {paymentMethods.map(m => (
                                  <TouchableOpacity
                                    key={m.id}
                                    onPress={() => setCreatePayMethod(m.id)}
                                    style={{
                                      backgroundColor: createPayMethod === m.id ? '#363630' : '#f2f2f0',
                                      paddingHorizontal: 10,
                                      paddingVertical: 6,
                                      borderRadius: 100,
                                      borderWidth: 1,
                                      borderColor: createPayMethod === m.id ? '#363630' : '#e7e7e4'
                                    }}
                                  >
                                    <Text style={{ fontSize: 12, color: createPayMethod === m.id ? '#fff' : '#363630', fontFamily: FontFamily.medium }}>{m.label}</Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                            </View>

                            <View>
                              <Text style={{ fontSize: 13, color: '#878778', marginBottom: 6 }}>Comprobante (Opcional)</Text>
                              {createPayAttachment ? (
                                <View style={{ backgroundColor: '#f9f9f8', borderRadius: 12, padding: 8, borderWidth: 1, borderColor: '#f2f2f0', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                  <TouchableOpacity
                                    onPress={() => handleViewAttachment(createPayAttachment!)}
                                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                                  >
                                    <View style={{ width: 36, height: 36, backgroundColor: '#fff', borderRadius: 6, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#f2f2f0' }}>
                                      {(createPayAttachment.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif)$/) || createPayAttachment.startsWith('data:image') || createPayAttachment.startsWith('file:') || createPayAttachment.startsWith('blob:')) ? (
                                        <Image source={{ uri: createPayAttachment }} style={{ width: '100%', height: '100%' }} />
                                      ) : (
                                        <Ionicons name="document-text-outline" size={20} color="#878778" />
                                      )}
                                    </View>
                                    <Text style={{ fontSize: 13, color: '#3a9e76', fontFamily: FontFamily.semibold }}>Ver comprobante</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity onPress={() => setCreatePayAttachment(null)}>
                                    <Ionicons name="trash-outline" size={18} color="#9f9f93" />
                                  </TouchableOpacity>
                                </View>
                              ) : (
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                  <TouchableOpacity
                                    style={{ flex: 1, backgroundColor: '#f2f2f0', borderRadius: 10, paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                                    onPress={async () => {
                                      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 });
                                      if (!res.canceled) setCreatePayAttachment(res.assets[0].uri);
                                    }}
                                  >
                                    <Ionicons name="image-outline" size={16} color="#363630" />
                                    <Text style={{ fontSize: 13, color: '#363630', fontFamily: FontFamily.medium }}>Galería</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={{ flex: 1, backgroundColor: '#f2f2f0', borderRadius: 10, paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                                    onPress={async () => {
                                      const res = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
                                      if (!res.canceled) setCreatePayAttachment(res.assets[0].uri);
                                    }}
                                  >
                                    <Ionicons name="camera-outline" size={16} color="#363630" />
                                    <Text style={{ fontSize: 13, color: '#363630', fontFamily: FontFamily.medium }}>Cámara</Text>
                                  </TouchableOpacity>
                                </View>
                              )}
                            </View>
                          </View>
                        )}
                      </View>

                      {/* RECURRENCE SECTION */}
                      <View style={{ width: '100%', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f2f2f0' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 15, color: '#363630', fontFamily: FontFamily.medium }}>Repetir ticket o Pago en cuotas</Text>
                            <Text style={{ fontSize: 12, color: '#878778' }}>Repetir este ticket periódicamente o ingresar un pago en cuotas.</Text>
                          </View>
                          <Switch
                            value={isRecurring}
                            onValueChange={setIsRecurring}
                            trackColor={{ true: '#363630' }}
                            thumbColor="#fff"
                          />
                        </View>

                        {isRecurring && (
                          <View style={{ marginTop: 12, gap: 12 }}>
                            <View style={{ flexDirection: 'row', gap: 12 }}>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 13, color: '#878778', marginBottom: 6 }}>Cantidad de veces</Text>
                                <TextInput
                                  style={{ backgroundColor: '#f2f2f0', borderRadius: 12, padding: 12, fontSize: 14, color: '#363630' }}
                                  keyboardType="numeric"
                                  value={recurrenceCount}
                                  onChangeText={setRecurrenceCount}
                                />
                              </View>
                              <View style={{ flex: 2 }}>
                                <Text style={{ fontSize: 13, color: '#878778', marginBottom: 6 }}>Frecuencia</Text>
                                <TouchableOpacity
                                  style={{ backgroundColor: '#f2f2f0', borderRadius: 12, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                                  onPress={() => setIsRecurrenceModalVisible(true)}
                                >
                                  <Text style={{ fontSize: 14, color: '#363630' }}>
                                    {recurrenceFrequency === 'weekly' ? '1 vez por semana' :
                                      recurrenceFrequency === 'biweekly' ? '1 vez cada 15 días' :
                                        recurrenceFrequency === 'monthly' ? '1 vez por mes' :
                                          recurrenceFrequency === 'bimonthly' ? '1 vez cada 2 meses' :
                                            recurrenceFrequency === 'semi-annually' ? '1 vez cada 6 meses' :
                                              recurrenceFrequency === 'yearly' ? '1 vez por año' : 'Seleccionar'}
                                  </Text>
                                  <Ionicons name="chevron-down" size={16} color="#878778" />
                                </TouchableOpacity>
                              </View>
                            </View>

                            <TouchableOpacity
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                backgroundColor: '#f2f2f0',
                                paddingVertical: 14,
                                paddingHorizontal: 16,
                                borderRadius: 12,
                                marginTop: 8,
                                width: '100%'
                              }}
                              onPress={handleProrateAmount}
                            >
                              <Ionicons name="calculator-outline" size={18} color="#363630" />
                              <Text style={{ fontSize: 14, color: '#363630', fontFamily: FontFamily.semibold }}>Dividime el importe en cuotas</Text>
                            </TouchableOpacity>

                            {/* RECURRENCE SUMMARY BOX */}
                            <View style={{
                              backgroundColor: '#f8fafc',
                              borderRadius: 16,
                              padding: 16,
                              borderWidth: 1,
                              borderColor: '#e2e8f0',
                              marginTop: 12
                            }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' }}>
                                  <Ionicons name="repeat" size={18} color="#475569" />
                                </View>
                                <Text style={{ fontSize: 14, fontFamily: FontFamily.semibold, color: '#1e293b' }}>
                                  Resumen de Repetición
                                </Text>
                              </View>

                              <View style={{ gap: 8 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                  <Text style={{ fontSize: 13, color: '#64748b' }}>Cant. de pagos</Text>
                                  <Text style={{ fontSize: 13, color: '#1e293b', fontFamily: FontFamily.bold }}>{recurrenceCount || '0'}</Text>
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                  <Text style={{ fontSize: 13, color: '#64748b' }}>Importe por pago</Text>
                                  <Text style={{ fontSize: 13, color: '#1e293b', fontFamily: FontFamily.bold }}>{currency} {Number(amount || 0).toLocaleString('es-AR')}</Text>
                                </View>
                                <View style={{ height: 1, backgroundColor: '#e2e8f0', marginVertical: 4 }} />
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                  <Text style={{ fontSize: 14, color: '#1e293b', fontFamily: FontFamily.semibold }}>Importe Final Total</Text>
                                  <Text style={{ fontSize: 14, color: '#1e293b', fontFamily: FontFamily.bold }}>
                                    {currency} {(Number(amount || 0) * Number(recurrenceCount || 0)).toLocaleString('es-AR')}
                                  </Text>
                                </View>
                              </View>
                            </View>
                          </View>
                        )}
                      </View>
                    </View>
                  )}
                  {!isTransferOrAdjustment && (
                    <>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f2f2f0' }}>
                        <View style={{ flex: 1, paddingRight: 16 }}>
                          <Text style={{ fontSize: 15, color: '#363630', fontFamily: FontFamily.medium, marginBottom: 2 }}>Asistente de cobranza</Text>
                          <Text style={{ fontSize: 12, color: '#878778', lineHeight: 16 }}>Activa el seguimiento automático. Enviaremos recordatorios de pago para asegurarnos de que cobres a tiempo sin estrés.</Text>
                        </View>
                        <Switch
                          value={helpToCollect}
                          onValueChange={setHelpToCollect}
                          trackColor={{ true: '#3a9e76' }}
                          thumbColor={Platform.OS === 'android' ? (helpToCollect ? '#3a9e76' : '#f4f3f4') : undefined}
                        />
                      </View>

                      <View style={{ paddingTop: 12, borderBottomWidth: 1, borderBottomColor: '#f2f2f0' }}>
                        <Text style={{ fontSize: 15, color: '#363630', fontFamily: FontFamily.medium, marginBottom: 2 }}>Instrucciones de pago</Text>
                        <TextInput
                          style={{ fontSize: 15, color: '#363630', paddingVertical: 8, minHeight: 60, outlineStyle: 'none' } as any}
                          placeholder="Escribe aquí..."
                          placeholderTextColor="#c2c2c2"
                          value={paymentProcedure}
                          onChangeText={setPaymentProcedure}
                          editable={canEditAsOwner && (!ticketId || status === 'pending')}
                          multiline
                          numberOfLines={3}
                          textAlignVertical="top"
                        />
                      </View>
                    </>
                  )}
                  {type === 'income' && !isTransferOrAdjustment && (
                    <>
                      <View style={{ paddingTop: 12, borderBottomWidth: 1, borderBottomColor: '#f2f2f0' }}>
                        <Text style={{ fontSize: 15, color: '#363630', fontFamily: FontFamily.medium, marginBottom: 2 }}>Gastos asociados ($)</Text>
                        <TextInput
                          style={{ fontSize: 15, color: '#363630', paddingVertical: 8, outlineStyle: 'none', textAlign: 'right', width: '100%' } as any}
                          placeholder="0"
                          placeholderTextColor="#c2c2c2"
                          keyboardType="numeric"
                          value={formatAmount(expenses)}
                          onChangeText={(text) => {
                            let clean = text.replace(/[^0-9,]/g, '').replace(',', '.');
                            setExpenses(clean);
                          }}
                          editable={canEditAsOwner && (!ticketId || status === 'pending')}
                        />
                      </View>
                      <View style={{ paddingTop: 12, borderBottomWidth: 1, borderBottomColor: '#f2f2f0' }}>
                        <Text style={{ fontSize: 15, color: '#363630', fontFamily: FontFamily.medium, marginBottom: 2 }}>Detalle de gastos asociados</Text>
                        <TextInput
                          style={{ fontSize: 15, color: '#363630', paddingVertical: 8, minHeight: 60, outlineStyle: 'none' } as any}
                          placeholder="Escribe aquí..."
                          placeholderTextColor="#c2c2c2"
                          value={expensesDetail}
                          onChangeText={setExpensesDetail}
                          editable={canEditAsOwner && (!ticketId || status === 'pending')}
                          multiline
                          numberOfLines={3}
                          textAlignVertical="top"
                        />
                      </View>
                    </>
                  )}
                  <View style={{ paddingTop: 12, borderBottomWidth: 1, borderBottomColor: '#f2f2f0' }}>
                    <Text style={{ fontSize: 15, color: '#363630', fontFamily: FontFamily.medium, marginBottom: 2 }}>{isOwner ? "Detalle del ticket (lo pueden ver todos)" : "Detalle del ticket"}</Text>
                    <TextInput
                      style={{ fontSize: 15, color: '#363630', paddingVertical: 8, minHeight: 60, outlineStyle: 'none' } as any}
                      placeholder="Escribe aquí..."
                      placeholderTextColor="#c2c2c2"
                      value={comment}
                      onChangeText={setComment}
                      editable={isOwner || isParticipant}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>

                  <View style={{ paddingTop: 12, borderBottomWidth: 1, borderBottomColor: '#f2f2f0' }}>
                    <Text style={{ fontSize: 15, color: '#363630', fontFamily: FontFamily.medium, marginBottom: 2 }}>Nota privada (solo tú la verás)</Text>
                    <TextInput
                      style={{ fontSize: 15, color: '#363630', paddingVertical: 8, minHeight: 60, outlineStyle: 'none' } as any}
                      placeholder="Escribe aquí..."
                      placeholderTextColor="#c2c2c2"
                      value={privateNote}
                      onChangeText={setPrivateNote}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>

                  {/* RATING SECTION */}
                  {!!ticketId && !isTransferOrAdjustment && (
                    <View style={{ marginTop: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f2f2f0' }}>
                      <Text style={{ fontSize: 13, color: '#878778', marginBottom: 8, fontFamily: FontFamily.bold }}>
                        {isOwner ? 'Tu calificación como Dueño' : 'Tu calificación como Destinatario'}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <TouchableOpacity
                            key={star}
                            onPress={() => handleUpdateRating(star)}
                            disabled={status === 'cancelled' || (isOwner && ownerRating > 0 && status === 'completed') || (!isOwner && participantRating > 0 && status === 'completed')}
                          >
                            <Ionicons
                              name={(isOwner ? ownerRating : participantRating) >= star ? "star" : "star-outline"}
                              size={24}
                              color={(isOwner ? ownerRating : participantRating) >= star ? "#F59E0B" : "#b7b7ae"}
                            />
                          </TouchableOpacity>
                        ))}
                      </View>

                      {/* Show other person's rating if available */}
                      {isOwner ? (
                        participantRating > 0 && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                            <Text style={{ fontSize: 12, color: '#878778' }}>Calificación del destinatario: </Text>
                            <View style={{ flexDirection: 'row', gap: 2 }}>
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Ionicons key={s} name={participantRating >= s ? "star" : "star-outline"} size={12} color={participantRating >= s ? "#F59E0B" : "#b7b7ae"} />
                              ))}
                            </View>
                          </View>
                        )
                      ) : (
                        ownerRating > 0 && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                            <Text style={{ fontSize: 12, color: '#878778' }}>Calificación del dueño: </Text>
                            <View style={{ flexDirection: 'row', gap: 2 }}>
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Ionicons key={s} name={ownerRating >= s ? "star" : "star-outline"} size={12} color={ownerRating >= s ? "#F59E0B" : "#b7b7ae"} />
                              ))}
                            </View>
                          </View>
                        )
                      )}
                    </View>
                  )}
                </View>

                {/* Status indicator (if not edit) or Actions (if edit) */}

                {/* PAGOS REALIZADOS SECTION */}
                {!!ticketId && logs.filter(l => l.action === 'payment_received').length > 0 && (
                  <View style={{ width: '100%', marginTop: 32 }}>
                    <Text style={{ fontSize: 18, fontFamily: FontFamily.bold, color: '#363630', marginBottom: 16 }}>Pagos Realizados</Text>
                    {logs.filter(l => l.action === 'payment_received').map((payment, index) => (
                      <View key={payment.logId || index} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#eceae3' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                            <Ionicons name="cash-outline" size={20} color="#737373" />
                            <Text style={{ fontSize: 15, fontFamily: FontFamily.bold, color: '#363630', flexShrink: 1 }} numberOfLines={1}>
                              {payment.action === 'payment_received'
                                ? `${currency} $${Math.abs(Number(payment.newValue) - (Number(payment.oldValue) || 0)).toLocaleString('es-AR')}`
                                : (payment.newValue || payment.comment || 'Pago registrado')}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 12, color: '#878778', fontFamily: FontFamily.medium, marginLeft: 8 }}>
                            {new Date(payment.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                          </Text>
                        </View>

                        <Text style={{ fontSize: 13, color: '#737373', marginBottom: payment.attachmentUrl ? 12 : 0 }}>
                          Registrado por {payment.user?.displayName || payment.userId}
                        </Text>

                        {payment.attachmentUrl && (
                          <TouchableOpacity
                            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', padding: 12, borderRadius: 12, gap: 8 }}
                            onPress={() => handleViewAttachment(payment.attachmentUrl)}
                          >
                            <View style={{ width: 32, height: 32, backgroundColor: '#E5E7EB', borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
                              {(payment.attachmentUrl.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif)$/) || payment.attachmentUrl.startsWith('data:image')) ? (
                                <Image source={{ uri: payment.attachmentUrl }} style={{ width: '100%', height: '100%', borderRadius: 8 }} />
                              ) : (
                                <Ionicons name="document-outline" size={16} color="#737373" />
                              )}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 13, color: '#737373', fontFamily: FontFamily.semibold }}>Ver comprobante</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color="#737373" />
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>

            )}

            {activeTab === 'attach' && (
              <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 40 }}>
                {status === 'cancelled' && (
                  <View style={{ backgroundColor: '#FEF2F2', borderColor: '#FEE2E2', borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 24, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Ionicons name="alert-circle" size={24} color="#DC2626" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, color: '#991B1B', fontFamily: FontFamily.medium }}>
                        Los adjuntos no pueden modificarse en un ticket anulado.
                      </Text>
                    </View>
                  </View>
                )}
                <Text style={{ fontSize: 20, fontFamily: FontFamily.bold, color: '#363630', marginBottom: 24 }}>Adjuntos</Text>
                {!attachmentUri ? (
                  <View style={{ gap: 16 }}>
                    <TouchableOpacity
                      style={{ backgroundColor: '#f2f2f0', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16, opacity: status === 'cancelled' ? 0.5 : 1 }}
                      onPress={handlePickImage}
                      disabled={status === 'cancelled'}
                    >
                      <Ionicons name="image-outline" size={24} color="#363630" />
                      <Text style={{ fontSize: 16, color: '#363630' }}>Galería de imágenes</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ backgroundColor: '#f2f2f0', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16, opacity: status === 'cancelled' ? 0.5 : 1 }}
                      onPress={handleTakePhoto}
                      disabled={status === 'cancelled'}
                    >
                      <Ionicons name="camera-outline" size={24} color="#363630" />
                      <Text style={{ fontSize: 16, color: '#363630' }}>Cámara</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ backgroundColor: '#f2f2f0', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16, opacity: status === 'cancelled' ? 0.5 : 1 }}
                      onPress={handlePickDocument}
                      disabled={status === 'cancelled'}
                    >
                      <Ionicons name="document-attach-outline" size={24} color="#363630" />
                      <Text style={{ fontSize: 16, color: '#363630' }}>Documento PDF</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ backgroundColor: '#f2f2f0', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <TouchableOpacity
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 16 }}
                      onPress={() => {
                        console.log("Viewing attachment:", attachmentUri);
                        handleViewAttachment(attachmentUri);
                      }}
                    >
                      <View style={{ width: 60, height: 60, backgroundColor: '#fff', borderRadius: 8, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {(attachmentUri.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif)$/) || attachmentUri.startsWith('data:image') || attachmentUri.startsWith('blob:') || attachmentUri.startsWith('file:')) ? (
                          <Image source={{ uri: attachmentUri }} style={{ width: '100%', height: '100%' }} />
                        ) : (
                          <Ionicons name="document-text-outline" size={32} color="#878778" />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, color: '#363630', fontWeight: 'bold' }}>Archivo adjunto</Text>
                        <Text style={{ fontSize: 12, color: '#878778' }}>Pulsa para ver contenido</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleShareAttachment(attachmentUri)}
                      style={{ padding: 8 }}
                    >
                      <Ionicons name="share-social" size={24} color="#363630" />
                    </TouchableOpacity>

                    {isOwner && status !== 'cancelled' && (
                      <TouchableOpacity
                        onPress={removeAttachment}
                        style={{ padding: 8 }}
                      >
                        <Ionicons name="trash-outline" size={20} color="#9f9f93" />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            )}


          </ScrollView>
        </KeyboardAvoidingView>

        {/* TOOLBAR */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, paddingVertical: 16, backgroundColor: '#fff' }}>
          <TouchableOpacity style={{ backgroundColor: activeTab === 'info' ? '#363630' : '#fff', borderRadius: 100, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#eceae3' }} onPress={() => setActiveTab('info')}>
            <Ionicons name="pricetag-outline" size={20} color={activeTab === 'info' ? '#fff' : '#363630'} />
          </TouchableOpacity>
          <TouchableOpacity style={{ backgroundColor: activeTab === 'attach' ? '#363630' : '#fff', borderRadius: 100, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#eceae3' }} onPress={() => setActiveTab('attach')}>
            <Ionicons name="attach-outline" size={20} color={activeTab === 'attach' ? '#fff' : (attachmentUri ? "#3a9e76" : "#363630")} />
          </TouchableOpacity>
          {!!ticketId && (
            <>
              <TouchableOpacity style={{ backgroundColor: isLogModalVisible ? '#363630' : '#fff', borderRadius: 100, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#eceae3' }} onPress={() => setIsLogModalVisible(true)}>
                <Ionicons name="list-outline" size={20} color={isLogModalVisible ? '#fff' : "#363630"} />
              </TouchableOpacity>
              {!isTransferOrAdjustment && (
                <TouchableOpacity style={{ backgroundColor: '#fff', borderRadius: 100, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#eceae3' }} onPress={() => (navigation as any).navigate('ChatDetail', { ticketId })}>
                  <Ionicons name="chatbubble-outline" size={20} color="#363630" />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* FOOTER SAVE BUTTON */}
        <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#f2f2f0', backgroundColor: '#fff' }}>
          {!!(!isOwner && ticketId) && (
            <View style={{ marginBottom: 12, padding: 10, backgroundColor: '#FEFCE8', borderRadius: 10, borderWidth: 1, borderColor: '#FEF08A' }}>
              <Text style={{ fontSize: 12, color: '#854D0E', textAlign: 'center', fontFamily: FontFamily.medium }}>
                Como invitado puedes editar y gestionar este ticket de forma compartida.
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={{
              backgroundColor: status === 'cancelled' ? '#f2f2f0' : '#196342',
              borderRadius: 1000,
              paddingVertical: 14,
              alignItems: 'center',
              opacity: (isSaving || !amount || !selectedWalletId || (status === 'cancelled' && isEdit)) ? 0.6 : 1
            }}
            onPress={handleSave}
            disabled={isSaving || !amount || !selectedWalletId || (status === 'cancelled' && isEdit)}
          >
            <Text style={{ color: status === 'cancelled' ? '#878778' : '#fff', fontSize: 16, fontFamily: FontFamily.bold }}>
              {isSaving ? "Guardando..." : (status === 'cancelled' ? "Ticket Anulado" : (ticketId ? "Guardar cambios" : "Guardar ticket"))}
            </Text>
          </TouchableOpacity>
        </View>

        {/* LOG MODAL */}
        <Modal visible={isLogModalVisible} transparent animationType="slide" onRequestClose={() => setIsLogModalVisible(false)}>
          <TouchableWithoutFeedback onPress={() => setIsLogModalVisible(false)}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
              <TouchableWithoutFeedback>
                <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '80%', padding: 24 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <Text style={{ fontSize: 20, fontFamily: FontFamily.bold, color: '#363630' }}>Historia del Ticket</Text>
                    <TouchableOpacity onPress={() => setIsLogModalVisible(false)}>
                      <Ionicons name="close" size={24} color="#363630" />
                    </TouchableOpacity>
                  </View>
                  <FlatList
                    data={logs}
                    keyExtractor={(item) => item.logId}
                    contentContainerStyle={{ paddingBottom: 40 }}
                    renderItem={({ item, index }) => (
                      <View style={{ flexDirection: 'row', gap: 16, marginBottom: 0 }}>
                        {/* TIMELINE CONNECTOR */}
                        <View style={{ width: 40, alignItems: 'center' }}>
                          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#f2f2f0', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                            <Ionicons name={item.action === 'payment_received' ? "cash-outline" : "document-text-outline"} size={20} color="#363630" />
                          </View>
                          {index < logs.length - 1 && (
                            <View style={{
                              position: 'absolute',
                              top: 20,
                              bottom: -32,
                              width: 2,
                              backgroundColor: '#f2f2f0',
                              zIndex: 1
                            }} />
                          )}
                        </View>

                        <View style={{ flex: 1, paddingBottom: 32 }}>
                          <Text style={{ fontSize: 16, fontFamily: FontFamily.semibold, color: '#363630' }}>
                            {item.action === 'created' ? 'Ticket Creado' :
                              item.action === 'payment_received' ? 'Pago Registrado' :
                                item.action === 'status_cancelled' ? 'Ticket Anulado' :
                                  item.action === 'due_date_change' ? 'Vencimiento Cambiado' :
                                    (item.action === 'audit_message' ? 'Evento del Ticket' : 'Actividad')}
                          </Text>
                          <Text style={{ fontSize: 13, color: '#878778', marginTop: 2 }}>
                            {item.action === 'audit_message' ? item.newValue.replace(/^\*\*\*\s+/, '') :
                              item.action === 'status_cancelled' ? (item.comment || 'Ticket anulado sin motivo especificado') :
                                item.action === 'due_date_change' ? `Nueva fecha: ${new Date(item.newValue).toLocaleDateString('es-ES')}` :
                                  item.action === 'payment_received' ? `Monto: ${currency} $${Math.abs(Number(item.newValue) - (Number(item.oldValue) || 0)).toLocaleString('es-AR')}` :
                                    (item.newValue || item.comment || 'Sin descripción')}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 }}>
                            <View style={{ backgroundColor: '#f2f2f0', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                              <Text style={{ fontSize: 10, color: '#878778', fontFamily: FontFamily.bold }}>
                                {new Date(item.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                              </Text>
                            </View>
                            <Text style={{ fontSize: 11, color: '#a3a3a3' }}>
                              Por {item.user?.displayName || item.userId}
                            </Text>
                            {item.attachmentUrl && (
                              <TouchableOpacity
                                style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4 }}
                                onPress={() => handleViewAttachment(item.attachmentUrl)}
                              >
                                <Ionicons name="attach-outline" size={14} color="#3a9e76" />
                                <Text style={{ fontSize: 11, color: '#3a9e76', fontFamily: FontFamily.semibold }}>Ver Adjunto</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      </View>
                    )}
                    ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#878778', marginTop: 40 }}>No hay movimientos aún.</Text>}
                  />
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* WALLET MODAL */}
        <Modal visible={isWalletModalVisible} transparent animationType="slide" onRequestClose={() => setWalletModalVisible(false)}>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
            activeOpacity={1}
            onPress={() => setWalletModalVisible(false)}
          >
            <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '60%', padding: 24 }}>
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 20, fontFamily: FontFamily.bold, color: '#000000' }}>Billeteras</Text>
              </View>
              <FlatList
                data={wallets}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingBottom: 20 }}
                ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#F3F4F6' }} />}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18, paddingHorizontal: 4 }}
                    onPress={() => {
                      setSelectedWalletId(item.id);
                      setWalletModalVisible(false);
                    }}
                  >
                    <Text style={{
                      fontSize: 17,
                      fontFamily: selectedWalletId === item.id ? FontFamily.bold : FontFamily.medium,
                      color: '#000000'
                    }}>
                      {item.name}
                    </Text>
                    {selectedWalletId === item.id && <Ionicons name="checkmark" size={20} color="#143327" />}
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>

        {/* RUBRO MODAL */}
        <Modal visible={isRubroModalVisible} transparent animationType="slide" onRequestClose={() => setRubroModalVisible(false)}>
          <TouchableWithoutFeedback onPress={() => setRubroModalVisible(false)}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
              <TouchableWithoutFeedback>
                <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '70%', padding: 24 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <Text style={{ fontSize: 20, fontFamily: FontFamily.bold, color: '#363630' }}>{type === 'income' ? 'Origen / Rubro' : 'Categoría / Rubro'}</Text>
                    <TouchableOpacity onPress={() => setRubroModalVisible(false)}>
                      <Ionicons name="close" size={24} color="#363630" />
                    </TouchableOpacity>
                  </View>
                  <FlatList
                    data={getAvailableRubros()}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => {
                      if (item.isSeparator) {
                        return (
                          <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                            <View style={{ height: 1, backgroundColor: '#f2f2f0', width: '100%' }} />
                            <Text style={{ fontSize: 11, color: '#b7b7ae', marginTop: 8, fontFamily: FontFamily.bold, textTransform: 'uppercase', letterSpacing: 1 }}>Resto de categorías</Text>
                          </View>
                        );
                      }
                      return (
                        <TouchableOpacity
                          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f2f2f0' }}
                          onPress={() => {
                            setSelectedRubroId(item.id);
                            setRubroModalVisible(false);
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: ((item as any).color || '#363630') + '20', alignItems: 'center', justifyContent: 'center' }}>
                              <Ionicons name={(item as any).icon || "grid-outline"} size={20} color={(item as any).color || "#363630"} />
                            </View>
                            <Text style={{ fontSize: 16, fontFamily: FontFamily.medium, color: '#363630' }}>{item.label}</Text>
                          </View>
                          {selectedRubroId === item.id && <Ionicons name="checkmark-circle" size={24} color="#3a9e76" />}
                        </TouchableOpacity>
                      );
                    }}
                  />
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* PAYMENT MODAL */}
        <Modal visible={isPaymentModalVisible} transparent animationType="slide" onRequestClose={() => setIsPaymentModalVisible(false)}>
          <TouchableWithoutFeedback onPress={() => setIsPaymentModalVisible(false)}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
              <TouchableWithoutFeedback>
                <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '75%', padding: 24 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <Text style={{ fontSize: 20, fontFamily: FontFamily.bold, color: '#363630' }}>Registrar {isIncome ? 'Cobro' : 'Pago'}</Text>
                    <TouchableOpacity onPress={() => setIsPaymentModalVisible(false)}>
                      <Ionicons name="close" size={24} color="#363630" />
                    </TouchableOpacity>
                  </View>
                  <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                  >
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
                      <View style={{ gap: 20 }}>
                        <View>
                          <Text style={{ fontSize: 13, color: '#878778', marginBottom: 8 }}>Monto</Text>
                          <TextInput
                            style={{ backgroundColor: '#f2f2f0', borderRadius: 12, padding: 16, fontSize: 18, fontFamily: FontFamily.semibold, color: '#363630' }}
                            keyboardType="numeric"
                            value={payAmount ? payAmount.split('.').map((part, index) => index === 0 ? part.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : part).join(',') : ''}
                            onChangeText={(text) => {
                              let clean = text.replace(/[^0-9,]/g, '').replace(',', '.');
                              const parts = clean.split('.');
                              if (parts.length > 2) clean = parts[0] + '.' + parts.slice(1).join('');
                              setPayAmount(clean);
                            }}
                          />
                        </View>
                        <View>
                          <Text style={{ fontSize: 13, color: '#878778', marginBottom: 8 }}>Referencia / Detalle</Text>
                          <TextInput
                            style={{ backgroundColor: '#f2f2f0', borderRadius: 12, padding: 16, fontSize: 16, color: '#363630' }}
                            value={payDescription}
                            onChangeText={setPayDescription}
                            placeholder="Ej: Transferencia recibida"
                          />
                        </View>

                        <View>
                          <Text style={{ fontSize: 13, color: '#878778', marginBottom: 8 }}>Medio de Pago</Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            {paymentMethods.map(m => (
                              <TouchableOpacity
                                key={m.id}
                                onPress={() => setPayMethod(m.id)}
                                style={{
                                  backgroundColor: payMethod === m.id ? '#363630' : '#f2f2f0',
                                  paddingHorizontal: 12,
                                  paddingVertical: 8,
                                  borderRadius: 100,
                                  borderWidth: 1,
                                  borderColor: payMethod === m.id ? '#363630' : '#e7e7e4'
                                }}
                              >
                                <Text style={{ fontSize: 13, color: payMethod === m.id ? '#fff' : '#363630', fontFamily: FontFamily.medium }}>{m.label}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>

                        <View>
                          <Text style={{ fontSize: 13, color: '#878778', marginBottom: 8 }}>Comprobante (Opcional)</Text>
                          {payAttachment ? (
                            <View style={{ backgroundColor: '#f9f9f8', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#f2f2f0', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                              <TouchableOpacity
                                onPress={() => handleViewAttachment(payAttachment)}
                                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                              >
                                <View style={{ width: 44, height: 44, backgroundColor: '#fff', borderRadius: 8, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#f2f2f0' }}>
                                  {(payAttachment.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif)$/) || payAttachment.startsWith('data:image') || payAttachment.startsWith('file:') || payAttachment.startsWith('blob:')) ? (
                                    <Image source={{ uri: payAttachment }} style={{ width: '100%', height: '100%' }} />
                                  ) : (
                                    <Ionicons name="document-text-outline" size={24} color="#878778" />
                                  )}
                                </View>
                                <Text style={{ fontSize: 14, color: '#3a9e76', fontFamily: FontFamily.semibold }}>Toca para ver comprobante</Text>
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => setPayAttachment(null)}>
                                <Ionicons name="trash-outline" size={20} color="#9f9f93" />
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <View style={{ flexDirection: 'row', gap: 12 }}>
                              <TouchableOpacity
                                style={{ flex: 1, backgroundColor: '#f2f2f0', borderRadius: 12, paddingVertical: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                                onPress={async () => {
                                  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 });
                                  if (!res.canceled) setPayAttachment(res.assets[0].uri);
                                }}
                              >
                                <Ionicons name="image-outline" size={18} color="#363630" />
                                <Text style={{ fontSize: 14, color: '#363630', fontFamily: FontFamily.medium }}>Galería</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={{ flex: 1, backgroundColor: '#f2f2f0', borderRadius: 12, paddingVertical: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                                onPress={async () => {
                                  const res = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
                                  if (!res.canceled) setPayAttachment(res.assets[0].uri);
                                }}
                              >
                                <Ionicons name="camera-outline" size={18} color="#363630" />
                                <Text style={{ fontSize: 14, color: '#363630', fontFamily: FontFamily.medium }}>Cámara</Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      </View>
                    </ScrollView>
                  </KeyboardAvoidingView>
                  <TouchableOpacity
                    style={{ backgroundColor: '#363630', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 20, opacity: isSavingPayment ? 0.6 : 1 }}
                    onPress={handleRecordPayment}
                    disabled={isSavingPayment || !payAmount}
                  >
                    <Text style={{ color: '#fff', fontSize: 16, fontFamily: FontFamily.bold }}>{isSavingPayment ? 'Trabajando...' : 'Confirmar'}</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* DATE OPTIONS MODAL */}
        <Modal
          visible={isDateOptionsModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setDateOptionsModalVisible(false);
            setIsCustomDateActive(false);
          }}
        >
          <TouchableWithoutFeedback onPress={() => {
            setDateOptionsModalVisible(false);
            setIsCustomDateActive(false);
          }}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
              <TouchableWithoutFeedback>
                <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '85%', alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, fontFamily: FontFamily.bold, color: '#363630', marginBottom: 20, textAlign: 'center' }}>
                    {isCustomDateActive ? 'Seleccionar Fecha' : '¿Cuándo vence?'}
                  </Text>

                  {!isCustomDateActive ? (
                    <View style={{ width: '100%', gap: 12 }}>
                      {DATE_QUICK_OPTIONS.map((opt) => (
                        <TouchableOpacity
                          key={opt.id}
                          onPress={() => handleSelectQuickDate(opt.id)}
                          style={{ backgroundColor: '#f2f2f0', borderRadius: 16, paddingVertical: 14, alignItems: 'center' }}
                        >
                          <Text style={{ fontSize: 15, fontFamily: FontFamily.semibold, color: '#363630' }}>{opt.label}</Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity
                        style={{ marginTop: 8, paddingVertical: 12, alignItems: 'center' }}
                        onPress={() => {
                          setDateOptionsModalVisible(false);
                          setIsCustomDateActive(false);
                        }}
                      >
                        <Text style={{ color: '#878778', fontSize: 14 }}>Cancelar</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      {Platform.OS === 'ios' && (
                        <View style={{ width: '100%', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
                          <NativeDatePicker
                            value={date}
                            mode="date"
                            display="spinner"
                            onChange={handleCustomDateChange}
                            textColor="#363630"
                          />
                        </View>
                      )}

                      <View style={{ flexDirection: 'row', gap: 12, marginTop: 24, width: '100%' }}>
                        <TouchableOpacity
                          style={{ flex: 1, backgroundColor: '#f2f2f0', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
                          onPress={() => setIsCustomDateActive(false)}
                        >
                          <Text style={{ color: '#363630', fontFamily: FontFamily.semibold }}>Atrás</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{ flex: 1, backgroundColor: '#16A34A', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
                          onPress={() => {
                            applyDateChange(date);
                            setDateOptionsModalVisible(false);
                            setIsCustomDateActive(false);
                          }}
                        >
                          <Text style={{ color: '#fff', fontFamily: FontFamily.bold }}>Listo</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* ANDROID STANDALONE DATE PICKER */}
        {Platform.OS === 'android' && showDatePicker && (
          <NativeDatePicker
            value={date}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              handleDateChange(event, selectedDate);
              if (event.type === 'set' || event.type === 'dismissed') {
                setDateOptionsModalVisible(false);
              }
            }}
          />
        )}


        {/* CANCEL MODAL */}
        <Modal visible={isCancelModalVisible} transparent animationType="fade" onRequestClose={() => setCancelModalVisible(false)}>
          <TouchableWithoutFeedback onPress={() => setCancelModalVisible(false)}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
              <TouchableWithoutFeedback>
                <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '85%' }}>
                  <Text style={{ fontSize: 18, fontFamily: FontFamily.bold, color: '#363630', marginBottom: 8, textAlign: 'center' }}>¿Cancelar Ticket?</Text>
                  <Text style={{ fontSize: 14, color: '#878778', marginBottom: 20, textAlign: 'center' }}>Explica brevemente el motivo de la cancelación.</Text>
                  <TextInput
                    style={{ backgroundColor: '#f2f2f0', borderRadius: 12, padding: 16, fontSize: 16, color: '#363630', minHeight: 80 }}
                    multiline
                    placeholder="Ej: Error en el monto"
                    value={cancelReason}
                    onChangeText={setCancelReason}
                  />
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
                    <TouchableOpacity
                      style={{ flex: 1, backgroundColor: '#f2f2f0', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
                      onPress={() => setCancelModalVisible(false)}
                    >
                      <Text style={{ color: '#363630', fontFamily: FontFamily.bold }}>Volver</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ flex: 1, backgroundColor: '#c05050', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
                      onPress={async () => {
                        await performCancellation(cancelReason);
                        setCancelModalVisible(false);
                      }}
                    >
                      <Text style={{ color: '#fff', fontFamily: FontFamily.bold }}>Confirmar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* CONTACT OPTIONS MODAL (Native vs List) */}
        <Modal visible={isContactOptionsModalVisible} transparent animationType="fade" onRequestClose={() => setContactOptionsModalVisible(false)}>
          <TouchableWithoutFeedback onPress={() => setContactOptionsModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Destinatario</Text>
                    <TouchableOpacity onPress={() => setContactOptionsModalVisible(false)}>
                      <Ionicons name="close" size={24} color="#363630" />
                    </TouchableOpacity>
                  </View>
                  <View style={{ padding: 24, gap: 16 }}>
                    <TouchableOpacity
                      style={styles.guestPrimaryBtn}
                      onPress={() => {
                        setContactOptionsModalVisible(false);
                        openNativeContacts();
                      }}
                    >
                      <Ionicons name="person-outline" size={20} color="#fff" />
                      <Text style={[styles.guestPrimaryBtnText, { marginLeft: 8 }]}>Elegir de mis contactos</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.guestSecondaryBtn}
                      onPress={() => {
                        setContactOptionsModalVisible(false);
                        setListModalVisible(true);
                      }}
                    >
                      <Ionicons name="people-outline" size={20} color="#171717" />
                      <Text style={[styles.guestSecondaryBtnText, { marginLeft: 8 }]}>Lista de contactos</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* NATIVE CONTACTS MODAL */}
        <Modal
          visible={isContactModalVisible}
          animationType="slide"
          presentationStyle="formSheet"
          onRequestClose={() => setContactModalVisible(false)}
        >
          <SafeAreaView style={styles.contactModal} edges={['top', 'bottom']}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ flex: 1 }}
            >
              <View style={styles.modalHeaderHeader}>
                <TouchableOpacity onPress={() => setContactModalVisible(false)}>
                  <Text style={{ fontSize: 15, fontFamily: FontFamily.medium, color: '#737373' }}>Cancelar</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitleMain}>Contactos</Text>
                <TouchableOpacity onPress={confirmContactsSelection}>
                  <Text style={{ fontSize: 15, fontFamily: FontFamily.bold, color: '#16A34A' }}>Listo</Text>
                </TouchableOpacity>
              </View>

              <View style={{ padding: 16 }}>
                <View style={styles.searchBarWrapper}>
                  <Ionicons name="search" size={18} color="#A3A3A3" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.searchBar}
                    placeholder="Buscar por nombre o teléfono..."
                    value={contactSearchText}
                    onChangeText={setContactSearchText}
                    placeholderTextColor="#737373"
                  />
                  {contactSearchText.length > 0 && (
                    <TouchableOpacity onPress={() => setContactSearchText('')} style={{ padding: 6 }}>
                      <Ionicons name="close-circle" size={18} color="#A3A3A3" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {selectedContactsTemp.length > 0 && (
                <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {selectedContactsTemp.map(c => {
                      const phone = c.phone;
                      return (
                        <TouchableOpacity
                          key={phone}
                          style={styles.selectedChip}
                          onPress={() => toggleContactSelection(c)}
                        >
                          {c.imageUri ? (
                            <Image source={{ uri: c.imageUri }} style={{ width: 24, height: 24, borderRadius: 12, marginRight: 6 }} />
                          ) : (
                            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#404040', alignItems: 'center', justifyContent: 'center', marginRight: 6 }}>
                              <Text style={{ fontSize: 10, color: 'white', fontFamily: FontFamily.bold }}>{c.name.charAt(0)}</Text>
                            </View>
                          )}
                          <Text style={styles.selectedChipText}>{c.name.split(' ')[0]}</Text>
                          <Ionicons name="close-circle" size={16} color="white" style={{ marginLeft: 4 }} />
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              <FlatList
                data={filteredContacts}
                keyExtractor={(item, index) => item.phone + index}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
                renderItem={({ item }) => {
                  const isSelected = selectedContactsTemp.some(c => cleanPhone(c.phone) === cleanPhone(item.phone));
                  return (
                    <TouchableOpacity
                      style={styles.contactRow}
                      onPress={() => toggleContactSelection(item)}
                    >
                      {item.imageUri ? (
                        <Image source={{ uri: item.imageUri }} style={styles.contactAvatar} />
                      ) : (
                        <View style={styles.contactAvatar}>
                          <Text style={{ fontSize: 16, fontFamily: FontFamily.bold, color: '#737373' }}>
                            {item.name.charAt(0)}
                          </Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.contactName}>{item.name}</Text>
                        <Text style={styles.contactPhone}>{item.phone}</Text>
                      </View>
                      <Ionicons
                        name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                        size={24}
                        color={isSelected ? "#16A34A" : "#D1D5DB"}
                      />
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View style={{ alignItems: 'center', marginTop: 40 }}>
                    <Text style={{ color: '#878778' }}>No se encontraron contactos</Text>
                  </View>
                }
              />
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Modal>

        {/* DISTRIBUTION LISTS MODAL */}
        <Modal visible={isListModalVisible} transparent animationType="slide" onRequestClose={() => setListModalVisible(false)}>
          <TouchableWithoutFeedback onPress={() => setListModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={[styles.modalContent, { height: '60%' }]}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Listas de Contactos</Text>
                    <TouchableOpacity onPress={() => setListModalVisible(false)}>
                      <Ionicons name="close" size={24} color="#363630" />
                    </TouchableOpacity>
                  </View>

                  <View style={{ padding: 16 }}>
                    <TextInput
                      style={styles.input}
                      placeholder="Buscar lista..."
                      value={listSearchText}
                      onChangeText={setListSearchText}
                    />
                  </View>

                  <FlatList
                    data={(selectedWallet?.distributionLists || []).filter(l => l.name.toLowerCase().includes(listSearchText.toLowerCase()))}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.walletItem}
                        onPress={() => {
                          setSelectedListId(item.id);
                          setAssignedListName(item.name);
                          setAssignedContacts(item.contacts);
                          setListModalVisible(false);
                          setListSearchText('');
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#f0f9ff', alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="list" size={20} color="#0369a1" />
                          </View>
                          <View>
                            <Text style={styles.walletItemName}>{item.name}</Text>
                            <Text style={{ fontSize: 12, color: '#737373' }}>{item.contacts.length} destinatarios</Text>
                          </View>
                        </View>
                        {selectedListId === item.id && <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />}
                      </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                      <View style={{ alignItems: 'center', marginTop: 40 }}>
                        <Text style={{ color: '#878778' }}>No se encontraron listas</Text>
                      </View>
                    }
                  />
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* RECURRENCE FREQUENCY MODAL */}
        <Modal visible={isRecurrenceModalVisible} transparent animationType="slide" onRequestClose={() => setIsRecurrenceModalVisible(false)}>
          <TouchableWithoutFeedback onPress={() => setIsRecurrenceModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={[styles.modalContent, { height: 'auto', paddingBottom: 40 }]}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Frecuencia de Repetición</Text>
                    <TouchableOpacity onPress={() => setIsRecurrenceModalVisible(false)}>
                      <Ionicons name="close" size={24} color="#363630" />
                    </TouchableOpacity>
                  </View>

                  <View style={{ padding: 12 }}>
                    {[
                      { id: 'weekly', label: '1 vez por semana' },
                      { id: 'biweekly', label: '1 vez cada 15 días' },
                      { id: 'monthly', label: '1 vez por mes' },
                      { id: 'bimonthly', label: '1 vez cada 2 meses' },
                      { id: 'semi-annually', label: '1 vez cada 6 meses' },
                      { id: 'yearly', label: '1 vez por año' },
                    ].map((freq) => (
                      <TouchableOpacity
                        key={freq.id}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingVertical: 16,
                          borderBottomWidth: 1,
                          borderBottomColor: '#f2f2f0'
                        }}
                        onPress={() => {
                          setRecurrenceFrequency(freq.id);
                          setIsRecurrenceModalVisible(false);
                        }}
                      >
                        <Text style={{ fontSize: 16, color: '#363630', fontFamily: recurrenceFrequency === freq.id ? FontFamily.semibold : FontFamily.regular }}>
                          {freq.label}
                        </Text>
                        {recurrenceFrequency === freq.id && <Ionicons name="checkmark-circle" size={24} color="#3a9e76" />}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* REVIEW RECIPIENTS MODAL */}
        <Modal visible={isReviewModalVisible} transparent animationType="slide" onRequestClose={() => setReviewModalVisible(false)}>
          <TouchableWithoutFeedback onPress={() => setReviewModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={[styles.modalContent, { height: '70%' }]}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Revisar Destinatarios</Text>
                    <TouchableOpacity onPress={() => setReviewModalVisible(false)}>
                      <Ionicons name="close" size={24} color="#363630" />
                    </TouchableOpacity>
                  </View>


                  <View style={{ padding: 16 }}>
                    <TextInput
                      style={styles.input}
                      placeholder="Buscar en la lista..."
                      value={reviewSearchText}
                      onChangeText={setReviewSearchText}
                    />
                  </View>

                  <FlatList
                    data={assignedContacts.filter(c =>
                      c.name.toLowerCase().includes(reviewSearchText.toLowerCase()) ||
                      c.phone.includes(reviewSearchText)
                    )}
                    keyExtractor={(item, index) => item.phone + index}
                    contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
                    renderItem={({ item }) => (
                      <View style={styles.walletItem}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 16, fontFamily: FontFamily.bold, color: '#171717' }}>{item.name.charAt(0)}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.walletItemName} numberOfLines={1}>{item.name}</Text>
                            <Text style={{ fontSize: 12, color: '#737373' }}>{item.phone}</Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          onPress={() => {
                            handleRemoveContact(item.phone);
                          }}
                          style={{ padding: 8 }}
                        >
                          <Ionicons name="trash-outline" size={20} color="#9f9f93" />
                        </TouchableOpacity>
                      </View>
                    )}
                    ListEmptyComponent={
                      <View style={{ alignItems: 'center', marginTop: 40 }}>
                        <Text style={{ color: '#878778' }}>No se encontraron destinatarios</Text>
                      </View>
                    }
                  />

                  <View style={{ padding: 24 }}>
                    <TouchableOpacity
                      style={styles.actionBtnPrimary}
                      onPress={() => setReviewModalVisible(false)}
                    >
                      <Text style={styles.actionBtnTextPrimary}>Confirmar Lista</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>



      </View>
      <QRScannerModal
        visible={isScannerVisible}
        onClose={() => setScannerVisible(false)}
        onScan={handleScanQR}
      />
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
  },
  headerTitleCenter: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    color: '#171717',
    textAlign: 'center',
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  typeToggleWrapper: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  typeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 99,
    padding: 4,
    width: 200,
  },
  typeToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 99,
  },
  typeToggleBtnActive: {
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      web: { boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      }
    }),
    elevation: 2,
  },
  typeToggleText: {
    fontSize: 14,
    fontFamily: FontFamily.medium,
    color: '#737373',
  },
  typeToggleTextActive: {
    color: '#171717',
    fontFamily: FontFamily.bold,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F6',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 80,
    alignSelf: 'stretch',
  },
  amountInput: {
    width: '100%',
    fontSize: 40,
    fontFamily: FontFamily.bold,
    color: '#171717',
    textAlign: 'center',
    padding: 0,
    borderWidth: 0,
    // @ts-ignore
    outlineStyle: 'none',
  },
  montoLabel: {
    fontSize: 12,
    fontFamily: FontFamily.bold,
    color: '#737373',
    letterSpacing: 1,
    marginBottom: 8,
  },
  currencySubLabel: {
    fontSize: 14,
    fontFamily: FontFamily.medium,
    color: '#A3A3A3',
    marginTop: 4,
  },
  amountPaidRestInfo: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
    color: '#DC2626',
    marginTop: 8,
  },
  formContent: {

    paddingHorizontal: 24,
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
    color: '#171717',
  },
  caption: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: '#737373',
    marginBottom: 4,
  },
  cardLabelSmall: {
    fontSize: 11,
    fontFamily: FontFamily.medium,
    color: '#A3A3A3',
    marginBottom: 1,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 48, // Aligned with text
  },
  cardInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: FontFamily.medium,
    color: '#171717',
    padding: 0,
  },
  miniActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 10,
    gap: 8,
  },
  miniActionText: {
    fontSize: 13,
    fontFamily: FontFamily.medium,
    color: '#737373',
  },
  mainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    ...Platform.select({
      web: { boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.02)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.02,
        shadowRadius: 10,
        elevation: 2,
      }
    }),
    elevation: 2,
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 56,
  },
  cardItemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardItemText: {
    fontSize: 15,
    fontFamily: FontFamily.medium,
    color: '#171717',
    marginLeft: 12,
  },
  cardItemValue: {
    fontSize: 15,
    fontFamily: FontFamily.bold,
    color: '#171717',
  },
  fieldSectionTitle: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
    color: '#A3A3A3',
    marginLeft: 18,
    marginBottom: 8,
    marginTop: 24,
    letterSpacing: 0.5,
  },
  actionList: {
    paddingHorizontal: 16,
    gap: 12,
    marginTop: 12,
  },
  actionBtnPrimary: {
    height: 56,
    backgroundColor: '#171717',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionBtnSecondary: {
    height: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionBtnTextPrimary: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    color: '#FFFFFF',
  },
  actionBtnTextSecondary: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    color: '#171717',
  },
  actionBtnTextDestructive: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    color: '#DC2626',
  },
  attachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginTop: 8,
  },
  attachmentPreview: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  attachmentImage: {
    width: '100%',
    height: '100%',
  },
  attachmentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  attachmentName: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
    color: '#171717',
  },
  attachmentSize: {
    fontSize: 11,
    fontFamily: FontFamily.regular,
    color: '#A3A3A3',
  },
  attachmentDelete: {
    padding: 8,
  },
  systemAlert: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    gap: 10,
  },
  systemAlertIcon: {
    marginTop: 2,
  },
  systemAlertText: {
    flex: 1,
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: '#0369A1',
    lineHeight: 18,
  },
  logsSection: {
    marginTop: 32,
    paddingHorizontal: 16,
  },
  logsInnerHeader: {
    marginBottom: 16,
  },
  logsInnerTitle: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    color: '#171717',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 11,
    fontFamily: FontFamily.medium,
    color: '#A3A3A3',
  },
  infoValue: {
    fontSize: 13,
    fontFamily: FontFamily.medium,
    color: '#737373',
  },
  logDatePill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  logDatePillText: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    color: '#A3A3A3',
  },
  logAmount: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
    color: '#171717',
  },
  logsList: {
    paddingLeft: 0,
    marginTop: 10,
  },
  logItem: {
    flexDirection: 'row',
    marginBottom: 30,
    position: 'relative',
  },
  logLine: {
    position: 'absolute',
    left: 17,
    top: 36,
    bottom: -30,
    width: 1,
    backgroundColor: '#E5E5E5',
  },
  logIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  logBody: {
    flex: 1,
    marginLeft: 16,
    paddingTop: 4,
  },
  logTitle: {
    fontSize: 15,
    fontFamily: FontFamily.bold,
    color: '#171717',
    marginBottom: 2,
  },
  logSubtitle: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: '#737373',
    marginBottom: 8,
  },
  logFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  saveBtn: {
    height: 52,
    backgroundColor: '#171717',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
      }
    }),
    elevation: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalContentCentered: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    margin: 24,
    paddingBottom: 24,
    marginBottom: 'auto',
    marginTop: 'auto',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
    color: '#171717',
  },
  walletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  walletItemName: {
    fontSize: 16,
    fontFamily: FontFamily.regular,
    color: '#171717',
  },
  toast: {
    position: 'absolute',
    top: 60,
    left: '10%',
    right: '10%',
    backgroundColor: '#171717E6',
    borderRadius: 99,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: FontFamily.medium,
  },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: FontFamily.regular,
    color: '#171717',
  },
  selectBtn: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectBtnText: {
    fontSize: 16,
    fontFamily: FontFamily.regular,
    color: '#171717',
  },
  guestPrimaryBtn: {
    height: 44,
    backgroundColor: '#171717',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestPrimaryBtnText: {
    fontSize: 13,
    fontFamily: FontFamily.bold,
    color: '#FFFFFF',
  },
  guestSecondaryBtn: {
    height: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestSecondaryBtnText: {
    fontSize: 13,
    fontFamily: FontFamily.bold,
    color: '#171717',
  },
  participantHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  participantAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
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
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
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
});





