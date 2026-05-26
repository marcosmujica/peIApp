import React, { useState } from "react";
import { View, KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator, TouchableOpacity, TextInput, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "@/navigation/AuthNavigator";
import { Colors, FontFamily, Shadows, Spacing, BorderRadius } from "@/constants/theme";
import { Typography } from "@/components/ui/Typography";
import { authApi } from "@/api/auth.api";
import { useAuthStore } from "@/store/auth.store";
import { Ionicons } from "@expo/vector-icons";
import { registerForPushNotificationsAsync, saveNotificationId } from "@/services/notification.service";

type Props = NativeStackScreenProps<AuthStackParamList, "OtpVerify">;

export const OtpVerifyScreen: React.FC<Props> = ({ route, navigation }) => {
  const { phoneNumber } = route.params;
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const [errorMsg, setErrorMsg] = useState("");
  const [errorAnim] = useState(new Animated.Value(-100));
  const [countdown, setCountdown] = useState(60);
  const [isResending, setIsResending] = useState(false);

  const showError = (msg: string) => {
    setErrorMsg(msg);
    Animated.sequence([
      Animated.timing(errorAnim, { toValue: 60, duration: 300, useNativeDriver: true }),
      Animated.delay(3000),
      Animated.timing(errorAnim, { toValue: -100, duration: 300, useNativeDriver: true })
    ]).start();
  };

  const handleVerify = async (val?: string) => {
    const codeToVerify = val || code;
    if (codeToVerify.length < 6) {
      showError("Código incompleto");
      return;
    }
    try {
      setIsLoading(true);
      const res = await authApi.verifyOtp({ phoneNumber, code: codeToVerify });
      await setAuth(res.access_token, res.user);

      // Registrar para notificaciones push
      try {
        const pushToken = await registerForPushNotificationsAsync();
        if (pushToken) {
          await saveNotificationId(res.user.phoneNumber, pushToken, res.access_token);
        }
      } catch (pushError) {
        console.error("Error registering push token:", pushError);
      }
    } catch (error) {
      showError("Código incorrecto");
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    if (code.length === 6 && !isLoading) {
      handleVerify(code);
    }
  }, [code]);

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [countdown]);

  const handleResend = async () => {
    if (countdown > 0 || isResending) return;
    
    try {
      setIsResending(true);
      await authApi.requestOtp({ phoneNumber });
      setCountdown(60);
      // Usamos el mismo brindis de error pero con otro color si fuera posible, 
      // o simplemente avisamos que se envió.
      showError("Código reenviado");
    } catch (err) {
      showError("Error al reenviar");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Animated.View style={[styles.toast, { transform: [{ translateY: errorAnim }] }]}>
          <Ionicons name="alert-circle" size={20} color={Colors.white} />
          <Typography variant="bodyBase" color={Colors.white} style={{ marginLeft: 8 }}>{errorMsg}</Typography>
      </Animated.View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
              <Typography variant="headingH2" style={styles.title}>Validar número</Typography>
            </View>
            <Typography variant="bodyLarge" color={Colors.textSecondary}>
              Enviamos un código seguro a tu número terminado en 
              <Typography variant="bodyLargeStrong" color={Colors.primary}> {phoneNumber.slice(-4)}</Typography>.
            </Typography>
          </View>

          <View style={styles.codeContainer}>
             <Typography variant="labelXSmall" color={Colors.textTertiary} uppercase spacing={2} style={{ marginBottom: 12 }}>
                CÓDIGO DE 6 DÍGITOS
             </Typography>
             <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.codeInput}
                  placeholder="000 000"
                  keyboardType="number-pad"
                  value={code}
                  onChangeText={setCode}
                  maxLength={6}
                  placeholderTextColor={Colors.surfaceMuted}
                  autoFocus
                  selectionColor={Colors.primary}
                />
             </View>
             <TouchableOpacity 
                style={[styles.resendBtn, countdown > 0 && { opacity: 0.7 }]} 
                onPress={handleResend}
                disabled={countdown > 0 || isResending}
              >
                <Typography variant="labelSmall" color={Colors.textSecondary}>¿No te llegó? </Typography>
                {countdown > 0 ? (
                  <Typography variant="labelSmall" color={Colors.textTertiary}>
                    Reenviar en {countdown}s
                  </Typography>
                ) : (
                  <Typography variant="labelSmall" color={Colors.primary} style={{ fontWeight: 'bold' }}>
                    Reenviar
                  </Typography>
                )}
             </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.mainBtn, isLoading && styles.btnDisabled]}
            onPress={handleVerify}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Typography variant="labelBase" color={Colors.white}>Verificar Código</Typography>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, paddingHorizontal: Spacing.xl, paddingTop: 20 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  header: { marginBottom: 60 },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginLeft: -10, // Para compensar el aire del icono
  },
  title: { fontSize: 26, lineHeight: 32, color: Colors.textPrimary, fontFamily: FontFamily.bold },
  codeContainer: {
    alignItems: 'center',
  },
  inputWrapper: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.card,
    borderWidth: 1,
    borderColor: 'rgba(20,51,39,0.05)'
  },
  codeInput: {
    fontSize: 34,
    fontFamily: FontFamily.bold,
    letterSpacing: 8,
    color: Colors.primary,
    textAlign: 'center',
    width: '100%',
  },
  resendBtn: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  footer: { padding: Spacing.xl, paddingBottom: Platform.OS === 'ios' ? 10 : 30 },
  mainBtn: {
    height: 64,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.button,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sage
  },
  btnDisabled: { opacity: 0.5 },
  toast: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    backgroundColor: '#c05050',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 999,
    ...Shadows.card,
  },
});
