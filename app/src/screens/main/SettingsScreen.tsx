import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  Image,
  Platform,
  Modal,
  FlatList,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { getLocalTickets, LocalTicket } from '@/storage/tickets.local';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '@/store/auth.store';
import { usersApi } from '@/api/users.api';
import { Colors, FontFamily } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { helpdeskApi } from '@/api/helpdesk.api';
import { useUIStore } from '@/store/ui.store';
import Constants from 'expo-constants';


const LATAM_COUNTRIES = [
  { code: 'AR', name: 'Argentina' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'BR', name: 'Brasil' },
  { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colombia' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'CU', name: 'Cuba' },
  { code: 'DO', name: 'República Dominicana' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'HN', name: 'Honduras' },
  { code: 'MX', name: 'México' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'PA', name: 'Panamá' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'PE', name: 'Perú' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'VE', name: 'Venezuela' },
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

const GENDER_OPTIONS = [
  { code: 'Mujer', name: 'Mujer' },
  { code: 'Hombre', name: 'Hombre' },
  { code: 'No binario', name: 'No binario' },
  { code: 'Prefiero no decirlo', name: 'Prefiero no decirlo' },
];

const YEAR_OPTIONS = Array.from({ length: 71 }, (_, i) => {
  const y = (new Date().getFullYear() - 10) - i;
  return { code: y.toString(), name: y.toString() };
});
import { normalizeUrl } from '@/utils/url.util';

export const SettingsScreen: React.FC = () => {
  const buildId = Constants.expoConfig?.extra?.buildId || '';
  const navigation = useNavigation<any>();
  const { user, updateUser } = useAuthStore();
  
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [country, setCountry] = useState(user?.country || 'AR');
  const [currency, setCurrency] = useState(user?.currency || 'ARS');
  const [pushEnabled, setPushEnabled] = useState(user?.pushEnabled ?? true);
  const [theme, setTheme] = useState(user?.theme || 'light');
  const [defaultPaymentProcedure, setDefaultPaymentProcedure] = useState(user?.defaultPaymentProcedure || '');
  const [gender, setGender] = useState(user?.gender || '');
  const [age, setAge] = useState(user?.age ? user.age.toString() : '');
  const [preferredNotificationTime, setPreferredNotificationTime] = useState(user?.preferredNotificationTime || '09:00');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [dailyReportsEnabled, setDailyReportsEnabled] = useState(user?.dailyReportsEnabled ?? true);
  const [monthlyReportsEnabled, setMonthlyReportsEnabled] = useState(user?.monthlyReportsEnabled ?? true);
  const [transactionNotificationsEnabled, setTransactionNotificationsEnabled] = useState(user?.transactionNotificationsEnabled ?? true);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [helpMessage, setHelpMessage] = useState('');
  const [helpLoading, setHelpLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const showToast = useUIStore(s => s.showToast);
  
  const [avgRating, setAvgRating] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'finance' | 'prefs' | 'notifications' | 'help'>('profile');

  const loadAvgRating = useCallback(async () => {
    if (!user) return;
    try {
      const tickets = await getLocalTickets();
      let sum = 0;
      let count = 0;
      tickets.forEach((t: any) => {
        // Rating given TO ME
        const rating = t.ownerId === user.id ? t.participantRating : (t.toUser === user.phoneNumber ? t.ownerRating : 0);
        if (rating && rating > 0) {
          sum += rating;
          count++;
        }
      });
      setAvgRating(count > 0 ? (sum / count).toFixed(1) : null);
    } catch (e) {
      console.warn("Error calculating avg rating", e);
    }
  }, [user]);

  useFocusEffect(useCallback(() => {
    loadAvgRating();
  }, [loadAvgRating]));


  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'country' | 'currency' | 'gender' | 'age' | 'theme'>('country');

  const currentYear = new Date().getFullYear();
  const selectedYear = age ? (currentYear - parseInt(age)).toString() : 'Seleccionar';

  const selectedCountryName = LATAM_COUNTRIES.find(c => c.code === country)?.name || country;
  const selectedCurrencyName = CURRENCIES.find(c => c.code === currency)?.name || currency;
  const selectedGenderName = GENDER_OPTIONS.find(g => g.code === gender)?.name || gender || 'Seleccionar';
  const THEME_OPTIONS = [
    { code: 'light', name: 'Claro' },
    { code: 'dark', name: 'Oscuro' },
    { code: 'system', name: 'Sistema' }
  ];
  const selectedThemeName = THEME_OPTIONS.find(t => t.code === theme)?.name || 'Claro';

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
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.5,
        });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      handleUploadAvatar(result.assets[0].uri);
    }
  };

  const handleUploadAvatar = async (uri: string) => {
    if (!user) return;
    try {
      setUploading(true);
      setImageError(false); // Reset error on new upload
      const updatedUser = await usersApi.uploadAvatar(user.id, uri);
      // Actualizar el store con el nuevo URL + timestamp para evitar cacheo de imagen
      updateUser({ avatarUrl: `${updatedUser.avatarUrl}?t=${Date.now()}` });
      showToast("Imagen de perfil actualizada", 'success');
    } catch (error: any) {
      console.error("Upload Error Details:", error);
      const msg = error.message?.toLowerCase() || '';
      const isSizeError = error.status === 413 || 
                          msg.includes('too large') || 
                          msg.includes('file too large') || 
                          msg.includes('limit');

      if (isSizeError) {
        showToast("La imagen es demasiado pesada (máx 100MB)", 'error');
      } else {
        showToast(`Error: ${error.message || 'No se pudo subir la imagen'}`, 'error');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const updatedUser = await usersApi.updateProfile(user.id, {
        displayName,
        country,
        currency,
        pushEnabled,
        defaultPaymentProcedure,
        gender,
        age: age ? parseInt(age, 10) : undefined,
        theme,
        preferredNotificationTime,
        dailyReportsEnabled,
        monthlyReportsEnabled,
        transactionNotificationsEnabled,
      });
      updateUser(updatedUser);
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate("MainTabs");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudo actualizar el perfil.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendHelp = async () => {
    if (!helpMessage.trim()) return;
    try {
      setHelpLoading(true);
      await helpdeskApi.sendMessage(helpMessage, user?.phoneNumber);
      setHelpMessage('');
      showToast("Gracias por enviarnos tu mensaje", 'success');
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudo enviar el mensaje.");
    } finally {
      setHelpLoading(false);
    }
  };


  const openModal = (type: 'country' | 'currency' | 'gender' | 'age' | 'theme') => {
    setModalType(type);
    setModalVisible(true);
  };

  const selectItem = (code: string) => {
    if (modalType === 'country') {
      setCountry(code);
    } else if (modalType === 'currency') {
      setCurrency(code);
    } else if (modalType === 'age') {
      setAge((currentYear - parseInt(code)).toString());
    } else if (modalType === 'theme') {
      setTheme(code as 'light' | 'dark' | 'system');
    } else {
      setGender(code);
    }
    setModalVisible(false);
  };
  
  const onTimeChange = (event: any, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      setPreferredNotificationTime(`${hours}:${minutes}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate("MainTabs");
              }
            }} 
            style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color="#171717" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configuración</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
      >
        {activeTab === 'profile' && (
          <View>
            {/* Avatar Section */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarWrapper}>
                {user?.avatarUrl && !imageError ? (
                  <Image 
                    source={{ uri: normalizeUrl(user.avatarUrl) }} 
                    style={styles.avatar} 
                    onError={() => {
                        console.warn("Avatar load error for URI:", normalizeUrl(user.avatarUrl));
                        setImageError(true);
                    }}
                  />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Ionicons name="person" size={40} color="#A3A3A3" />
                  </View>
                )}
                {uploading && (
                    <View style={styles.uploadingOverlay}>
                        <Text style={styles.uploadingText}>Subiendo...</Text>
                    </View>
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
              <Text style={styles.phoneLabel}>{user?.phoneNumber}</Text>
              {avgRating && (
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={14} color="#F59E0B" />
                  <Text style={styles.ratingText}>{avgRating}</Text>
                </View>
              )}
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nombre</Text>
                <TextInput
                  style={styles.input}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Tu nombre"
                  placeholderTextColor="#A3A3A3"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Año de nacimiento</Text>
                <Text style={styles.inputDescription}>Tu edad se calculará automáticamente</Text>
                <TouchableOpacity style={styles.selectTrigger} onPress={() => openModal('age')}>
                  <Text style={styles.selectTriggerText}>{selectedYear}</Text>
                  <Ionicons name="calendar-outline" size={18} color="#737373" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Género</Text>
                <Text style={styles.inputDescription}>Nos ayuda a sugerirte mejor información</Text>
                <TouchableOpacity style={styles.selectTrigger} onPress={() => openModal('gender')}>
                  <Text style={styles.selectTriggerText}>{selectedGenderName}</Text>
                  <Ionicons name="chevron-down" size={18} color="#737373" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'finance' && (
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>País</Text>
              <TouchableOpacity style={styles.selectTrigger} onPress={() => openModal('country')}>
                <Text style={styles.selectTriggerText}>{selectedCountryName}</Text>
                <Ionicons name="chevron-down" size={18} color="#737373" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Moneda predeterminada</Text>
              <TouchableOpacity style={styles.selectTrigger} onPress={() => openModal('currency')}>
                <Text style={styles.selectTriggerText}>{selectedCurrencyName} ({currency})</Text>
                <Ionicons name="chevron-down" size={18} color="#737373" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Procedimiento de pago por defecto</Text>
              <Text style={styles.inputDescription}>Este texto se incluirá automáticamente en tus tickets para indicar cómo deseas recibir o realizar los pagos.</Text>
              <TextInput
                style={[styles.input, { height: 100, textAlignVertical: 'top', paddingTop: 12 }]}
                value={defaultPaymentProcedure}
                onChangeText={setDefaultPaymentProcedure}
                placeholder="Ej: Transferencia, Efectivo..."
                placeholderTextColor="#A3A3A3"
                multiline={true}
              />
            </View>
          </View>
        )}

        {activeTab === 'prefs' && (country === 'UY' || country === 'AR') && (
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Consultar mi estado financiero</Text>
              <Text style={styles.inputDescription}>
                {country === 'UY' 
                  ? "A continuación podrás consultar tu situación en la Central de Riesgos del Banco Central del Uruguay (BCU)."
                  : "A continuación podrás consultar tu situación crediticia en la Central de Deudores del Banco Central de la República Argentina (BCRA)."}
              </Text>
              
              <TouchableOpacity 
                style={styles.financeLinkCard}
                onPress={() => {
                  const url = country === 'UY' 
                    ? 'https://consultadeuda.bcu.gub.uy/consultadeuda/'
                    : 'https://www.bcra.gob.ar/situacion-crediticia/';
                  Linking.openURL(url);
                }}
              >
                <View style={styles.financeLinkIcon}>
                  <Ionicons name="shield-checkmark-outline" size={24} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.financeLinkTitle}>
                    {country === 'UY' ? 'Central de Riesgos BCU' : 'Situación Crediticia BCRA'}
                  </Text>
                  <Text style={styles.financeLinkSub}>Acceder al sitio oficial</Text>
                </View>
                <Ionicons name="open-outline" size={20} color="#737373" />
              </TouchableOpacity>

              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={20} color="#666" />
                <Text style={styles.infoBoxText}>
                  {country === 'UY'
                    ? "Esta consulta te permite conocer tu calificación crediticia según los informes de las instituciones financieras locales."
                    : "Esta consulta te permite conocer tu estado de cumplimiento de obligaciones bancarias y financieras."}
                </Text>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'notifications' && (
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Hora de notificaciones</Text>
              <Text style={styles.inputDescription}>¿A qué hora prefieres recibir tus reportes?</Text>
              <TouchableOpacity style={styles.selectTrigger} onPress={() => setShowTimePicker(true)}>
                <Text style={styles.selectTriggerText}>{preferredNotificationTime}</Text>
                <Ionicons name="time-outline" size={18} color="#737373" />
              </TouchableOpacity>
            </View>

            {showTimePicker && (
              <DateTimePicker
                value={(() => {
                  const [h, m] = preferredNotificationTime.split(':').map(Number);
                  const d = new Date();
                  d.setHours(h, m, 0, 0);
                  return d;
                })()}
                mode="time"
                is24Hour={true}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onTimeChange}
              />
            )}

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>Avisos</Text>
                <Text style={styles.switchDescription}>Recibir alertas de movimientos en tiempo real</Text>
              </View>
              <Switch
                value={pushEnabled}
                onValueChange={setPushEnabled}
                trackColor={{ false: '#E5E5E5', true: '#171717' }}
                thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : pushEnabled ? '#FFFFFF' : '#F5F5F5'}
              />
            </View>

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>Reportes diarios</Text>
                <Text style={styles.switchDescription}>Recibir un resumen de tu actividad cada día</Text>
              </View>
              <Switch
                value={dailyReportsEnabled}
                onValueChange={setDailyReportsEnabled}
                trackColor={{ false: '#E5E5E5', true: '#171717' }}
                thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : dailyReportsEnabled ? '#FFFFFF' : '#F5F5F5'}
              />
            </View>

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>Reportes mensuales</Text>
                <Text style={styles.switchDescription}>Recibir un resumen detallado cada mes</Text>
              </View>
              <Switch
                value={monthlyReportsEnabled}
                onValueChange={setMonthlyReportsEnabled}
                trackColor={{ false: '#E5E5E5', true: '#171717' }}
                thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : monthlyReportsEnabled ? '#FFFFFF' : '#F5F5F5'}
              />
            </View>

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>Pagos y cobros</Text>
                <Text style={styles.switchDescription}>Notificarme cuando se registre un pago o cobro</Text>
              </View>
              <Switch
                value={transactionNotificationsEnabled}
                onValueChange={setTransactionNotificationsEnabled}
                trackColor={{ false: '#E5E5E5', true: '#171717' }}
                thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : transactionNotificationsEnabled ? '#FFFFFF' : '#F5F5F5'}
              />
            </View>
          </View>
        )}

        {activeTab === 'help' && (
          <View style={styles.form}>
            {/* Help Center Section */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Centro de Ayuda</Text>
              <View style={styles.helpContainer}>
                <TextInput
                  style={[styles.input, styles.helpInput]}
                  value={helpMessage}
                  onChangeText={setHelpMessage}
                  placeholder="Estamos para escucharte, envianos tus comentarios"
                  placeholderTextColor="#A3A3A3"
                  multiline={true}
                  numberOfLines={4}
                />
                <TouchableOpacity 
                  style={[styles.sendBtn, !helpMessage.trim() && styles.sendBtnDisabled]}
                  onPress={handleSendHelp}
                  disabled={helpLoading || !helpMessage.trim()}
                >
                  <Ionicons name="send" size={20} color={helpMessage.trim() ? Colors.primary : "#A3A3A3"} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.inputGroup, { marginTop: 24 }]}>
              <TouchableOpacity 
                style={styles.textLink} 
                onPress={() => navigation.navigate('TermsAndConditions')}
              >
                <Ionicons name="document-text-outline" size={18} color={Colors.primary} />
                <Text style={styles.textLinkText}>Términos & Condiciones</Text>
              </TouchableOpacity>
              {buildId ? (
                <Text style={{ fontSize: 10, color: '#A3A3A3', marginTop: 8, marginLeft: 28, opacity: 0.8 }}>
                  Versión: {buildId}
                </Text>
              ) : null}
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.tabSelectorRow}>
        <TouchableOpacity 
          style={[styles.tabCircleBtn, activeTab === 'profile' && styles.tabCircleBtnActive]} 
          onPress={() => setActiveTab('profile')}
        >
          <Ionicons name="person-outline" size={20} color={activeTab === 'profile' ? '#fff' : '#171717'} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabCircleBtn, activeTab === 'finance' && styles.tabCircleBtnActive]} 
          onPress={() => setActiveTab('finance')}
        >
          <Ionicons name="cash-outline" size={20} color={activeTab === 'finance' ? '#fff' : '#171717'} />
        </TouchableOpacity>
        {(country === 'UY' || country === 'AR') && (
          <TouchableOpacity 
            style={[styles.tabCircleBtn, activeTab === 'prefs' && styles.tabCircleBtnActive]} 
            onPress={() => setActiveTab('prefs')}
          >
            <Ionicons name="stats-chart-outline" size={20} color={activeTab === 'prefs' ? '#fff' : '#171717'} />
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          style={[styles.tabCircleBtn, activeTab === 'notifications' && styles.tabCircleBtnActive]} 
          onPress={() => setActiveTab('notifications')}
        >
          <Ionicons name="notifications-outline" size={20} color={activeTab === 'notifications' ? '#fff' : '#171717'} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabCircleBtn, activeTab === 'help' && styles.tabCircleBtnActive]} 
          onPress={() => setActiveTab('help')}
        >
          <Ionicons name="help-circle-outline" size={20} color={activeTab === 'help' ? '#fff' : '#171717'} />
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Button
          label="Guardar cambios"
          onPress={handleSave}
          loading={loading}
          style={styles.saveBtn}
        />
      </View>

      {/* Selector Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Seleccionar {modalType === 'country' ? 'País' : modalType === 'currency' ? 'Moneda' : modalType === 'age' ? 'Año' : modalType === 'theme' ? 'Tema' : 'Género'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="chevron-back" size={24} color="#171717" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={
                modalType === 'country' ? LATAM_COUNTRIES : 
                modalType === 'currency' ? CURRENCIES : 
                modalType === 'age' ? YEAR_OPTIONS :
                modalType === 'theme' ? THEME_OPTIONS :
                GENDER_OPTIONS
              }
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => {
                const isSelected = (modalType === 'country' && country === item.code) || 
                                   (modalType === 'currency' && currency === item.code) ||
                                   (modalType === 'gender' && gender === item.code) ||
                                   (modalType === 'theme' && theme === item.code) ||
                                   (modalType === 'age' && selectedYear === item.code);
                return (
                  <TouchableOpacity 
                    style={styles.listItem} 
                    onPress={() => selectItem(item.code)}
                  >
                    <Text style={[styles.listItemText, isSelected && styles.listItemTextSelected]}>
                      {item.name} {modalType === 'currency' ? `(${item.code})` : ''}
                    </Text>
                    {isSelected && (
                        <Ionicons name="checkmark" size={20} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
    color: '#171717',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  tabSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 16,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
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
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    color: '#FFFFFF',
    fontSize: 12,
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
  },
  iconBtnText: {
    fontSize: 14,
    fontFamily: FontFamily.medium,
    color: '#171717',
  },
  form: {
    gap: 20,
    marginBottom: 32,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
    color: '#171717',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: FontFamily.regular,
    color: '#171717',
    backgroundColor: '#fff',
  },
  selectTrigger: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAFAFA',
  },
  selectTriggerText: {
    fontSize: 16,
    fontFamily: FontFamily.regular,
    color: '#171717',
  },
  inputDescription: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: '#737373',
    marginTop: 4,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  switchLabel: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    color: '#171717',
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: '#737373',
  },
  phoneLabel: {
    marginTop: 12,
    fontSize: 15,
    fontFamily: FontFamily.medium,
    color: '#737373',
    letterSpacing: 0.5,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  ratingText: {
    fontSize: 13,
    fontFamily: FontFamily.bold,
    color: '#92400E',
    marginLeft: 4,
  },
  saveBtn: {
    marginTop: 0,
  },
  financeLinkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    gap: 12,
    marginTop: 12,
    ...Platform.select({
      web: { boxShadow: '0px 2px 4px rgba(0,0,0,0.05)' },
      default: { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }
    })
  },
  financeLinkIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  financeLinkTitle: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    color: '#171717',
  },
  financeLinkSub: {
    fontSize: 13,
    fontFamily: FontFamily.medium,
    color: Colors.primary,
    marginTop: 2,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
    gap: 10,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  infoBoxText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    fontFamily: FontFamily.regular,
    lineHeight: 18,
  },
  footer: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
    color: '#171717',
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  listItemText: {
    fontSize: 16,
    fontFamily: FontFamily.regular,
    color: '#404040',
  },
  listItemTextSelected: {
    color: '#171717',
    fontFamily: FontFamily.bold,
  },
  listSeparator: {
    height: 1,
    backgroundColor: '#F5F5F5',
    marginHorizontal: 24,
  },
  helpContainer: {
    position: 'relative',
    gap: 12,
  },
  helpInput: {
    height: 120,
    textAlignVertical: 'top',
    paddingTop: 12,
    paddingRight: 50,
  },
  textLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  textLinkText: {
    fontSize: 15,
    fontFamily: FontFamily.medium,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  sendBtn: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
});
