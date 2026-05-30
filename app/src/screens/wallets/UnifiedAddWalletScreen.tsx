import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, KeyboardAvoidingView, Platform, Modal, FlatList, Switch,
  Animated, Dimensions, Alert, ActivityIndicator, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getSmartDisplayName } from '@/utils/userDisplay';
import { Colors, FontFamily, Shadows, BorderRadius, Spacing } from '@/constants/theme';
import { Typography, Button } from '@/components/ui';
import { getContacts, PhoneContact, normalizePhone } from '@/services/contacts.service';
import { useAuthStore } from '@/store/auth.store';
import { walletsApi, WalletMember } from '@/api/wallets.api';
import { upsertLocalWallet } from '@/storage/wallets.local';

const formatThousands = (val: string) => {
  const numeric = val.replace(/[^0-9]/g, '');
  if (!numeric) return '';
  return numeric.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const { width } = Dimensions.get('window');

type WalletType = 'personal' | 'negocio_productos' | 'negocio_servicios' | 'compartido' | 'community' | 'otro';

interface WalletOption {
  id: WalletType;
  icon: string;
  label: string;
  description: string;
}

const cleanPhone = (p?: string) => {
  if (!p) return '';
  if (p.includes('-') && p.length > 20) return p; // UUID
  return p.replace(/[^+0-9]/g, '').replace(/^\+/, '');
};

const TYPES: WalletOption[] = [
  { id: 'personal', icon: 'home-outline', label: 'Personal', description: 'Ingresos, gastos del hogar y lo del dia a dia.' },
  { id: 'negocio_productos', icon: 'briefcase-outline', label: 'Negocio de productos', description: 'Las ganancias, los costos y lo que te queda.' },
  { id: 'negocio_servicios', icon: 'construct-outline', label: 'Negocio de servicios', description: 'Tus honorarios, horas trabajadas y gastos fijos.' },
  { id: 'compartido', icon: 'people-outline', label: 'Compartido', description: 'Lo que cada uno pone y lo que se debe.' },
  { id: 'community', icon: 'accessibility-outline', label: 'Comunidad', description: 'Para grupos, asociaciones, eventos o causas comunes.' },
  { id: 'otro', icon: 'folder-outline', label: 'Otro', description: 'Algo que no entra en las categorías anteriores.' },
];

const BALANCE_OPTIONS = [
  { 
    id: 'available', 
    icon: 'wallet-outline', 
    label: 'Dinero para usar', 
    description: 'El saldo sumará a tu total y podrás usarlo para cualquier gasto.' 
  },
  { 
    id: 'locked', 
    icon: 'swap-horizontal-outline', 
    label: 'Necesito transferencia', 
    description: 'El dinero está en una billetera externa y deberás transferirlo a "Cobros sin billetera" para usarlo.' 
  },
];

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
  negocio_productos: { title: '¿Cómo se llama tu negocio?', label: 'Nombre del negocio', placeholder: 'Peluquería Ana' },
  negocio_servicios: { title: '¿Cómo se llama tu negocio?', label: 'Nombre del negocio', placeholder: 'Servicios Profesionales' },
  compartido: { title: '¿Cómo se llaman los gastos?', label: 'Nombre del grupo', placeholder: 'Gastos con Lean, Casa compartida...' },
  community: { title: '¿Cómo se llama tu comunidad?', label: 'Nombre de la comunidad o grupo', placeholder: 'Club de barrio, Asociación civil...' },
  otro: { title: '¿Cómo se llama mi billetera?', label: 'Nombre de la billetera', placeholder: 'Mi billetera...' },
};

export const UnifiedAddWalletScreen: React.FC<{ 
  onFinish?: (message?: string, navParams?: any) => void 
}> = ({ onFinish }) => {
  const navigation = useNavigation();
  const user = useAuthStore(s => s.user);

  // Flow state
  const [step, setStep] = useState(1);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Data state
  const [type, setType] = useState<WalletType | null>(null);
  const [balanceBehavior, setBalanceBehavior] = useState<'available' | 'locked' | null>(null);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState(user?.currency || 'USD');
  const [paymentMethod, setPaymentMethod] = useState(user?.defaultPaymentProcedure || '');
  const [helpToCollect, setHelpToCollect] = useState(true);
  const [members, setMembers] = useState<WalletMember[]>([]);
  const [initialTransactionType, setInitialTransactionType] = useState<'income' | 'expense'>('expense');
  const [warningThreshold, setWarningThreshold] = useState('');
  const [alertThreshold, setAlertThreshold] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // UI state
  const [isCurrencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [isContactModalVisible, setContactModalVisible] = useState(false);
  const [contactsList, setContactsList] = useState<PhoneContact[]>([]);
  const [contactSearchText, setContactSearchText] = useState('');
  const [selectedContactsTemp, setSelectedContactsTemp] = useState<PhoneContact[]>([]);

  const handleNextStep = (next: number) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true
    }).start(() => {
      setStep(next);
      
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true
      }).start();
    });
  };

  const handleBack = () => {
    if (step === 1) {
      if (onFinish) onFinish();
      else navigation.goBack();
    } else {
      handleNextStep(step - 1);
    }
  };

  const handlePickContact = async () => {
    setSelectedContactsTemp(members.map(m => ({ name: m.displayName, phoneNumbers: [m.phone || m.userId], initials: '', id: m.userId })));
    try {
      const data = await getContacts();
      setContactsList(data);
      setContactModalVisible(true);
    } catch (e) {
      Alert.alert('Error', 'No se pudo acceder a los contactos.');
    }
  };

  const toggleContactSelection = (contact: PhoneContact) => {
    const phone = contact.phoneNumbers?.[0] || '';
    const isSelected = selectedContactsTemp.some(c => cleanPhone(c.phoneNumbers?.[0]) === cleanPhone(phone));
    if (isSelected) {
      setSelectedContactsTemp(selectedContactsTemp.filter(c => cleanPhone(c.phoneNumbers?.[0]) !== cleanPhone(phone)));
    } else {
      setSelectedContactsTemp([...selectedContactsTemp, contact]);
    }
  };

  const confirmContactsSelection = () => {
    const newMembers = selectedContactsTemp.map(c => {
      const phone = c.phoneNumbers?.[0] || '';
      const isUuid = phone.includes('-') && phone.length > 20;
      return { 
        userId: isUuid ? phone : normalizePhone(phone), 
        displayName: c.name, 
        role: 'member' 
      };
    });
    setMembers(newMembers);
    setContactModalVisible(false);
  };

  const handleCreateWallet = async () => {
    if (!name.trim() || isSaving) return;
    setIsSaving(true);

    try {
      const finalName = name.trim();
      const includeInGeneralBalance = balanceBehavior === 'available';

      // 1. Server
      const created = await walletsApi.createWallet(
        finalName,
        type!,
        paymentMethod || undefined,
        currency,
        helpToCollect,
        warningThreshold ? parseFloat(warningThreshold.toString().replace(/\./g, '').replace(',', '.')) : undefined,
        alertThreshold ? parseFloat(alertThreshold.toString().replace(/\./g, '').replace(',', '.')) : undefined,
        initialTransactionType,
        includeInGeneralBalance
      );

      // 2. Members (if any)
      if (members.length > 0) {
        await walletsApi.updateMembers(created.id, members.map(m => ({ userId: m.userId, displayName: m.displayName })));
      }

      // 3. Local
      await upsertLocalWallet({
        id: created.id,
        name: finalName,
        type: type!,
        currency,
        defaultPaymentMethod: paymentMethod,
        defaultTransactionType: initialTransactionType,
        helpToCollect,
        includeInGeneralBalance,
        members: [
            { userId: user?.id || 'me', displayName: user?.displayName || 'Yo', role: 'owner' },
            ...members.map(m => ({ userId: m.userId, displayName: m.displayName, role: 'member' }))
        ],
        balance: 0,
        updatedAt: new Date().toISOString(),
      });

      if (onFinish) {
        onFinish('Billetera creada con éxito', { 
          walletId: created.id, 
          walletName: finalName, 
          walletType: type!, 
          currency 
        });
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', 'No se pudo crear la billetera. ' + (err.message || ''));
    } finally {
      setIsSaving(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Typography variant="headingH1" style={{ marginBottom: Spacing.xs }}>¿Con qué quieres{'\n'}empezar?</Typography>
        <Typography variant="bodyLarge" color="secondary" style={{ marginBottom: Spacing.xxl }}>
          Elegí el tipo de billetera y la app se adapta a tu lenguaje.
        </Typography>

        <View style={styles.options}>
          {TYPES.map((opt) => {
            const isSelected = type === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.option, isSelected && styles.optionSelected, Shadows.card]}
                onPress={() => {
                  setType(opt.id);
                  handleNextStep(2);
                }}
              >
                <View style={styles.optionLeft}>
                  <View style={[styles.optionIcon, isSelected && { backgroundColor: Colors.primaryLight }]}>
                    <Ionicons name={opt.icon as any} size={22} color={isSelected ? Colors.primary : Colors.textSecondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Typography variant="labelBase" color={isSelected ? 'primary' : 'secondary'}>{opt.label}</Typography>
                    <Typography variant="captionBase" color="tertiary">{opt.description}</Typography>
                  </View>
                </View>
                <View style={[styles.radio, isSelected && { backgroundColor: Colors.primary, borderColor: Colors.primary }]}>
                  {isSelected && <Ionicons name="checkmark" size={14} color="white" />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={{ height: 10 }} />
      </ScrollView>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Typography variant="headingH1" style={{ marginBottom: Spacing.xs }}>¿Cómo quieres usar{'\n'}este dinero?</Typography>
        <Typography variant="bodyLarge" color="secondary" style={{ marginBottom: Spacing.xxl }}>
          Elegí cómo se comportará el saldo de esta billetera en tu resumen general.
        </Typography>

        <View style={styles.options}>
          {BALANCE_OPTIONS.map((opt) => {
            const isSelected = balanceBehavior === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.option, isSelected && styles.optionSelected, Shadows.card]}
                onPress={() => {
                  setBalanceBehavior(opt.id as any);
                  handleNextStep(3);
                }}
              >
                <View style={styles.optionLeft}>
                  <View style={[styles.optionIcon, isSelected && { backgroundColor: Colors.primaryLight }]}>
                    <Ionicons name={opt.icon as any} size={22} color={isSelected ? Colors.primary : Colors.textSecondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Typography variant="labelBase" color={isSelected ? 'primary' : 'secondary'}>{opt.label}</Typography>
                    <Typography variant="captionBase" color="tertiary">{opt.description}</Typography>
                  </View>
                </View>
                <View style={[styles.radio, isSelected && { backgroundColor: Colors.primary, borderColor: Colors.primary }]}>
                  {isSelected && <Ionicons name="checkmark" size={14} color="white" />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={{ height: 10 }} />
      </ScrollView>
    </View>
  );

  const renderStep3 = () => {
    const config = WALLET_LABELS[type!] ?? WALLET_LABELS['otro'];
    return (
      <View style={styles.stepContainer}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Typography variant="headingH1" style={{ marginBottom: Spacing.xs }}>{config.title}</Typography>
          <Typography variant="bodyLarge" color="secondary" style={{ marginBottom: Spacing.xxl }}>
            {type === 'negocio_productos' || type === 'negocio_servicios'
              ? 'Ej: Peluqueria Ana, Mi taller, Cortes de Claudia'
              : 'Podés cambiarlo más adelante.'}
          </Typography>

          <Typography variant="labelSmall" color="secondary" style={{ marginBottom: Spacing.xs }}>{config.label}</Typography>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={config.placeholder}
            placeholderTextColor={Colors.textTertiary}
            maxLength={40}
          />

          <View style={styles.section}>
             <Typography variant="labelSmall" color="secondary" style={{ marginBottom: Spacing.xs }}>Moneda</Typography>
             <TouchableOpacity style={styles.selector} onPress={() => setCurrencyModalVisible(true)}>
                <Text style={styles.selectorText}>{CURRENCIES.find(c => c.code === currency)?.name || currency}</Text>
                <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
             </TouchableOpacity>
          </View>

          <View style={styles.section}>
             <View style={styles.switchRow}>
               <Text style={styles.sectionLabel}>Contactos Miembro</Text>
               <TouchableOpacity onPress={handlePickContact} style={styles.inviteBtn}>
                 <Ionicons name="person-add-outline" size={20} color={Colors.textSecondary} />
                 <Text style={styles.inviteBtnText}>Invitar</Text>
               </TouchableOpacity>
             </View>
             
             <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.membersRow}>
                {members.map((m) => {
                    const displayName = getSmartDisplayName(m.userId, m.displayName);
                    return (
                    <View key={m.userId} style={styles.memberCard}>
                      <TouchableOpacity 
                        style={styles.removeMemberBtn} 
                        onPress={() => setMembers(members.filter(x => x.userId !== m.userId))}
                      >
                        <Ionicons name="close-circle" size={18} color="#9f9f93" />
                      </TouchableOpacity>
                      <View style={styles.avatarContainer}>
                        <View style={[styles.memberAvatar, { backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' }]}>
                          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#737373' }}>{displayName.charAt(0)}</Text>
                        </View>
                      </View>
                      <Text style={styles.memberName} numberOfLines={1}>{displayName.split(' ')[0]}</Text>
                    </View>
                    );
                  })}
             </ScrollView>
          </View>

          {/* Movimiento por defecto */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Movimiento por defecto</Text>
            <Text style={styles.sectionSubtitle}>Predefinido cada vez que ingreso un ticket a esta billetera</Text>
            <View style={styles.segmentedContainer}>
              <TouchableOpacity 
                onPress={() => setInitialTransactionType('expense')}
                style={[styles.segmentedItem, initialTransactionType === 'expense' && { backgroundColor: '#c05050', borderColor: '#c05050' }]}
              >
                <Text style={[styles.segmentedText, initialTransactionType === 'expense' && { color: 'white' }]}>Pago</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setInitialTransactionType('income')}
                style={[styles.segmentedItem, initialTransactionType === 'income' && { backgroundColor: Colors.primary, borderColor: Colors.primary }]}
              >
                <Text style={[styles.segmentedText, initialTransactionType === 'income' && { color: 'white' }]}>Cobro</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Procedimiento de pago o cobro por defecto</Text>
            <Text style={styles.sectionSubtitle}>Instrucciones que verán mis contactos de como se hace el pago.</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
              value={paymentMethod}
              onChangeText={setPaymentMethod}
              placeholder="Ej: CBU 2234... o Efectivo"
              multiline
              maxLength={500}
            />
          </View>

          <View style={styles.section}>
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionLabel}>Asistente de cobranza</Text>
                <Text style={styles.sectionSubtitle}>Usar procedimientos para ayudarme a recordar y cobrar</Text>
              </View>
              <Switch 
                value={helpToCollect} 
                onValueChange={setHelpToCollect}
                trackColor={{ true: Colors.primary }}
              />
            </View>
          </View>

          {/* Límites de Saldo */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Límites de Saldo</Text>
            
            <View style={[styles.thresholdBox, { backgroundColor: '#fff9e6', borderColor: '#ffecb3' }]}>
              <View style={styles.thresholdHeader}>
                <Ionicons name="warning" size={20} color="#b45309" />
                <Text style={[styles.thresholdTitle, { color: '#b45309' }]}>Alerta temprana</Text>
              </View>
              <View style={styles.thresholdInputRow}>
                <Text style={styles.thresholdCurrencySymbol}>$</Text>
                <TextInput
                  style={[styles.thresholdInput, { color: '#b45309' }]}
                  value={warningThreshold}
                  onChangeText={(val) => setWarningThreshold(formatThousands(val))}
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>
            </View>

            <View style={[styles.thresholdBox, { backgroundColor: '#fff5f5', borderColor: '#fed7d7', marginTop: 12 }]}>
              <View style={styles.thresholdHeader}>
                <Ionicons name="notifications" size={20} color="#c05050" />
                <Text style={[styles.thresholdTitle, { color: '#c05050' }]}>Saldo crítico</Text>
              </View>
              <View style={styles.thresholdInputRow}>
                <Text style={styles.thresholdCurrencySymbol}>$</Text>
                <TextInput
                  style={[styles.thresholdInput, { color: '#c05050' }]}
                  value={alertThreshold}
                  onChangeText={(val) => setAlertThreshold(formatThousands(val))}
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
        <View style={styles.footer}>
          <Button label={isSaving ? "Creando..." : "Finalizar"} disabled={!name.trim() || isSaving} onPress={handleCreateWallet} />
        </View>
      </View>
    );
  };

  const renderSuccess = () => (
    <View style={[styles.stepContainer, { alignItems: 'center', justifyContent: 'center' }]}>
       <View style={styles.successCircle}>
         <Ionicons name="checkmark" size={48} color="white" />
       </View>
       <Typography variant="headingH1" align="center" style={{ marginBottom: Spacing.xs }}>¡Billetera lista!</Typography>
       <Typography variant="bodyLarge" color="secondary" align="center" style={{ marginBottom: Spacing.xxl }}>Ya podés empezar a registrar movimientos.</Typography>
       <Button label="Comenzar" onPress={() => onFinish ? onFinish('Billetera creada con éxito') : navigation.goBack()} />
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        {!isSuccess && (
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.progressWrapper}>
               <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${(step / 3) * 100}%`, backgroundColor: Colors.primary }]} />
               </View>
               <Typography variant="captionBase" color="tertiary">{step} de 3</Typography>
            </View>
            <View style={{ width: 40 }} />
          </View>
        )}

        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          {isSuccess ? renderSuccess() : (
            step === 1 ? renderStep1() :
            step === 2 ? renderStep2() :
            renderStep3()
          )}
        </Animated.View>

        {/* Modals */}
        <Modal visible={isCurrencyModalVisible} transparent animationType="slide">
           <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                 <Typography variant="headingH3" style={{ marginBottom: 16 }}>Seleccionar Moneda</Typography>
                 <FlatList
                   data={CURRENCIES}
                   keyExtractor={item => item.code}
                   renderItem={({ item }) => (
                     <TouchableOpacity 
                        style={styles.modalItem} 
                        onPress={() => { setCurrency(item.code); setCurrencyModalVisible(false); }}
                     >
                        <Text style={styles.modalItemText}>{item.name} ({item.code})</Text>
                        {currency === item.code && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
                     </TouchableOpacity>
                   )}
                 />
                 <Button label="Cerrar" variant="secondary" onPress={() => setCurrencyModalVisible(false)} style={{ marginTop: 16 }} />
              </View>
           </View>
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
                  <Text style={{ fontSize: 15, fontFamily: FontFamily.medium, color: Colors.textSecondary }}>Cancelar</Text>
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
                      const phone = c.phoneNumbers?.[0] || '';
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
                data={contactsList.filter(c => {
                  const searchLower = contactSearchText.toLowerCase();
                  const searchDigits = contactSearchText.replace(/\D/g, '');
                  
                  const nameMatch = c.name.toLowerCase().includes(searchLower);
                  const phoneMatch = searchDigits.length > 0 && (c.phoneNumbers?.[0] || '').replace(/\D/g, '').includes(searchDigits);
                  
                  return nameMatch || phoneMatch;
                })}
                keyExtractor={item => item.id}
                contentContainerStyle={{ paddingHorizontal: 16 }}
                renderItem={({ item }) => {
                  const phone = item.phoneNumbers?.[0] || '';
                  const isSelected = selectedContactsTemp.some(c => cleanPhone(c.phoneNumbers?.[0]) === cleanPhone(phone));
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
                        <Text style={styles.contactPhone}>{phone}</Text>
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

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  progressWrapper: { flex: 1, alignItems: 'center', gap: 6 },
  progressBar: { height: 4, backgroundColor: Colors.strokeSubtle, borderRadius: 99, width: '60%', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 99 },
  stepContainer: { flex: 1, paddingHorizontal: 24, paddingTop: 20, marginBottom: 60 },
  options: { gap: 12 },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: BorderRadius.card, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: 'transparent' },
  optionSelected: { borderColor: Colors.primary },
  optionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 14 },
  optionIcon: { width: 44, height: 44, backgroundColor: Colors.subtleSurface, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: Colors.inputBorder, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingVertical: 20, backgroundColor: Colors.background },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.strokeSubtle, borderRadius: BorderRadius.card, paddingHorizontal: 16, height: 52, fontSize: 16, color: Colors.textPrimary },
  section: { marginTop: 24 },
  selector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.strokeSubtle, borderRadius: BorderRadius.card, paddingHorizontal: 16, height: 52 },
  selectorText: { fontSize: 16, color: Colors.textPrimary },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  membersList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  memberTag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.subtleSurface, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 99 },
  memberTagName: { fontSize: 13, color: Colors.textSecondary },
  successCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 24, ...Shadows.cardElevated },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.strokeSubtle },
  modalItemText: { fontSize: 16, color: Colors.textPrimary },
  sectionLabel: { fontSize: 17, fontFamily: FontFamily.bold, color: Colors.textPrimary, marginBottom: 2 },
  sectionSubtitle: { fontSize: 13, color: Colors.textTertiary, marginBottom: 12 },
  segmentedContainer: { flexDirection: 'row', gap: 12, marginTop: 4 },
  segmentedItem: { flex: 1, height: 48, borderRadius: 24, borderWidth: 1, borderColor: Colors.strokeSubtle, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
  segmentedText: { fontSize: 16, fontFamily: FontFamily.bold, color: Colors.textSecondary },
  thresholdBox: { borderRadius: 16, padding: 16, borderWidth: 1 },
  thresholdHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  thresholdTitle: { fontSize: 15, fontFamily: FontFamily.bold },
  thresholdInputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 12, paddingHorizontal: 12, height: 48 },
  thresholdCurrencySymbol: { fontSize: 18, fontFamily: FontFamily.bold, color: Colors.textSecondary, marginRight: 8 },
  thresholdInput: { flex: 1, fontSize: 24, fontFamily: FontFamily.bold, textAlign: 'right' },
  inviteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  inviteBtnText: { fontSize: 15, color: Colors.textSecondary, fontFamily: FontFamily.medium },
  membersRow: { marginTop: 12, flexDirection: 'row' },
  memberCard: { width: 80, alignItems: 'center', marginRight: 12 },
  avatarContainer: { width: 64, height: 64, position: 'relative', marginBottom: 6 },
  memberAvatar: { width: 64, height: 64, borderRadius: 16, borderWidth: 1, borderColor: '#eceae3' },
  creatorBadge: { position: 'absolute', top: -8, left: 0, right: 0, alignItems: 'center' },
  creatorBadgeText: { backgroundColor: '#1a1a1a', color: 'white', fontSize: 9, fontFamily: FontFamily.bold, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  memberName: { fontSize: 13, color: '#1a1a1a', fontFamily: FontFamily.medium, width: '100%', textAlign: 'center' },
  removeMemberBtn: { position: 'absolute', top: -6, right: -6, zIndex: 10 },
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
