import "react-native-gesture-handler";
import "./global.css";
import React, { useEffect } from "react";
import { AppState, AppStateStatus } from 'react-native';
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppNavigator } from "@/navigation/AppNavigator";
import { useColorScheme } from "nativewind";
import { useAuthStore } from "@/store/auth.store";
import { usersApi } from '@/api/users.api';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from 'expo-notifications';

import { GlobalToast } from "@/components/GlobalToast";

SplashScreen.preventAutoHideAsync();

// Configuración de notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function App() {
  const [fontsLoaded] = useFonts({
    "PlusJakarta-Regular": PlusJakartaSans_400Regular,
    "PlusJakarta-Medium": PlusJakartaSans_500Medium,
    "PlusJakarta-SemiBold": PlusJakartaSans_600SemiBold,
    "PlusJakarta-Bold": PlusJakartaSans_700Bold,
  });

  useEffect(() => {
    console.log('--- ENV CONFIG ---');
    console.log('API_URL:', process.env.EXPO_PUBLIC_API_URL);
    console.log('WS_URL:', process.env.EXPO_PUBLIC_WS_URL);
    console.log('------------------');
  }, []);

  useEffect(() => {
    const recordAccess = () => {
      const user = useAuthStore.getState().user;
      if (user?.id) {
        usersApi.updateProfile(user.id, { lastAccess: new Date() }).catch(err => console.log('Failed to record access:', err));
      }
    };

    // Registrar al iniciar
    recordAccess();

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        recordAccess();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const { setColorScheme } = useColorScheme();
  const theme = useAuthStore(s => s.user?.theme);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (theme === 'dark') {
      setColorScheme('dark');
    } else if (theme === 'system') {
      setColorScheme('system');
    } else {
      setColorScheme('light');
    }
  }, [theme, setColorScheme]);

  useEffect(() => {
    // Escuchar notificaciones recibidas con la app abierta
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notificación recibida:', notification);
    });

    // Escuchar cuando el usuario interactúa con la notificación
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Respuesta a notificación:', response);
      // Aquí podrías implementar navegación profunda según la data:
      // const { data } = response.notification.request.content;
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, []);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <AppNavigator />
      <GlobalToast />
    </SafeAreaProvider>
  );
}
