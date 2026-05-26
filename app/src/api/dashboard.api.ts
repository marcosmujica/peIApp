import { apiClient } from './api.client';
import { WalletCardProps } from '@/components/ui/WalletCard';

export interface DashboardSummary {
  totalBalance: number;
  wallets: WalletCardProps[];
  recentTransactions: any[];
}

export const dashboardApi = {
  getSummary: async (): Promise<DashboardSummary> => {
    const response = await apiClient.get<DashboardSummary>('/wallets/summary', { skipGlobalLoading: true } as any);
    return response.data;
  },
};
