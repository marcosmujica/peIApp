import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  Modal,
  FlatList,
  Animated,
  Switch,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Contacts from 'expo-contacts';
import * as ImagePicker from 'expo-image-picker';
import { RootStackParamList } from '@/navigation/RootNavigator';
import { FontFamily, Colors } from '@/constants/theme';
import { getLocalWallets, saveLocalWallets, LocalWallet, DistributionList } from '@/storage/wallets.local';
import { walletsApi, WalletMember } from '@/api/wallets.api';
import { normalizeUrl } from '@/utils/url.util';
import { useContactsStore } from '@/store/contacts.store';
import { Button } from '@/components/ui/Button';
import { getContacts, normalizePhone } from '@/services/contacts.service';
import { useAuthStore } from '@/store/auth.store';
import { getSmartDisplayName, getSmartAvatarUrl } from '@/utils/userDisplay';

type Props = NativeStackScreenProps<RootStackParamList, 'WalletSettings'>;

interface ContactInfo {
  name: string;
  phone: string;
  imageUri?: string;
  userId?: string;
}

const cleanPhone = (p?: string) => {
  if (!p) return '';
  if (p.includes('-') && p.length > 20) return p; // UUID
  const digits = p.replace(/\D/g, '');
  return digits.slice(-8); // Comparar solo los últimos 8 dígitos para evitar problemas de prefijos
};

const getMemberUniqueKey = (m: any) => {
  if (!m) return '';
  if (m.phone) return cleanPhone(m.phone);
  const id = m.userId || '';
  const isUuid = id.includes('-') && id.length > 20;
  if (!isUuid) return cleanPhone(id);
  return id;
};

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
];

const formatAmount = (val: string) => {
  const numeric = val.replace(/\D/g, '');
  if (!numeric) return '';
  return numeric.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

export const WalletSettingsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { walletId } = route.params;
  const { user } = useAuthStore();

  const { loadContacts } = useContactsStore();
  const [wallet, setWallet] = useState<LocalWallet | null>(null);
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);

  const ensureOwnerRole = (membersList: any[]) => {
    if (!membersList) return [];
    return membersList.map(m => {
      const isMe = (user?.phoneNumber && (cleanPhone(m.userId) === cleanPhone(user.phoneNumber) || (m.phone && cleanPhone(m.phone) === cleanPhone(user.phoneNumber)))) ||
        (user?.id && m.userId === user.id);
      if (isMe) {
        return { ...m, role: 'owner' };
      }
      return m;
    });
  };
  const [helpToCollect, setHelpToCollect] = useState(false);
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState('');
  const [members, setMembers] = useState<LocalWallet['members']>([]);
  const [distributionLists, setDistributionLists] = useState<DistributionList[]>([]);
  const [warningThreshold, setWarningThreshold] = useState('');
  const [alertThreshold, setAlertThreshold] = useState('');
  const [defaultTransactionType, setDefaultTransactionType] = useState<'income' | 'expense'>('expense');
  const [includeInGeneralBalance, setIncludeInGeneralBalance] = useState(true);
  const [enabledPanels, setEnabledPanels] = useState<string[]>(['month_summary']); // Default to month summary

  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'members' | 'advanced' | 'categories'>('general');
  const [isContactModalVisible, setContactModalVisible] = useState(false);
  const [isListModalVisible, setListModalVisible] = useState(false);
  const [contactsList, setContactsList] = useState<ContactInfo[]>([]);
  const [contactSearchText, setContactSearchText] = useState('');
  const [infoModalContent, setInfoModalContent] = useState<{ title: string, description: string } | null>(null);

  // State for creating a new distribution list
  const [newListLabel, setNewListLabel] = useState('');
  const [newListContacts, setNewListContacts] = useState<ContactInfo[]>([]);
  const [isAddingToList, setIsAddingToList] = useState(false); // Flag if we are picking contact for a member or for a distribution list
  const [selectedContactsTemp, setSelectedContactsTemp] = useState<ContactInfo[]>([]);
  const [editingListId, setEditingListId] = useState<string | null>(null);



  useEffect(() => {
    const loadData = async () => {
      const all = await getLocalWallets();
      const w = all.find(x => x.id === walletId);
      if (w) {
        setWallet(w);
        setName(w.name);
        setAvatarUrl(w.avatarUrl);
        setHelpToCollect(!!w.helpToCollect);
        setDefaultPaymentMethod(w.defaultPaymentMethod || '');
        setDistributionLists(w.distributionLists || []);
        setWarningThreshold(w.warningThreshold?.toString() || '');
        setAlertThreshold(w.alertThreshold?.toString() || '');
        setDefaultTransactionType(w.defaultTransactionType || (w.type.includes('negocio') || w.type === 'business' ? 'income' : 'expense'));
        setIncludeInGeneralBalance(w.includeInGeneralBalance ?? true);
        setEnabledPanels(w.enabledPanels || ['month_summary']);

        // Cargar miembros desde local primero, filtrando posibles duplicados del owner por número de teléfono
        const cleanedLocalMembers = ensureOwnerRole(w.members || []).filter((m: any) => {
          const isOwnerPhone = user?.phoneNumber && m.role !== 'owner' && (cleanPhone(m.userId) === cleanPhone(user.phoneNumber) || (m.phone && cleanPhone(m.phone) === cleanPhone(user.phoneNumber)));
          return !isOwnerPhone;
        });

        // Eliminar duplicados locales
        const seenLocal = new Set();
        const uniqueLocal = cleanedLocalMembers.filter(m => {
          const key = getMemberUniqueKey(m);
          if (!key || seenLocal.has(key)) return false;
          seenLocal.add(key);
          return true;
        });
        setMembers(uniqueLocal);

        // Cargar contactos locales para resolver nombres
        loadContacts();

        // Luego refrescar desde el servidor para tener roles actualizados
        try {
          const serverMembers = await walletsApi.getWalletMembers(walletId);
          if (serverMembers && serverMembers.length > 0) {
            const serverMembersWithOwner = ensureOwnerRole(serverMembers);
            // Combinar: Mantener miembros que están locales pero no en el server aún, excluyendo duplicados del owner
            setMembers(prev => {
              const serverIds = new Set(serverMembersWithOwner.map(m => getMemberUniqueKey(m)));
              const localOnly = (prev || []).filter((m: any) => {
                const isOwnerPhone = user?.phoneNumber && m.role !== 'owner' && (cleanPhone(m.userId) === cleanPhone(user.phoneNumber) || (m.phone && cleanPhone(m.phone) === cleanPhone(user.phoneNumber)));
                const isAlreadyInServer = serverIds.has(getMemberUniqueKey(m));
                return !isAlreadyInServer && m.role !== 'owner' && !isOwnerPhone;
              });

              const cleanedServerMembers = serverMembersWithOwner.filter((m: any) => {
                const isOwnerPhone = user?.phoneNumber && m.role !== 'owner' && (cleanPhone(m.userId) === cleanPhone(user.phoneNumber) || (m.phone && cleanPhone(m.phone) === cleanPhone(user.phoneNumber)));
                return !isOwnerPhone;
              });

              const merged = [...cleanedServerMembers, ...localOnly];

              // Eliminar duplicados en el merge
              const seenMerge = new Set();
              return merged.filter(m => {
                const key = getMemberUniqueKey(m);
                if (!key || seenMerge.has(key)) return false;
                seenMerge.add(key);
                return true;
              });
            });

            // Actualizar localmente
            const finalServerCleaned = serverMembersWithOwner.filter((m: any) => {
              const isOwnerPhone = user?.phoneNumber && m.role !== 'owner' && (cleanPhone(m.userId) === cleanPhone(user.phoneNumber) || (m.phone && cleanPhone(m.phone) === cleanPhone(user.phoneNumber)));
              return !isOwnerPhone;
            });

            const seenServerClean = new Set();
            const uniqueServerClean = finalServerCleaned.filter(m => {
              const key = getMemberUniqueKey(m);
              if (!key || seenServerClean.has(key)) return false;
              seenServerClean.add(key);
              return true;
            });
            w.members = uniqueServerClean;
            await saveLocalWallets(all);
          }
        } catch (err) {
          console.warn("Could not sync members from server", err);
        }
      }
    };
    loadData();
  }, [walletId]);

  const handleSave = async () => {
    if (!walletId) return;
    setIsSaving(true);
    try {
      const parsedWarning = parseFloat(warningThreshold.toString().replace(/\./g, '').replace(',', '.')) || 0;
      const parsedAlert = parseFloat(alertThreshold.toString().replace(/\./g, '').replace(',', '.')) || 0;

      // 1. Update Local
      const all = await getLocalWallets();
      const idx = all.findIndex(w => w.id === walletId);
      if (idx >= 0) {
        all[idx] = {
          ...all[idx],
          name,
          avatarUrl,
          helpToCollect,
          defaultPaymentMethod,
          members,
          distributionLists,
          warningThreshold: parsedWarning,
          alertThreshold: parsedAlert,
          defaultTransactionType,
          includeInGeneralBalance,
          enabledPanels,
          updatedAt: new Date().toISOString(),
        };
        await saveLocalWallets(all);
      }

      // 2. Update Server
      const updateDto: any = {
        name,
        helpToCollect,
        defaultPaymentMethod: defaultPaymentMethod || '',
        avatarUrl,
        warningThreshold: parsedWarning,
        alertThreshold: parsedAlert,
        defaultTransactionType,
        includeInGeneralBalance,
        enabledPanels: enabledPanels as any,
      };

      if (distributionLists && distributionLists.length > 0) {
        updateDto.distributionLists = distributionLists;
      }

      try {
        await walletsApi.updateWallet(walletId, updateDto);

        // 3. Update Members on Server
        if (members && members.length > 0) {
          const nonOwners = members
            .filter((m: any) => {
              const isOwnerUuid = m.role === 'owner';
              const isOwnerPhone = user?.phoneNumber && (cleanPhone(m.userId) === cleanPhone(user.phoneNumber) || (m.phone && cleanPhone(m.phone) === cleanPhone(user.phoneNumber)));
              return !isOwnerUuid && !isOwnerPhone;
            })
            .map(m => ({ userId: m.userId, displayName: m.displayName }));

          await walletsApi.updateMembers(walletId, nonOwners);
        }
      } catch (serverErr: any) {
        console.error("[WalletSettings] Server update failed", serverErr);
        if (serverErr.response) {
          console.error("[WalletSettings] Response data:", serverErr.response.data);
          console.error("[WalletSettings] Response status:", serverErr.response.status);
        }
        // Si el servidor falla pero ya guardamos local, notificamos y permitimos continuar
        if (serverErr.code === 'ECONNABORTED' || serverErr.message?.includes('timeout') || !serverErr.response) {
          throw serverErr; // Re-throw to handle as timeout
        }
        // Si es un error de validación (400), lo mostramos
        const msg = serverErr.response?.data?.message || serverErr.response?.data?.error || serverErr.message || 'Error desconocido';
        Alert.alert('Error al sincronizar', `Los cambios se guardaron en tu teléfono pero el servidor respondió: ${msg}`);
      }

      navigation.navigate('MainTabs', {
        screen: 'Billeteras',
        params: {
          screen: 'WalletDetails',
          params: {
            walletId,
            walletName: name,
            showToast: true,
            toastMessage: 'Configuración guardada'
          }
        }
      } as any);
    } catch (e: any) {
      console.error("[WalletSettings] General error", e);
      if (e.code === 'ECONNABORTED' || e.message?.includes('timeout')) {
        Alert.alert(
          'Sincronización pendiente',
          'Los cambios se guardaron localmente pero el servidor está demorando en responder. La información se actualizará pronto.',
          [{ text: 'Aceptar', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Error', 'No se pudo completar el guardado. Verifica tu conexión.');
      }
    } finally {
      setIsSaving(false);
    }
  };
  const handlePickImage = async (useCamera: boolean) => {
    const permissionResult = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert("Permiso denegado", `Necesitamos permiso para acceder a tu ${useCamera ? 'cámara' : 'galería'}.`);
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      })
      : await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      handleUploadAvatar(result.assets[0].uri);
    }
  };

  const handleUploadAvatar = async (uri: string) => {
    try {
      setIsSaving(true);
      const updatedWallet = await walletsApi.uploadAvatar(walletId, uri);
      setAvatarUrl(`${updatedWallet.avatarUrl}?t=${Date.now()}`);
      // Success alert removed as requested
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", error.message || "No se pudo subir la imagen.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePickContact = async (forList: boolean = false) => {
    setIsAddingToList(forList);
    // Initialize temporary selection with current contacts
    if (forList) {
      setSelectedContactsTemp([...newListContacts]);
    } else {
      const currentMembers = members || [];
      const preSelected = (currentMembers as any[])
        .filter((m: any) => {
          const isOwnerUuid = m.role === 'owner';
          const isOwnerPhone = user?.phoneNumber && (cleanPhone(m.userId) === cleanPhone(user.phoneNumber) || (m.phone && cleanPhone(m.phone) === cleanPhone(user.phoneNumber)));
          return !isOwnerUuid && !isOwnerPhone;
        })
        .map((m: any) => {
          const phoneVal = m.phone || (m.userId.includes('-') && m.userId.length > 20 ? '' : m.userId);
          return {
            name: m.displayName,
            phone: phoneVal,
            imageUri: m.avatarUrl,
            userId: m.userId
          };
        });
      setSelectedContactsTemp(preSelected);
    }

    try {
      const data = await getContacts();
      const mapped: ContactInfo[] = data.map(c => ({
        name: c.name,
        phone: c.phoneNumbers?.[0] || '',
        imageUri: c.imageUri
      }));
      setContactsList(mapped);
      setContactModalVisible(true);
    } catch (e) {
      Alert.alert('Error', 'No se pudo acceder a los contactos.');
    }
  };

  const toggleContactSelection = (contact: ContactInfo) => {
    const isSelected = selectedContactsTemp.some(c => {
      const keyC = c.phone || c.userId;
      const keyContact = contact.phone || contact.userId;
      return cleanPhone(keyC) === cleanPhone(keyContact);
    });

    if (isSelected) {
      setSelectedContactsTemp(selectedContactsTemp.filter(c => {
        const keyC = c.phone || c.userId;
        const keyContact = contact.phone || contact.userId;
        return cleanPhone(keyC) !== cleanPhone(keyContact);
      }));
    } else {
      setSelectedContactsTemp([...selectedContactsTemp, contact]);
    }
  };

  const confirmContactsSelection = () => {
    if (isAddingToList) {
      setNewListContacts(
        selectedContactsTemp.map(c => {
          const isUuid = c.phone.includes('-') && c.phone.length > 20;
          return { ...c, phone: isUuid ? c.phone : normalizePhone(c.phone) };
        })
      );
    } else {
      // Preservar a los dueños (owners) para que no se pierdan al re-seleccionar contactos
      const currentOwners = (members || []).filter(m => m.role === 'owner');

      // Mapear los seleccionados (evitando duplicar al owner si ya estaba, ya sea por UUID o por número de teléfono)
      const newFromContacts = selectedContactsTemp
        .map(c => {
          const isUuid = c.phone && c.phone.includes('-') && c.phone.length > 20;
          const targetUserId = isUuid ? c.phone : (c.userId || normalizePhone(c.phone));
          return {
            userId: targetUserId,
            phone: isUuid ? undefined : (c.phone ? normalizePhone(c.phone) : undefined),
            displayName: c.name,
            role: 'member'
          };
        })
        .filter(nc => {
          const isOwnerUuid = currentOwners.some(o => o.userId === nc.userId);
          const isOwnerPhone = user?.phoneNumber && (cleanPhone(nc.userId) === cleanPhone(user.phoneNumber) || (nc.phone && cleanPhone(nc.phone) === cleanPhone(user.phoneNumber)));
          return !isOwnerUuid && !isOwnerPhone;
        });

      const mergedMembers = [...currentOwners, ...newFromContacts];

      const seenConfirm = new Set();
      const uniqueConfirmed = mergedMembers.filter(m => {
        const key = getMemberUniqueKey(m);
        if (!key || seenConfirm.has(key)) return false;
        seenConfirm.add(key);
        return true;
      });

      setMembers(uniqueConfirmed);
    }
    setContactModalVisible(false);
  };

  const handleRemoveMember = (userId: string) => {
    const memberToRemove = (members || []).find(m => m.userId === userId);
    const isFirstMember = members?.[0]?.userId === userId;
    const hasAnyOwner = members?.some(m => m.role === 'owner');

    // Bloquear eliminación si es owner O si es el primero de la lista (fallback para creador si falla el rol)
    if (memberToRemove?.role === 'owner' || (!hasAnyOwner && isFirstMember)) {
      Alert.alert('Acción no permitida', 'No podés eliminar al creador de la billetera.');
      return;
    }
    const updated = (members || []).filter(m => m.userId !== userId);
    setMembers(updated);
  };

  const handleSaveList = () => {
    if (!newListLabel.trim() || newListContacts.length === 0) {
      Alert.alert('Opps', 'La lista necesita un nombre y al menos 1 contacto');
      return;
    }

    if (editingListId) {
      setDistributionLists(prev => prev.map(l => l.id === editingListId ? { ...l, name: newListLabel, contacts: newListContacts } : l));
    } else {
      const newList: DistributionList = {
        id: Math.random().toString(),
        name: newListLabel,
        contacts: newListContacts
      };
      setDistributionLists(prev => [...prev, newList]);
    }

    setListModalVisible(false);
    setNewListLabel('');
    setNewListContacts([]);
    setEditingListId(null);
  };

  const handleEditList = (list: DistributionList) => {
    setEditingListId(list.id);
    setNewListLabel(list.name);
    setNewListContacts(list.contacts);
    setListModalVisible(true);
  };

  const handleRemoveList = (id: string) => {
    setDistributionLists(distributionLists.filter(l => l.id !== id));
  };

  const filteredContacts = contactsList.filter(c => {
    // Evitar mostrar el número del creador/owner en la lista de selección para que no se autoinvite
    const isOwnerPhone = user?.phoneNumber && cleanPhone(c.phone) === cleanPhone(user.phoneNumber);
    if (isOwnerPhone) return false;

    const searchLower = contactSearchText.toLowerCase();
    const searchDigits = contactSearchText.replace(/\D/g, '');

    const nameMatch = c.name.toLowerCase().includes(searchLower);
    const phoneMatch = searchDigits.length > 0 && c.phone.replace(/\D/g, '').includes(searchDigits);

    return nameMatch || phoneMatch;
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#171717" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configuración</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
      >

        {activeTab === 'general' && (
          <View>
            {/* Wallet Avatar */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarCircleBig}>
                {avatarUrl ? (
                  <Image source={{ uri: normalizeUrl(avatarUrl) }} style={styles.avatarImg} />
                ) : (
                  <Ionicons name="camera-outline" size={32} color="#A3A3A3" />
                )}
              </View>
              <View style={styles.avatarButtons}>
                <TouchableOpacity style={styles.iconBtn} onPress={() => handlePickImage(false)}>
                  <Ionicons name="image-outline" size={20} color="#171717" />
                  <Text style={styles.iconBtnText}>Galería</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn} onPress={() => handlePickImage(true)}>
                  <Ionicons name="camera-outline" size={20} color="#171717" />
                  <Text style={styles.iconBtnText}>Cámara</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Wallet Name */}
            <View style={styles.section}>
              <Text style={styles.label}>Nombre de la billetera</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Ej: Mi Negocio"
              />
            </View>

            <View style={styles.section}>
              <View style={styles.optionRow}>
                <View style={[styles.optionInfo, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                  <Text style={[styles.optionTitle, { marginBottom: 0 }]}>Dinero disponible</Text>
                  <TouchableOpacity
                    style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#e5e5e5', alignItems: 'center', justifyContent: 'center' }}
                    onPress={() => setInfoModalContent({ title: 'Dinero disponible', description: 'El dinero de esta billetera lo puedo usar en cualquier momento' })}
                  >
                    <Ionicons name="information" size={14} color="#363630" />
                  </TouchableOpacity>
                </View>
                <Switch
                  value={includeInGeneralBalance}
                  onValueChange={setIncludeInGeneralBalance}
                  trackColor={{ false: '#E5E5E5', true: '#10B981' }}
                  thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : includeInGeneralBalance ? '#FFFFFF' : '#F5F5F5'}
                />
              </View>
            </View>

            {/* Default Transaction Type */}
            <View style={styles.section}>
              <View style={[styles.optionInfo, { marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                <Text style={[styles.optionTitle, { marginBottom: 0 }]}>Movimiento por defecto</Text>
                <TouchableOpacity
                  style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#e5e5e5', alignItems: 'center', justifyContent: 'center' }}
                  onPress={() => setInfoModalContent({ title: 'Movimiento por defecto', description: 'Predefinido cada vez que ingreso un ticket a esta billetera' })}
                >
                  <Ionicons name="information" size={14} color="#363630" />
                </TouchableOpacity>
              </View>
              <View style={styles.transactionTypeRow}>
                <TouchableOpacity
                  style={[
                    styles.typeCard,
                    defaultTransactionType === 'expense' && styles.typeCardExpenseActive
                  ]}
                  onPress={() => setDefaultTransactionType('expense')}
                >
                  <Text style={[
                    styles.typeCardLabel,
                    defaultTransactionType === 'expense' && styles.typeCardLabelActive
                  ]}>Pago</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeCard,
                    defaultTransactionType === 'income' && styles.typeCardIncomeActive
                  ]}
                  onPress={() => setDefaultTransactionType('income')}
                >
                  <Text style={[
                    styles.typeCardLabel,
                    defaultTransactionType === 'income' && styles.typeCardLabelActive
                  ]}>Cobro</Text>
                </TouchableOpacity>


              </View>
            </View>

            <View style={styles.section}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
                <Text style={[styles.label, { marginTop: 0 }]}>Procedimiento de pago o cobro por defecto</Text>
                <TouchableOpacity
                  style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#e5e5e5', alignItems: 'center', justifyContent: 'center' }}
                  onPress={() => setInfoModalContent({ title: 'Procedimiento de pago o cobro por defecto', description: 'Instrucciones que verán mis contactos de como se hace el pago.' })}
                >
                  <Ionicons name="information" size={14} color="#363630" />
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top', paddingTop: 12, marginTop: 8 }]}
                value={defaultPaymentMethod}
                onChangeText={setDefaultPaymentMethod}
                placeholder="Ej: CBU 2234... o Efectivo"
                multiline={true}
                maxLength={500}
              />
            </View>

            <View style={styles.section}>
              <View style={[styles.optionRow, { marginTop: 12 }]}>
                <View style={[styles.optionInfo, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                  <Text style={[styles.optionTitle, { marginBottom: 0 }]}>Asistente de cobranza por defecto</Text>
                  <TouchableOpacity
                    style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#e5e5e5', alignItems: 'center', justifyContent: 'center' }}
                    onPress={() => setInfoModalContent({ title: 'Asistente de cobranza', description: 'Usar procedimientos para ayudarme a recordar y cobrar los tickets' })}
                  >
                    <Ionicons name="information" size={14} color="#363630" />
                  </TouchableOpacity>
                </View>
                <Switch
                  value={helpToCollect}
                  onValueChange={setHelpToCollect}
                  trackColor={{ false: '#E5E5E5', true: '#10B981' }}
                  thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : helpToCollect ? '#FFFFFF' : '#F5F5F5'}
                />
              </View>
            </View>
          </View>
        )}

        {activeTab === 'members' && (
          <View>
            {/* Members Management */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.label}>Contactos Miembro</Text>
                <TouchableOpacity onPress={() => handlePickContact(false)} style={styles.addMemberBtn}>
                  <Ionicons name="person-add-outline" size={18} color="#171717" />
                  <Text style={styles.addMemberBtnText}>Invitar</Text>
                </TouchableOpacity>
              </View>

              {members && members.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.listCarousel}
                  snapToInterval={112}
                  decelerationRate="fast"
                >
                  {members.map((item) => {
                    const identifier = (item as any).phone || item.userId;
                    const avatarUrl = getSmartAvatarUrl(identifier, item.avatarUrl);
                    const displayName = getSmartDisplayName(identifier, item.displayName);
                    const hasAnyOwner = members.some(m => m.role === 'owner');
                    const isCreatorFallback = !hasAnyOwner && members.indexOf(item) === 0;
                    const isOwner = item.role === 'owner' || isCreatorFallback;

                    return (
                      <View key={item.userId} style={styles.memberCard}>
                        {avatarUrl ? (
                          <Image
                            source={{ uri: normalizeUrl(avatarUrl) }}
                            style={styles.memberAvatarImg}
                          />
                        ) : (
                          <View style={styles.memberAvatarPlaceholder}>
                            <Text style={styles.avatarTextHeader}>
                              {(displayName || '?').charAt(0)}
                            </Text>
                          </View>
                        )}
                        {!isOwner && (
                          <TouchableOpacity
                            onPress={() => handleRemoveMember(item.userId)}
                            style={styles.memberDeleteBtn}
                            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                          >
                            <Ionicons name="close" size={16} color="#737373" />
                          </TouchableOpacity>
                        )}
                        {isOwner && (
                          <View style={styles.ownerBadge}>
                            <Text style={styles.ownerBadgeText}>Creador</Text>
                          </View>
                        )}
                        <Text style={styles.memberNameCard} numberOfLines={1}>
                          {displayName}
                        </Text>
                      </View>
                    );
                  })}
                </ScrollView>
              ) : (
                <TouchableOpacity onPress={() => handlePickContact(false)} style={styles.emptyListPlaceholder}>
                  <Ionicons name="add-circle-outline" size={24} color="#A3A3A3" />
                  <Text style={styles.emptyListText}>Invitar miembros a esta billetera</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Distribution Lists */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.label}>Listas de Contactos</Text>
                <TouchableOpacity onPress={() => {
                  setEditingListId(null);
                  setNewListLabel('');
                  setNewListContacts([]);
                  setListModalVisible(true);
                }} style={styles.addMemberBtn}>
                  <Ionicons name="layers-outline" size={18} color="#171717" />
                  <Text style={styles.addMemberBtnText}>Nueva lista</Text>
                </TouchableOpacity>
              </View>

              {distributionLists.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.listCarousel}
                  snapToInterval={132}
                  decelerationRate="fast"
                  snapToAlignment="start"
                >
                  {distributionLists.map(list => (
                    <View
                      key={list.id}
                      style={styles.listCard}
                    >
                      <TouchableOpacity
                        style={styles.listCardContentArea}
                        onPress={() => handleEditList(list)}
                        activeOpacity={0.6}
                      >
                        <Text style={styles.listCardTitle} numberOfLines={2}>{list.name}</Text>
                        <Text style={styles.listCardCount}>{list.contacts.length} contactos</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleRemoveList(list.id)}
                        style={styles.memberDeleteBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="close" size={16} color="#737373" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <TouchableOpacity onPress={() => setListModalVisible(true)} style={styles.emptyListPlaceholder}>
                  <Ionicons name="add-circle-outline" size={24} color="#A3A3A3" />
                  <Text style={styles.emptyListText}>Crear una lista para envíos rápidos</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {activeTab === 'advanced' && (
          <View>
            {/* Threshold Cards */}
            <View style={styles.section}>
              <Text style={styles.label}>Límites de Saldo</Text>
              <View style={{ gap: 12, marginTop: 12 }}>
                <View style={[styles.thresholdCard, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
                  <View style={styles.thresholdHeader}>
                    <Ionicons name="warning" size={20} color="#D97706" />
                    <Text style={[styles.thresholdTitle, { color: '#92400E', fontFamily: FontFamily.bold, marginLeft: 8 }]}>Alerta temprana</Text>
                  </View>
                  <View style={[styles.thresholdInputWrapper, { backgroundColor: '#FEFCE8' }]}>
                    <Text style={styles.thresholdCurrencySymbol}>$</Text>
                    <TextInput
                      style={styles.thresholdInput}
                      value={warningThreshold}
                      onChangeText={t => setWarningThreshold(formatAmount(t))}
                      placeholder="0"
                      keyboardType="numeric"
                      placeholderTextColor="#D97706"
                    />
                  </View>
                </View>

                <View style={[styles.thresholdCard, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                  <View style={styles.thresholdHeader}>
                    <Ionicons name="notifications" size={20} color="#DC2626" />
                    <Text style={[styles.thresholdTitle, { color: '#991B1B', fontFamily: FontFamily.bold, marginLeft: 8 }]}>Saldo crítico</Text>
                  </View>
                  <View style={[styles.thresholdInputWrapper, { backgroundColor: '#FFF1F2' }]}>
                    <Text style={styles.thresholdCurrencySymbol}>$</Text>
                    <TextInput
                      style={styles.thresholdInput}
                      value={alertThreshold}
                      onChangeText={t => setAlertThreshold(formatAmount(t))}
                      placeholder="0"
                      keyboardType="numeric"
                      placeholderTextColor="#DC2626"
                    />
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'categories' && (
          <View>
            {/* Categories Selection */}
            <View style={styles.section}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.label}>Categorías y Rubros</Text>
                <TouchableOpacity
                  style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#e5e5e5', alignItems: 'center', justifyContent: 'center' }}
                  onPress={() => setInfoModalContent({ title: 'Categorías y Rubros', description: 'Activa o desactiva los rubros que deseas ver en esta billetera.' })}
                >
                  <Ionicons name="information" size={14} color="#363630" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.actionBtn, { marginTop: 16 }]}
                onPress={() => navigation.navigate('WalletCategories', { walletId })}
              >
                <View style={styles.actionBtnInfo}>
                  <View style={styles.actionBtnIcon}>
                    <Ionicons name="list-outline" size={22} color="#171717" />
                  </View>
                  <View>
                    <Text style={styles.actionBtnTitle}>Gestionar Categorías</Text>
                    <Text style={styles.actionBtnCaption}>Elige qué rubros utilizar</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#A3A3A3" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.tabSelectorRow}>
        <TouchableOpacity
          style={[styles.tabCircleBtn, activeTab === 'general' && styles.tabCircleBtnActive]}
          onPress={() => setActiveTab('general')}
        >
          <Ionicons name="create-outline" size={20} color={activeTab === 'general' ? '#fff' : '#171717'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabCircleBtn, activeTab === 'members' && styles.tabCircleBtnActive]}
          onPress={() => setActiveTab('members')}
        >
          <Ionicons name="people-outline" size={20} color={activeTab === 'members' ? '#fff' : '#171717'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabCircleBtn, activeTab === 'advanced' && styles.tabCircleBtnActive]}
          onPress={() => setActiveTab('advanced')}
        >
          <Ionicons name="cash-outline" size={20} color={activeTab === 'advanced' ? '#fff' : '#171717'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabCircleBtn, activeTab === 'categories' && styles.tabCircleBtnActive]}
          onPress={() => setActiveTab('categories')}
        >
          <Ionicons name="grid-outline" size={20} color={activeTab === 'categories' ? '#fff' : '#171717'} />
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Button
          label={isSaving ? "Guardando..." : "Guardar cambios"}
          onPress={handleSave}
          disabled={isSaving}
        />
      </View>

      {/* Create List Modal */}
      <Modal visible={isListModalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalBg}>
          <View style={styles.modalHeaderHeader}>
            <TouchableOpacity onPress={() => { setListModalVisible(false); setNewListContacts([]); setNewListLabel(''); setEditingListId(null); }}>
              <Ionicons name="close" size={24} color="#171717" />
            </TouchableOpacity>
            <Text style={styles.modalTitleMain}>{editingListId ? 'Editar Lista' : 'Nueva Lista de Contactos'}</Text>
            <TouchableOpacity
              onPress={handleSaveList}
              disabled={!newListLabel.trim() || newListContacts.length === 0}
            >
              <Text style={{ fontFamily: FontFamily.bold, color: (!newListLabel.trim() || newListContacts.length === 0) ? Colors.textTertiary : Colors.textSecondary }}>
                {editingListId ? 'Guardar' : 'Crear'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ padding: 20 }}>
            <Text style={styles.label}>Nombre de la lista</Text>
            <TextInput
              style={styles.input}
              value={newListLabel}
              onChangeText={setNewListLabel}
              placeholder="Ej: Clientes Frecuentes"
            />

            <View style={[styles.sectionHeader, { marginTop: 24 }]}>
              <Text style={styles.label}>Contactos ({newListContacts.length})</Text>
              <TouchableOpacity onPress={() => handlePickContact(true)} style={styles.addMemberBtn}>
                <Ionicons name="add" size={18} color="#171717" />
                <Text style={styles.addMemberBtnText}>Agregar Contactos</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={newListContacts}
              keyExtractor={item => item.phone}
              renderItem={({ item }) => (
                <View style={styles.memberRowSmall}>
                  <Text style={styles.memberNameSmall}>{item.name}</Text>
                  <TouchableOpacity onPress={() => setNewListContacts(newListContacts.filter(c => c.phone !== item.phone))}>
                    <Ionicons name="close-circle" size={18} color="#D1D5DB" />
                  </TouchableOpacity>
                </View>
              )}
              style={{ maxHeight: 300, marginTop: 12 }}
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* Contact Selection Modal */}
      <Modal visible={isContactModalVisible} animationType="slide" presentationStyle="formSheet">
        <SafeAreaView style={styles.contactModal}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <View style={styles.modalHeaderHeader}>
              <TouchableOpacity onPress={() => setContactModalVisible(false)}>
                <Text style={{ fontFamily: FontFamily.medium, color: Colors.textSecondary }}>Cancelar</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitleMain}>Contactos</Text>
              <TouchableOpacity onPress={confirmContactsSelection}>
                <Text style={{ fontFamily: FontFamily.bold, color: '#16A34A' }}>Listo</Text>
              </TouchableOpacity>
            </View>

            <View style={{ padding: 16 }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#F5F5F5',
                borderRadius: 24,
                paddingHorizontal: 16,
                height: 48,
              }}>
                <Ionicons name="search" size={18} color="#A3A3A3" style={{ marginRight: 8 }} />
                <TextInput
                  style={{
                    flex: 1,
                    fontSize: 15,
                    fontFamily: FontFamily.regular,
                    color: '#171717',
                    outlineStyle: 'none' as any,
                  }}
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
                  {selectedContactsTemp.map(c => (
                    <TouchableOpacity
                      key={c.phone}
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
                  ))}
                </ScrollView>
              </View>
            )}

            <FlatList
              data={filteredContacts}
              keyExtractor={item => item.phone}
              renderItem={({ item }) => {
                const isSelected = selectedContactsTemp.some(c => {
                  const keyC = c.phone || c.userId;
                  return cleanPhone(keyC) === cleanPhone(item.phone);
                });
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
            />
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* ── Info Modal ── */}
      <Modal
        visible={!!infoModalContent}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoModalContent(null)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 }}
          activeOpacity={1}
          onPress={() => setInfoModalContent(null)}
        >
          <TouchableOpacity activeOpacity={1} style={{ backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '100%', maxWidth: 400, alignItems: 'center' }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#e5e5e5', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Ionicons name="information" size={24} color="#363630" />
            </View>
            <Text style={{ fontSize: 18, color: '#363630', fontFamily: FontFamily.bold, textAlign: 'center', marginBottom: 8 }}>{infoModalContent?.title}</Text>
            <Text style={{ fontSize: 15, color: '#878778', fontFamily: FontFamily.regular, textAlign: 'center', marginBottom: 24, lineHeight: 22 }}>
              {infoModalContent?.description}
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: '#196342', borderRadius: 100, width: '100%', paddingVertical: 14, alignItems: 'center' }}
              onPress={() => setInfoModalContent(null)}
            >
              <Text style={{ color: '#fff', fontSize: 15, fontFamily: FontFamily.bold }}>Entendido</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontFamily: FontFamily.bold, color: '#171717' },
  scrollContent: { padding: 20, paddingBottom: 40 },

  tabSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  tabCircleBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  tabCircleBtnActive: {
    backgroundColor: '#363630',
    borderColor: '#363630',
    elevation: 4,
    ...Platform.select({
      web: { boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
      }
    }),
  },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatarCircleBig: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F3F4F6' },
  avatarImg: { width: 100, height: 100, borderRadius: 50 },
  editBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#171717', width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'white' },
  avatarHint: { fontSize: 13, color: '#737373', marginTop: 8, fontFamily: FontFamily.medium },

  section: { marginBottom: 32 },
  label: { fontSize: 14, fontFamily: FontFamily.bold, color: '#171717', marginBottom: 8 },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: FontFamily.regular,
    outlineStyle: 'none' as any,
  },
  inputSubtitle: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
    color: '#737373',
    marginBottom: 4,
    lineHeight: 16,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  addMemberBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addMemberBtnText: { fontSize: 14, fontFamily: FontFamily.medium, color: '#171717' },

  // List Carousel
  listCarousel: { gap: 12, paddingRight: 20 },
  listCard: {
    width: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    ...Platform.select({
      web: { boxShadow: '0px 2px 5px rgba(0, 0, 0, 0.05)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 1,
      }
    }),
    elevation: 1,
    position: 'relative',
    overflow: 'visible'
  },
  listCardContentArea: {
    padding: 10,
    flex: 1,
  },
  listCardHeaderSimple: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  listCardTitle: { fontSize: 13, fontFamily: FontFamily.bold, color: '#171717', flex: 1, marginRight: 4 },
  listCardCount: { fontSize: 11, color: '#737373', marginTop: 2 },
  emptyListPlaceholder: { height: 100, borderRadius: 16, borderStyle: 'dotted', borderWidth: 1, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyListText: { fontSize: 13, color: '#A3A3A3', fontFamily: FontFamily.medium },

  membersList: { gap: 12 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FAFAFA', padding: 12, borderRadius: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontFamily: FontFamily.bold, color: '#171717' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontFamily: FontFamily.bold, color: '#171717' },
  memberId: { fontSize: 12, color: '#737373' },
  deleteMemberBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E5E5' },

  emptyText: { color: '#A3A3A3', textAlign: 'center', padding: 12 },

  memberCard: {
    width: 80,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    ...Platform.select({
      web: { boxShadow: '0px 2px 5px rgba(0, 0, 0, 0.05)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 1,
      }
    }),
    elevation: 1,
  },
  memberAvatarBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 6,
    position: 'relative'
  },
  memberAvatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6'
  },
  memberAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5'
  },
  avatarTextHeader: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    color: '#171717'
  },
  memberDeleteBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 10,
    padding: 2,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 10
  },
  memberNameCard: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
    color: '#171717',
    textAlign: 'center'
  },

  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optionInfo: { flex: 1, marginRight: 16 },
  optionTitle: { fontSize: 15, fontFamily: FontFamily.bold, color: '#171717' },
  optionCaption: { fontSize: 13, color: '#737373', marginTop: 2 },

  footer: { padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F5F5F5' },

  modalBg: { flex: 1, backgroundColor: '#FFF' },
  modalHeaderHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, justifyContent: 'space-between' },
  modalTitleMain: { fontSize: 17, fontFamily: FontFamily.bold },
  memberRowSmall: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F9FAFB', padding: 10, borderRadius: 10, marginBottom: 8 },
  memberNameSmall: { fontSize: 14, fontFamily: FontFamily.medium, color: '#171717' },

  contactModal: { flex: 1, backgroundColor: '#FFF' },
  searchBar: {
    height: 48,
    backgroundColor: '#F5F5F5',
    margin: 16,
    borderRadius: 24,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: FontFamily.regular,
    color: '#171717',
    outlineStyle: 'none' as any,
  },
  contactRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  contactAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EEE', alignItems: 'center', justifyContent: 'center' },
  contactName: { fontSize: 16, fontFamily: FontFamily.bold },
  contactPhone: { fontSize: 13, color: '#737373' },
  thresholdCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  thresholdHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  thresholdTitle: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
  },
  thresholdInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 12,
    height: 48,
  },
  thresholdCurrencySymbol: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
    color: '#171717',
    marginRight: 4,
  },
  thresholdInput: {
    flex: 1,
    fontSize: 20,
    fontFamily: FontFamily.bold,
    color: '#171717',
    paddingRight: 8,
    textAlign: 'right',
    outlineStyle: 'none' as any,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171717',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  selectedChipText: {
    color: 'white',
    fontSize: 13,
    fontFamily: FontFamily.medium,
  },
  avatarButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginTop: 16,
  },
  iconBtnText: {
    fontSize: 14,
    fontFamily: FontFamily.medium,
    color: '#171717',
  },
  ownerBadge: {
    position: 'absolute',
    top: -4,
    backgroundColor: '#171717',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  ownerBadgeText: {
    color: 'white',
    fontSize: 8,
    fontFamily: FontFamily.bold,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'PlusJakarta-Medium',
  },
  transactionTypeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeCard: {
    flex: 1,
    height: 30,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#FAFAFA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  typeCardIncomeActive: {
    backgroundColor: '#3A9E76',
    borderColor: '#16A34A',
  },
  typeCardExpenseActive: {
    backgroundColor: '#C05050',
    borderColor: '#DC2626',
  },
  typeCardLabel: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
    color: '#737373',
  },
  typeCardLabelActive: {
    color: '#FFFFFF',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAFAFA',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginTop: 8,
  },
  actionBtnInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionBtnIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  actionBtnTitle: {
    fontSize: 15,
    fontFamily: FontFamily.bold,
    color: '#171717',
  },
  actionBtnCaption: {
    fontSize: 12,
    color: '#737373',
    fontFamily: FontFamily.medium,
  },
});
