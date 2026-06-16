import React, { useState, useEffect } from "react";
import { View, KeyboardAvoidingView, Platform, Modal, FlatList, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "@/navigation/AuthNavigator";
import { Colors, FontFamily, Shadows, Spacing, BorderRadius } from "@/constants/theme";
import { Typography } from "@/components/ui/Typography";
import { authApi } from "@/api/auth.api";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";

type Props = NativeStackScreenProps<AuthStackParamList, "PhoneInput">;

const COUNTRIES = [
  { name: 'Argentina', code: '+54', flag: '🇦🇷', iso: 'AR', currency: 'ARS' },
  { name: 'Bolivia', code: '+591', flag: '🇧🇴', iso: 'BO', currency: 'BOB' },
  { name: 'Brasil', code: '+55', flag: '🇧🇷', iso: 'BR', currency: 'BRL' },
  { name: 'Chile', code: '+56', flag: '🇨🇱', iso: 'CL', currency: 'CLP' },
  { name: 'Colombia', code: '+57', flag: '🇨🇴', iso: 'CO', currency: 'COP' },
  { name: 'Costa Rica', code: '+506', flag: '🇨🇷', iso: 'CR', currency: 'CRC' },
  { name: 'Cuba', code: '+53', flag: '🇨🇺', iso: 'CU', currency: 'CUP' },
  { name: 'Ecuador', code: '+593', flag: '🇪🇨', iso: 'EC', currency: 'USD' },
  { name: 'El Salvador', code: '+503', flag: '🇸🇻', iso: 'SV', currency: 'USD' },
  { name: 'Guatemala', code: '+502', flag: '🇬🇹', iso: 'GT', currency: 'GTQ' },
  { name: 'Haití', code: '+509', flag: '🇭🇹', iso: 'HT', currency: 'HTG' },
  { name: 'Honduras', code: '+504', flag: '🇭🇳', iso: 'HN', currency: 'HNL' },
  { name: 'México', code: '+52', flag: '🇲🇽', iso: 'MX', currency: 'MXN' },
  { name: 'Nicaragua', code: '+505', flag: '🇳🇮', iso: 'NI', currency: 'NIO' },
  { name: 'Panamá', code: '+507', flag: '🇵🇦', iso: 'PA', currency: 'USD' },
  { name: 'Paraguay', code: '+595', flag: '🇵🇾', iso: 'PY', currency: 'PYG' },
  { name: 'Perú', code: '+51', flag: '🇵🇪', iso: 'PE', currency: 'PEN' },
  { name: 'Puerto Rico', code: '+1', flag: '🇵🇷', iso: 'PR', currency: 'USD' },
  { name: 'República Dominicana', code: '+1', flag: '🇩🇴', iso: 'DO', currency: 'DOP' },
  { name: 'Uruguay', code: '+598', flag: '🇺🇾', iso: 'UY', currency: 'UYU' },
  { name: 'Venezuela', code: '+58', flag: '🇻🇪', iso: 'VE', currency: 'VES' },
];

export const PhoneInputScreen: React.FC<Props> = ({ navigation }) => {
  const buildId = Constants.expoConfig?.extra?.buildId || '';
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+598"); // Default fallback
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastAnim] = useState(new Animated.Value(-100));

  // Seleccionamos el objeto de país actual
  const currentCountry = COUNTRIES.find(c => c.code === countryCode) || COUNTRIES[0];

  useEffect(() => {
    const detectCountry = async () => {
      try {
        const res = await fetch("https://ipapi.co/json/");
        const data = await res.json();
        if (data?.country_calling_code) {
          const matched = COUNTRIES.find(c => c.code === data.country_calling_code || c.code === `+${data.country_calling_code.replace('+', '')}`);
          if (matched) setCountryCode(matched.code);
        }
      } catch (e) { console.log("IP Detection failed", e); }
    };
    detectCountry();
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 60, duration: 300, useNativeDriver: true }),
      Animated.delay(3000),
      Animated.timing(toastAnim, { toValue: -100, duration: 300, useNativeDriver: true })
    ]).start();
  };

  const handleContinue = async () => {
    let sanitizedPhone = phone.replace(/[^\d]/g, "");

    // Norma E.164: Remover el cero inicial si el usuario lo ingresó (ej: 096... -> 96...)
    if (sanitizedPhone.startsWith('0')) {
      sanitizedPhone = sanitizedPhone.substring(1);
    }

    if (sanitizedPhone.length < 8) {
      showToast("Ingresá un número válido");
      return;
    }
    try {
      const fullNumber = `${countryCode}${sanitizedPhone}`;

      // Lanzar el envío de OTP de forma asincrónica (sin await) para navegar de inmediato
      authApi.requestOtp({
        phoneNumber: fullNumber,
        country: currentCountry.iso,
        currency: currentCountry.currency
      }).catch(err => {
        console.error("Async OTP Request failed:", err);
        // Podríamos mostrar un mensaje en la siguiente pantalla si fuera necesario
      });

      // Navegar inmediatamente
      navigation.navigate("OtpVerify", { phoneNumber: fullNumber });
    } catch (error: any) {
      showToast(!error.response ? "Sin conexión 📶" : "Error al enviar código");
    } finally {
      // Ya no bloqueamos la UI esperando la respuesta
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Animated.View style={[styles.toast, { transform: [{ translateY: toastAnim }] }]}>
        <Ionicons name="alert-circle" size={20} color={Colors.white} />
        <Typography variant="bodyBase" color={Colors.white} style={{ marginLeft: 8 }}>{toastMsg}</Typography>
      </Animated.View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Typography variant="headingH2" style={styles.title}>¿Cuál es tu número celular?</Typography>
            <Typography variant="bodyLarge" color={Colors.textSecondary}>
              Te enviaremos un código por SMS para validar tu identidad de forma segura.
            </Typography>
          </View>

          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.countryPicker} onPress={() => setIsModalVisible(true)}>
              <Typography variant="labelLarge" color={Colors.primary} style={{ fontWeight: '700' }}>{countryCode}</Typography>
              <Ionicons name="chevron-down" size={16} color={Colors.textTertiary} />
            </TouchableOpacity>
            <TextInput
              style={[styles.phoneInput, { width: 100 }]}
              placeholder="1234 5678"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              placeholderTextColor={Colors.surfaceAlt}
              autoFocus
              borderWidth={0}
            />
          </View>

          {/* ETIQUETA DE PAÍS SELECCIONADO */}
          <View style={styles.countryLabel}>
            <Typography variant="labelXSmall" color={Colors.textTertiary} uppercase spacing={1}>
              {currentCountry.name} {currentCountry.flag}
            </Typography>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.mainBtn, isLoading && styles.btnDisabled]}
            onPress={handleContinue}
            disabled={isLoading}
          >
            {isLoading ? <ActivityIndicator color={Colors.white} /> : <Typography variant="labelBase" color={Colors.white}>Continuar</Typography>}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.legalLink, { marginTop: 16, marginBottom: 0 }]}
            onPress={() => navigation.navigate("TermsAndConditions" as any)}
          >
            <Typography variant="labelSmall" color={Colors.textTertiary}>
              Al continuar, aceptás nuestros <Typography variant="labelSmall" color={Colors.primary} style={{ textDecorationLine: 'underline' }}>Términos & Condiciones</Typography>
            </Typography>
          </TouchableOpacity>
        </View>

        <Modal visible={isModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Typography variant="headingH3">Seleccioná tu país</Typography>
                <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.closeBtn}>
                  <Ionicons name="close" size={24} color={Colors.textTertiary} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={COUNTRIES}
                keyExtractor={(item) => item.code + item.name}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.countryItem}
                    onPress={() => { setCountryCode(item.code); setIsModalVisible(false); }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                      <Typography style={{ fontSize: 24 }}>{item.flag}</Typography>
                      <Typography variant="bodyBase" style={{ fontWeight: '500' }}>{item.name}</Typography>
                    </View>
                    <Typography variant="bodyBase" color={Colors.textTertiary} style={{ fontWeight: 'bold' }}>{item.code}</Typography>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  toast: { position: 'absolute', top: 0, left: 20, right: 20, backgroundColor: '#E54B4B', padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', zIndex: 9999, ...Shadows.card },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 40 },
  header: { marginBottom: 40 },
  title: { fontSize: 28, lineHeight: 34, marginBottom: 16, color: Colors.textPrimary, fontFamily: FontFamily.bold },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: BorderRadius.card, paddingHorizontal: 16, height: 72, borderWidth: 0, ...Shadows.card, maxWidth: 600, alignSelf: 'center', width: '100%' },
  countryPicker: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingRight: 12, borderRightWidth: 1, borderRightColor: Colors.surfaceMuted, minWidth: 70 },
  // @ts-ignore
  phoneInput: { flex: 1, paddingLeft: 16, fontSize: 20, fontFamily: FontFamily.bold, color: Colors.textPrimary, borderWidth: 0, outlineStyle: 'none' },
  countryLabel: { marginTop: 12, alignItems: 'center' },
  footer: { paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 20 : 40 },
  legalLink: { marginBottom: 24, alignItems: 'center' },
  mainBtn: { height: 64, backgroundColor: Colors.primary, borderRadius: BorderRadius.button, alignItems: 'center', justifyContent: 'center', ...Shadows.sage },
  btnDisabled: { opacity: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(20,51,39,0.3)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.white, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '80%' },
  modalHandle: { width: 40, height: 5, backgroundColor: Colors.surfaceMuted, borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  closeBtn: { padding: 4 },
  countryItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: Colors.surfaceMuted },
});
