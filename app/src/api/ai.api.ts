import { apiClient } from './api.client';

export const aiApi = {
  predictRubro: async (description: string, type: 'income' | 'expense', allowedRubros?: any[]): Promise<string | null> => {
    try {
      const { data } = await apiClient.post<{ rubroId: string | null }>('/ai/predict-rubro', { 
        description, 
        type,
        allowedRubros
      }, {
        skipGlobalLoading: true
      } as any);
      return data.rubroId;
    } catch (err) {
      console.error('AI API Error', err);
      return null;
    }
  },
  askWallet: async (params: { walletData: any; userData: any; question: string }): Promise<string | null> => {
    try {
      const { data } = await apiClient.post<{ answer: string | null }>('/ai/ask-wallet', params, {
        timeout: 30000, // 30 seconds for AI specifically
        skipGlobalLoading: true
      } as any);
      return data.answer;
    } catch (err) {
      console.error('AI API Error', err);
      return "Hubo un problema al conectar con la IA.";
    }
  }
};
