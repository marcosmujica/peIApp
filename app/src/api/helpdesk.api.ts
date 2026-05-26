import { apiClient } from './api.client';

export const helpdeskApi = {
  sendMessage: async (message: string, userId?: string) => {
    const response = await apiClient.post('/helpdesk', { message, userId });
    return response.data;
  },
};
