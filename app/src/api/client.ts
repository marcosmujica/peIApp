import axios from "axios";
import { useAuthStore } from "@/store/auth.store";
import { Platform, Alert } from "react-native";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? (Platform.OS === 'android' ? 'https://api.peiapp.tech' : 'https://api.peiapp.tech');

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor — attach token
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401
apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      // Navigation to auth handled by AppNavigator via store subscription
    } else if (!error.response || error.code === 'ECONNABORTED') {
      const fullUrl = error.config?.url ? `${error.config.baseURL || ''}${error.config.url}` : 'URL desconocida';
      const method = error.config?.method?.toUpperCase() || 'UNKNOWN';
      
      Alert.alert(
        '🚨 Error de Red (Fallback)',
        `Método: ${method}\nURL: ${fullUrl}\nCódigo: ${error.code}\nError: ${error.message}`
      );
    }
    return Promise.reject(error);
  }
);

export default apiClient;
