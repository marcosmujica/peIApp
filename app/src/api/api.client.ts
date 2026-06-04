import axios from 'axios';
import { Platform, Alert } from 'react-native';
import { useAuthStore } from '../store/auth.store';

const rawApiUrl = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000');
export const API_URL = Platform.OS === 'android' ? rawApiUrl.replace('localhost', '10.0.2.2') : rawApiUrl;
export const AVATARS_URL = process.env.EXPO_PUBLIC_AVATARS_URL || API_URL;
export const WEB_SHARE_URL = process.env.EXPO_PUBLIC_WEB_SHARE_URL || 'http://localhost:5173' //'https://pei-app-ticket-web.vercel.app';
export const API_TIMEOUT = Number(process.env.EXPO_PUBLIC_API_TIMEOUT) || 15000;

const TOKEN_KEY = 'peiapp_jwt_token';

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT,
});

import { useUIStore } from '../store/ui.store';

let activeRequests = 0;

const startRequest = () => {
  activeRequests++;
  useUIStore.getState().startLoading();
};

const endRequest = () => {
  activeRequests--;
  if (activeRequests <= 0) {
    activeRequests = 0;
    useUIStore.getState().stopLoading();
  }
};

apiClient.interceptors.request.use(
  (config) => {
    const skipGlobal = (config as any).skipGlobalLoading;
    if (!skipGlobal) {
      startRequest();
    }
    
    // Primero intentar desde el store Zustand en memoria
    let token = useAuthStore.getState().token;

    // Fallback: leer directamente de localStorage en web si el store aún no fue hidratado
    if (!token && Platform.OS === 'web') {
      try {
        token = localStorage.getItem(TOKEN_KEY);
      } catch (_) {}
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    endRequest();
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    if (!(response.config as any).skipGlobalLoading) {
      endRequest();
    }
    return response;
  },
  (error) => {
    if (error.config && !(error.config as any).skipGlobalLoading) {
      endRequest();
    }
    if (error.response?.status === 401) {
       // El token expiró o fue revocado por el servidor
       console.warn('[API Client] 401 Unauthorized detectado. Forzando cierre de sesión.');
       useAuthStore.getState().logout();
    } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout') || !error.response) {
       const url = error.config?.url ? `${error.config.baseURL || ''}${error.config.url}` : API_URL;
       Alert.alert(
         'Error de Conexión',
         `No se pudo establecer conexión con el servidor.\n\nURL intentada:\n${url}\n\nPor favor, verifica tu conexión a internet o la configuración del servidor.`,
         [{ text: 'Aceptar' }]
       );
       useUIStore.getState().showToast('Sin conexión. Los datos pueden no estar actualizados.', 'warning');
    }
    return Promise.reject(error);
  }
);
