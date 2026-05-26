import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  TextInput, KeyboardAvoidingView, Platform, Modal, FlatList, Switch,
  ScrollView, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Animated, Image, TouchableWithoutFeedback } from 'react-native';
import { getContacts } from '@/services/contacts.service';

import { useAuthStore } from '@/store/auth.store';
import { walletsApi, WalletMember } from '@/api/wallets.api';
import { getSmartDisplayName } from '@/utils/userDisplay';
import { getLocalWallets, saveLocalWallets, LocalWallet } from '@/storage/wallets.local';
import { Colors, FontFamily, Shadows, BorderRadius, Spacing } from '@/constants/theme';
import { Typography, Button, Input } from '@/components/ui';

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
];

type AddWalletStackParamList = {
  AddWalletStep1: undefined;
  AddWalletStep2: { walletType: string; defaultPaymentMethod?: string; currency?: string; helpToCollect?: boolean };
  AddWalletStep3: { walletType: string; walletName: string; defaultPaymentMethod?: string; currency?: string; helpToCollect?: boolean };
};

const CURRENCIES = [
  { code: 'USD', name: 'Dólar Estadounidense' },
  { code: 'ARS', name: 'Peso Argentino' },
  { code: 'BOB', name: 'Boliviano (Bolivia)' },
  { code: 'BRL', name: 'Real Brasileño' },
  { code: 'CLP', name: 'Peso Chileno' },
  { code: 'COP', name: 'Peso Colombiano' },
  { code: 'CRC', name: 'Colón Costarricense' },
  { code: 'CUP', name: 'Peso Cubano' },
  { code: 'DOP', name: 'Peso Dominicano' },
  { code: 'GTQ', name: 'Quetzal Guatemalteco' },
  { code: 'HNL', name: 'Lempira Hondureño' },
  { code: 'HTG', name: 'Gourde Haitiano' },
  { code: 'MXN', name: 'Peso Mexicano' },
  { code: 'NIO', name: 'Córdoba Nicaragüense' },
  { code: 'PAB', name: 'Balboa Panameño' },
  { code: 'PEN', name: 'Sol Peruano' },
  { code: 'PYG', name: 'Guaraní Paraguayo' },
  { code: 'UYU', name: 'Peso Uruguayo' },
  { code: 'VES', name: 'Bolívar Venezolano' },
];

const WALLET_LABELS: Record<string, { title: string; label: string; placeholder: string }> = {
  hogar: { title: '¿Cómo se llama tu casa?', label: 'Nombre del hogar', placeholder: 'Mi casa, Casa familiar...' },
  negocio: { title: '¿Cómo se llama tu negocio?', label: 'Nombre del negocio', placeholder: 'Peluquería Ana' },
  compartido: { title: '¿Cómo se llaman los gastos?', label: 'Nombre del grupo', placeholder: 'Gastos con Lean, Casa compartida...' },
  otro: { title: '¿Cómo se llama mi billetera?', label: 'Nombre de la billetera', placeholder: 'Mi billetera...' },
};

type Nav = NativeStackNavigationProp<AddWalletStackParamList, 'AddWalletStep2'>;
type Route = RouteProp<AddWalletStackParamList, 'AddWalletStep2'>;

const formatAmount = (val: string) => {
  const numeric = val.replace(/\D/g, '');
  if (!numeric) return '';
  return numeric.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

export const AddWalletStep2Screen: React.FC<{ onFinish?: (message?: string) => void }> = ({ onFinish }) => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { walletType } = route.params;
  const user = useAuthStore(s => s.user);
  const [name, setName] = useState('');
  const [focused, setFocused] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(user?.defaultPaymentProcedure || '');
  const [currency, setCurrency] = useState(user?.currency || 'USD');
  const [isCurrencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [helpToCollect, setHelpToCollect] = useState(walletType !== 'personal');
  const [warningThreshold, setWarningThreshold] = useState('');
  const [alertThreshold, setAlertThreshold] = useState('');
  const [members, setMembers] = useState<WalletMember[]>([]);
  const [isContactModalVisible, setContactModalVisible] = useState(false);
  const [contactsList, setContactsList] = useState<ContactInfo[]>([]);
  const [contactSearchText, setContactSearchText] = useState('');
  const [selectedContactsTemp, setSelectedContactsTemp] = useState<ContactInfo[]>([]);
  const [includeInGeneralBalance, setIncludeInGeneralBalance] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const handlePickContact = async () => {
    // Initialize temporary selection with current contacts
    setSelectedContactsTemp(members.map(m => ({ name: m.displayName, phone: m.userId })));

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
    const isSelected = selectedContactsTemp.some(c => c.phone === contact.phone);
    if (isSelected) {
      setSelectedContactsTemp(selectedContactsTemp.filter(c => c.phone !== contact.phone));
    } else {
      setSelectedContactsTemp([...selectedContactsTemp, contact]);
    }
  };

  const confirmContactsSelection = () => {
    const normalize = (p: string) => p.replace(/[^\d+]/g, '');
    const newMembers = selectedContactsTemp.map(c => ({ 
      userId: normalize(c.phone), 
      displayName: c.name, 
      role: 'member' 
    }));
    setMembers(newMembers);
    setContactModalVisible(false);
  };

  const handleRemoveMember = (userId: string) => {
    setMembers(members.filter(m => m.userId !== userId));
  };

  const filteredContacts = contactsList.filter(c => {
    const searchLower = contactSearchText.toLowerCase();
    const searchDigits = contactSearchText.replace(/\D/g, '');
    
    const nameMatch = c.name.toLowerCase().includes(searchLower);
    const phoneMatch = searchDigits.length > 0 && c.phone.replace(/\D/g, '').includes(searchDigits);
    
    return nameMatch || phoneMatch;
  });

  const config = WALLET_LABELS[walletType] ?? WALLET_LABELS['otro'];
  const MAX = 60;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.progressWrapper}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '100%', backgroundColor: Colors.primary }]} />
            </View>
            <Typography variant="captionBase" color="tertiary">2 de 2</Typography>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Content */}
        <ScrollView 
          style={{ flex: 1 }} 
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Typography variant="headingH1" style={{ marginBottom: Spacing.xs }}>{config.title}</Typography>
          <Typography variant="bodyLarge" color="secondary" style={{ marginBottom: Spacing.xxl }}>
            {walletType === 'negocio' || walletType === 'negocio'
              ? 'Ej: Peluqueria Ana, Mi taller, Cortes de Claudia'
              : 'Podés cambiarlo más adelante.'}
          </Typography>

          <Typography variant="labelSmall" color="secondary" style={{ marginBottom: Spacing.xs }}>{config.label}</Typography>
          <View style={[styles.inputRow, focused && styles.inputRowFocused]}>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={(t) => setName(t.slice(0, MAX))}
              placeholder={config.placeholder}
              placeholderTextColor={Colors.textTertiary}
              autoFocus
              maxLength={MAX}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
            {name.length > 0 && (
              <TouchableOpacity onPress={() => setName('')} style={styles.clearBtn}>
                <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
          <Typography variant="captionBase" color="tertiary" align="right" style={{ marginTop: 4 }}>
            {name.length}/{MAX}
          </Typography>

          <Typography variant="labelSmall" color="secondary" style={{ marginTop: Spacing.xxl, marginBottom: Spacing.xs }}>Moneda de la billetera</Typography>
          <TouchableOpacity 
            style={[styles.inputRow, { justifyContent: 'space-between' }]}
            activeOpacity={0.7}
            onPress={() => setCurrencyModalVisible(true)}
          >
            <Typography variant="labelBase">
              {CURRENCIES.find(c => c.code === currency)?.name || currency} ({currency})
            </Typography>
            <Ionicons name="chevron-down" size={20} color={Colors.textTertiary} />
          </TouchableOpacity>

          {/* Members Management */}
          <View style={{ marginTop: Spacing.xxl, marginBottom: Spacing.xxl }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md }}>
              <Typography variant="labelSmall" color="secondary">Miembros invitados</Typography>
              <TouchableOpacity onPress={handlePickContact} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="person-add-outline" size={18} color={Colors.primary} />
                <Typography variant="labelSmall" color="primary" style={{ fontFamily: FontFamily.semibold }}>Invitar</Typography>
              </TouchableOpacity>
            </View>
            
            {members.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {members.map((item) => {
                    const displayName = getSmartDisplayName(item.userId, item.displayName);
                    return (
                    <View key={item.userId} style={styles.memberCardSmall}>
                      <View style={styles.memberAvatarSmall}>
                        <Typography variant="labelBase" color="secondary">
                          {displayName.charAt(0)}
                        </Typography>
                      </View>
                      <TouchableOpacity 
                        style={styles.memberDeleteIcon}
                        onPress={() => handleRemoveMember(item.userId)}
                      >
                        <Ionicons name="close-circle" size={16} color={Colors.textTertiary} />
                      </TouchableOpacity>
                      <Typography variant="captionBase" color="secondary" numberOfLines={1}>{displayName.split(' ')[0]}</Typography>
                    </View>
                    );
                  })}
              </ScrollView>
            ) : (
              <TouchableOpacity 
                onPress={handlePickContact} 
                style={[styles.emptyMembersBox, { borderColor: Colors.strokeSubtle, backgroundColor: Colors.surface }]}
              >
                <Ionicons name="people-outline" size={24} color={Colors.textTertiary} />
                <Typography variant="captionBase" color="tertiary">Compartí esta billetera con otros</Typography>
              </TouchableOpacity>
            )}
          </View>

          <Typography variant="labelSmall" color="secondary" style={{ marginTop: Spacing.xxl, marginBottom: Spacing.xs }}>Procedimiento de pago por defecto (Opcional)</Typography>
          <View style={[styles.inputRow, { height: 100, alignItems: 'flex-start', paddingVertical: 12 }]}>
            <TextInput
              style={[styles.input, { textAlignVertical: 'top' }]}
              value={paymentMethod}
              onChangeText={setPaymentMethod}
              placeholder="Ej: CVU o Efectivo"
              placeholderTextColor="#A3A3A3"
              multiline={true}
            />
          </View>
          
          <View style={{ marginTop: Spacing.xxl, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, padding: 16, borderRadius: BorderRadius.card, marginBottom: Spacing.xxl, ...Shadows.card }}>
            <View style={{ flex: 1, marginRight: 16 }}>
              <Typography variant="labelSmall" color="secondary" style={{ fontFamily: FontFamily.semibold }}>Ayudame a cobrar los tickets de esta billetera</Typography>
              <Typography variant="captionBase" color="tertiary" style={{ marginTop: 2 }}>Usa procedimientos para ayudarme a recordar y cobrar los tickets</Typography>
            </View>
            <Switch
              value={helpToCollect}
              onValueChange={setHelpToCollect}
              trackColor={{ false: Colors.strokeSubtle, true: Colors.primary }}
              thumbColor={Colors.white}
            />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, padding: 16, borderRadius: BorderRadius.card, marginBottom: Spacing.xxl, ...Shadows.card }}>
            <View style={{ flex: 1, marginRight: 16 }}>
              <Typography variant="labelSmall" color="secondary" style={{ fontFamily: FontFamily.semibold }}>Dinero para usar</Typography>
              <Typography variant="captionBase" color="tertiary" style={{ marginTop: 2 }}>El saldo de esta billetera sumará o restará a tu saldo total en el Resumen</Typography>
            </View>
            <Switch
              value={includeInGeneralBalance}
              onValueChange={setIncludeInGeneralBalance}
              trackColor={{ false: Colors.strokeSubtle, true: Colors.primary }}
              thumbColor={Colors.white}
            />
          </View>

          {/* Threshold Cards */}
          <Typography variant="labelSmall" color="secondary" style={{ marginTop: Spacing.xxl, marginBottom: Spacing.md }}>Límites de Saldo</Typography>
          <View style={{ gap: 12, marginBottom: Spacing.xxl }}>
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
                  onChangeText={(t) => setWarningThreshold(formatAmount(t))}
                  placeholder="0"
                  keyboardType="numeric"
                  placeholderTextColor="#D97706"
                  maxLength={12}
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
                  onChangeText={(t) => setAlertThreshold(formatAmount(t))}
                  placeholder="0"
                  keyboardType="numeric"
                  placeholderTextColor="#DC2626"
                  maxLength={12}
                />
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Currency Selector Modal */}
        <Modal visible={isCurrencyModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Seleccionar Moneda</Text>
                <TouchableOpacity onPress={() => setCurrencyModalVisible(false)} style={{ padding: 4 }}>
                  <Ionicons name="close" size={24} color="#171717" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={CURRENCIES}
                keyExtractor={(item) => item.code}
                contentContainerStyle={{ paddingBottom: 40 }}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.currencyItem} 
                    onPress={() => {
                      setCurrency(item.code);
                      setCurrencyModalVisible(false);
                    }}
                  >
                    <Text style={[styles.currencyItemName, currency === item.code && { fontFamily: 'PlusJakarta-Bold' }]}>
                      {item.name} ({item.code})
                    </Text>
                    {currency === item.code && (
                      <Ionicons name="checkmark-circle" size={24} color="#171717" />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>

        {/* Contact Selection Modal */}
        <Modal visible={isContactModalVisible} animationType="slide" presentationStyle="formSheet">
          <SafeAreaView style={styles.contactModal}>
            <View style={styles.modalHeaderHeader}>
              <TouchableOpacity onPress={() => setContactModalVisible(false)}>
                <Text style={{ fontSize: 15, fontFamily: 'PlusJakarta-Medium', color: Colors.textSecondary }}>Cancelar</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitleMain}>Seleccionar Contactos</Text>
              <TouchableOpacity onPress={confirmContactsSelection}>
                <Text style={{ fontSize: 15, fontFamily: 'PlusJakarta-Bold', color: Colors.textSecondary }}>Listo</Text>
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
                  <TouchableOpacity onPress={() => setContactSearchText('')}>
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
                      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#404040', alignItems: 'center', justifyContent: 'center', marginRight: 6 }}>
                         <Text style={{ fontSize: 10, color: 'white', fontFamily: 'PlusJakarta-Bold' }}>{c.name.charAt(0)}</Text>
                      </View>
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
              contentContainerStyle={{ paddingHorizontal: 16 }}
              renderItem={({ item }) => {
                const isSelected = selectedContactsTemp.some(c => c.phone === item.phone);
                return (
                  <TouchableOpacity 
                    style={styles.contactRow} 
                    onPress={() => toggleContactSelection(item)}
                  >
                    <View style={styles.contactAvatar}>
                      <Text style={{ fontSize: 16, fontFamily: 'PlusJakarta-Bold', color: '#737373' }}>
                        {item.name.charAt(0)}
                      </Text>
                    </View>
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
          </SafeAreaView>
        </Modal>

        {/* Footer */}
        <View style={styles.footer}>
          <Button 
            label={isSaving ? 'Guardando...' : 'Confirmar'}
            disabled={!name.trim() || isSaving}
            onPress={async () => {
              if (!name.trim() || isSaving) return;
              setIsSaving(true);
              Alert.alert('DEBUG', 'Paso 0: Iniciando creación...');
              
              const finalName = name.trim();
              let serverId: string | null = null;
              
              try {
                  // 1. Guardar en Server
                Alert.alert('DEBUG', 'Paso 1: Llamando a walletsApi.createWallet...');
                const resp = await walletsApi.createWallet(
                    finalName, 
                    walletType, 
                    paymentMethod || undefined, 
                    currency, 
                    helpToCollect,
                    parseFloat(warningThreshold) || 0,
                    parseFloat(alertThreshold) || 0,
                    undefined,
                    includeInGeneralBalance
                );
                Alert.alert('DEBUG', 'Paso 2: Respuesta del servidor recibida.');
                serverId = (resp as any).id || (resp as any).walletId || 'temp_' + Date.now();

                // 2. Guardar Miembros si existen y tienen ID válido
                const membersToSave = members
                  .filter(m => m.userId && m.userId.trim().length > 0)
                  .map(m => ({ userId: m.userId, displayName: m.displayName }));

                if (membersToSave.length > 0) {
                  Alert.alert('DEBUG', 'Paso 3: Actualizando miembros...');
                  await walletsApi.updateMembers(serverId as string, membersToSave);
                }

                // 3. Guardar en Local (Sync)
                Alert.alert('DEBUG', 'Paso 4: Obteniendo billeteras locales...');
                const current = await getLocalWallets();
                const newWallet: LocalWallet = {
                  id: serverId as string,
                  name: finalName,
                  type: walletType,
                  currency: currency,
                  balance: 0,
                  helpToCollect: helpToCollect,
                  defaultPaymentMethod: paymentMethod,
                  members: [
                    { userId: user?.phoneNumber || 'me', displayName: user?.displayName || 'Yo', role: 'owner' },
                    ...members
                  ],
                  distributionLists: [],
                  warningThreshold: parseFloat(warningThreshold) || 0,
                  alertThreshold: parseFloat(alertThreshold) || 0,
                  includeInGeneralBalance,
                  updatedAt: new Date().toISOString()
                };
                Alert.alert('DEBUG', 'Paso 5: Guardando en almacenamiento local...');
                await saveLocalWallets([...(current || []), newWallet]);

                Alert.alert('DEBUG', 'Paso 6: Finalizando...');
                onFinish?.('Billetera creada con éxito');
              } catch (e: any) {
                console.error(e);
                const errorMsg = e.response?.data?.message || e.message || 'No se pudo crear la billetera en el servidor.';
                Alert.alert('Error', errorMsg);
              } finally {
                setIsSaving(false);
              }
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  progressWrapper: { flex: 1, alignItems: 'center', gap: 6 },
  progressBar: { height: 4, backgroundColor: Colors.strokeSubtle, borderRadius: 99, width: '60%', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 99 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.strokeSubtle,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 14,
    height: 52,
    backgroundColor: Colors.surface,
  },
  inputRowFocused: {
    borderColor: Colors.primary,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: FontFamily.regular,
    color: Colors.textPrimary,
    // @ts-ignore
    outlineStyle: 'none',
  },
  clearBtn: { padding: 4 },
  footer: { paddingHorizontal: 24, paddingBottom: 32, paddingTop: 12, gap: 12 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.strokeSubtle,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: FontFamily.semibold,
    color: Colors.textPrimary,
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.strokeSubtle,
  },
  currencyItemName: {
    fontSize: 16,
    fontFamily: FontFamily.medium,
    color: Colors.textPrimary,
  },
  thresholdCard: {
    borderRadius: BorderRadius.card,
    borderWidth: 1.5,
    padding: Spacing.lg,
  },
  thresholdHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  thresholdInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 52,
    marginBottom: 8,
  },
  thresholdInput: {
    flex: 1,
    fontSize: 24,
    fontFamily: FontFamily.bold,
    color: Colors.textPrimary,
    marginLeft: 4,
    paddingRight: 8,
    textAlign: 'right',
    // @ts-ignore
    outlineStyle: 'none',
  },
  // Member Section Styles
  emptyMembersBox: {
    height: 80,
    borderRadius: BorderRadius.card,
    borderStyle: 'dashed',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  memberCardSmall: {
    width: 70,
    alignItems: 'center',
  },
  memberAvatarSmall: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.strokeSubtle,
    marginBottom: 4,
  },
  memberDeleteIcon: {
    position: 'absolute',
    top: -2,
    right: 8,
    backgroundColor: Colors.white,
    borderRadius: 99,
    ...Shadows.card,
  },
  // Contact Modal Styles
  contactModal: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeaderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.strokeSubtle,
  },
  modalTitleMain: {
    fontSize: 17,
    fontFamily: FontFamily.bold,
    color: Colors.textPrimary,
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
    color: Colors.textPrimary,
    // @ts-ignore
    outlineStyle: 'none',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.strokeSubtle,
    gap: 12,
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.strokeSubtle,
  },
  contactName: {
    fontSize: 15,
    fontFamily: FontFamily.semibold,
    color: Colors.textPrimary,
  },
  contactPhone: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  selectedChipText: {
    fontSize: 13,
    color: Colors.white,
    fontFamily: FontFamily.medium,
  },
});
