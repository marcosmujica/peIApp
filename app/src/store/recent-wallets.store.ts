import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENT_WALLETS_KEY = 'peiapp-recent-wallets';

interface RecentWalletsState {
  recentWallets: { id: string; timestamp: number }[];
  isLoaded: boolean;
  addRecentWallet: (id: string) => Promise<void>;
  loadRecentWallets: () => Promise<void>;
}

export const useRecentWalletsStore = create<RecentWalletsState>((set, get) => ({
  recentWallets: [],
  isLoaded: false,
  
  loadRecentWallets: async () => {
    if (get().isLoaded) return;
    try {
      const stored = await AsyncStorage.getItem(RECENT_WALLETS_KEY);
      if (stored) {
        set({ recentWallets: JSON.parse(stored), isLoaded: true });
      } else {
        set({ isLoaded: true });
      }
    } catch (e) {
      console.error('Error loading recent wallets', e);
      set({ isLoaded: true });
    }
  },

  addRecentWallet: async (id: string) => {
    try {
      if (!get().isLoaded) {
        await get().loadRecentWallets();
      }
      const now = Date.now();
      const current = get().recentWallets;
      const filtered = current.filter(w => w.id !== id);
      const updated = [{ id, timestamp: now }, ...filtered].slice(0, 10);
      
      set({ recentWallets: updated });
      await AsyncStorage.setItem(RECENT_WALLETS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving recent wallet', e);
    }
  },
}));
