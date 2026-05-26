import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'peiapp_jwt_token';
const USER_KEY = 'peiapp_user';

interface User {
  id: string;
  phoneNumber: string;
  needsOnboarding: boolean;
  avatarUrl?: string;
  displayName?: string;
  country?: string;
  currency?: string;
  pushEnabled?: boolean;
  defaultWalletId?: string;
  defaultPaymentProcedure?: string;
  gender?: string;
  age?: number;
  theme?: 'light' | 'dark' | 'system';
  preferredNotificationTime?: string;
  dailyReportsEnabled?: boolean;
  monthlyReportsEnabled?: boolean;
  transactionNotificationsEnabled?: boolean;
  notificationId?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  setAuth: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  completeOnboarding: () => void;
  updateUser: (data: Partial<User>) => void;
  justFinishedOnboarding: boolean;
  clearJustFinishedOnboarding: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: true,
  justFinishedOnboarding: false,
  
  clearJustFinishedOnboarding: () => set({ justFinishedOnboarding: false }),
  
  setAuth: async (token: string, user: User) => {
    try {
      if (Platform.OS !== 'web') {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
      } else {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      }
      set({ token, user });
    } catch (e) {
      console.error('Error saving auth state', e);
    }
  },
  
  logout: async () => {
    try {
      if (Platform.OS !== 'web') {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(USER_KEY);
      } else {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
      set({ token: null, user: null });
    } catch (e) {
      console.error('Error logging out', e);
    }
  },
  
  hydrate: async () => {
    try {
      let token = null;
      let userStr = null;
      
      if (Platform.OS !== 'web') {
        token = await SecureStore.getItemAsync(TOKEN_KEY);
        userStr = await SecureStore.getItemAsync(USER_KEY);
      } else {
        token = localStorage.getItem(TOKEN_KEY);
        userStr = localStorage.getItem(USER_KEY);
      }
      
      if (token && userStr) {
        set({ token, user: JSON.parse(userStr), isLoading: false });
      } else {
        set({ token: null, user: null, isLoading: false });
      }
    } catch (e) {
      console.error('Error hydrating auth state', e);
      set({ token: null, user: null, isLoading: false });
    }
  },
  
  completeOnboarding: () => {
    set((state) => {
      if (!state.user) return state;
      const updatedUser = { ...state.user, needsOnboarding: false };
      
      // Update persistent storage
      if (Platform.OS !== 'web') {
        SecureStore.setItemAsync(USER_KEY, JSON.stringify(updatedUser)).catch(console.error);
      } else {
        localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
      }
      
      return { user: updatedUser, justFinishedOnboarding: true };
    });
  },

  updateUser: (data: Partial<User>) => {
    set((state) => {
      if (!state.user) return state;
      const updatedUser = { ...state.user, ...data };
      
      if (Platform.OS !== 'web') {
        SecureStore.setItemAsync(USER_KEY, JSON.stringify(updatedUser)).catch(console.error);
      } else {
        localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
      }

      return { user: updatedUser };
    });
  }
}));
