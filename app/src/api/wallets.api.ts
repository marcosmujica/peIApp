import { Platform } from 'react-native';
import { apiClient } from "@/api/api.client";

export type WalletType = 'personal' | 'business' | 'shared' | 'casa' | 'negocio' | 'gastos_compartidos' | 'otro';

export interface WalletSummary {
  id: string;
  name: string;
  type: WalletType;
  currency: string;
  balance: number;
  members?: WalletMember[];
  defaultPaymentMethod?: string;
  helpToCollect?: boolean;
  avatarUrl?: string;
  distributionLists?: any[];
  warningThreshold?: number;
  alertThreshold?: number;
  defaultTransactionType?: 'income' | 'expense';
  includeInGeneralBalance?: boolean;
  goals?: any[];
  enabledPanels?: string[];
  enabledCategories?: Array<{ categoryKey: string; type: 'income' | 'expense' }>;
}

export interface WalletMember {
  userId: string;
  phone?: string;
  displayName: string;
  avatarUrl?: string;
  role: string;
}

export interface CreateWalletResponse {
  id: string;
  name: string;
  type: string;
  currency: string;
  defaultPaymentMethod?: string;
  helpToCollect?: boolean;
  avatarUrl?: string;
  defaultTransactionType?: 'income' | 'expense';
  includeInGeneralBalance?: boolean;
}

export const walletsApi = {
  /**
   * Obtiene las billeteras del usuario autenticado desde el servidor
   */
  getMyWallets: async (): Promise<WalletSummary[]> => {
    const { data } = await apiClient.get<WalletSummary[]>('/wallets/mine', { skipGlobalLoading: true } as any);
    return data;
  },

  /**
   * Crea una nueva billetera en el servidor
   */
  createWallet: async (name: string, type: string, defaultPaymentMethod?: string, currency?: string, helpToCollect?: boolean, warningThreshold?: number, alertThreshold?: number, defaultTransactionType?: 'income' | 'expense', includeInGeneralBalance?: boolean): Promise<CreateWalletResponse> => {
    const { data } = await apiClient.post<CreateWalletResponse>('/wallets/create', { name, type, defaultPaymentMethod, currency, helpToCollect, warningThreshold, alertThreshold, defaultTransactionType, includeInGeneralBalance });
    return data;
  },

  setupOnboarding: async (data: { businessType: string | null; splitPercentage: number }): Promise<{ defaultWalletId?: string }> => {
    try {
      const res = await apiClient.post('/wallets/onboarding', data);
      return res.data;
    } catch (e) {
      console.warn('Backend endpoint /wallets/onboarding not fully ready, bypassing...', e);
      return {};
    }
  },

  updateMembers: async (walletId: string, members: { userId: string, displayName: string }[]): Promise<void> => {
    await apiClient.post(`/wallets/${walletId}/members`, { members });
  },

  getWalletMembers: async (walletId: string): Promise<WalletMember[]> => {
    const { data } = await apiClient.get<WalletMember[]>(`/wallets/${walletId}/members`, { skipGlobalLoading: true } as any);
    return data;
  },

  updateWallet: async (walletId: string, data: { name?: string, defaultPaymentMethod?: string, defaultTransactionType?: 'income' | 'expense', helpToCollect?: boolean, avatarUrl?: string, distributionLists?: any[], warningThreshold?: number, alertThreshold?: number, includeInGeneralBalance?: boolean, goals?: any[], enabledPanels?: string[], enabledCategories?: { categoryKey: string; type: 'income' | 'expense' }[] }): Promise<void> => {
    await apiClient.put(`/wallets/${walletId}`, data);
  },

  uploadAvatar: async (walletId: string, imageUri: string) => {
    const formData = new FormData();
    const filename = `wallet_avatar_${Date.now()}.jpg`;
    const type = 'image/jpeg';

    if (Platform.OS === 'web') {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        formData.append('file', blob, filename);
    } else {
        formData.append('file', {
            uri: imageUri,
            name: filename,
            type
        } as any);
    }

    const { API_URL } = await import('./api.client');
    const { useAuthStore } = await import('../store/auth.store');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    try {
        const res = await fetch(`${API_URL}/wallets/${encodeURIComponent(walletId)}/avatar`, {
            method: 'POST',
            body: formData,
            headers: {
                Authorization: `Bearer ${useAuthStore.getState().token}`
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: 'Error desconocido en el servidor' }));
            throw new Error(err.message || 'Error al subir avatar de billetera');
        }
        
        return res.json();
    } catch (error: any) {
        clearTimeout(timeoutId);
        console.error('[walletsApi.uploadAvatar] Error:', error);
        if (error.name === 'AbortError') {
            throw new Error('Tiempo de espera agotado al subir la imagen');
        }
        throw error;
    }
  },

  reconcile: async (walletId: string, settlements: { fromId: string, toId: string, amount: number }[]): Promise<{ success: boolean, count: number }> => {
    const { data } = await apiClient.post<{ success: boolean, count: number }>(`/wallets/${walletId}/reconcile`, { settlements });
    return data;
  }
};

