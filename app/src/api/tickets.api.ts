import { Platform } from 'react-native';
import { apiClient } from './api.client';

export interface CreateTicketDto {
  walletId: string;
  type: 'income' | 'expense';
  amount: number;
  currency: string;
  description: string;
  contactName?: string;
  toUser?: string;
  dueDate: Date;
  status: 'pending' | 'completed' | 'cancelled';
  paymentMethod?: string;
  paymentProcedure?: string;
  privateNote?: string;
  generatePeilink: boolean;
  helpToCollect: boolean;
  expenses?: number;
  expensesDetail?: string;
  reference?: string;
  attachmentUrl?: string;
  initialAmount?: number;
  initialDueDate?: string;
  comment?: string;
  ownerRating?: number;
  participantRating?: number;
  shortId?: string;
  toWalletId?: string;
  toRubro?: string;
}


export interface TicketResponse extends CreateTicketDto {
  ticketId: string;
  ownerId: string;
  owner?: {
    displayName?: string;
    avatarUrl?: string;
  };
  createdAt: string;
  updatedAt: string;
  amountPaid?: any;
  ownerRating?: number;
  participantRating?: number;
  shortId?: string;
  toUserObj?: {
    userId: string;
    phone: string;
    displayName?: string;
    avatarUrl?: string;
  };
  ownerUserObj?: {
    userId: string;
    phone: string;
    displayName?: string;
    avatarUrl?: string;
  };
  lastChatMessage?: string;
  lastChatMessageTimestamp?: string;
  lastChatSenderId?: string;
}


export const ticketsApi = {
  createTicket: async (data: CreateTicketDto): Promise<TicketResponse> => {
    console.log('[DEBUG] createTicket called with payload:', JSON.stringify(data, null, 2));
    const response = await apiClient.post<TicketResponse>('/tickets', data);
    return response.data;
  },

  updateTicket: async (id: string, data: Partial<CreateTicketDto>): Promise<TicketResponse> => {
    const response = await apiClient.patch<TicketResponse>(`/tickets/${id}`, data);
    return response.data;
  },

  getTicketsByWallet: async (walletId: string): Promise<TicketResponse[]> => {
    const response = await apiClient.get<TicketResponse[]>(`/tickets/wallet/${walletId}`, { skipGlobalLoading: true } as any);
    return response.data;
  },

  getMyTickets: async (): Promise<TicketResponse[]> => {
    const response = await apiClient.get<TicketResponse[]>('/tickets/my', { skipGlobalLoading: true } as any);
    return response.data;
  },

  addChatMessage: async (
    ticketId: string, 
    message?: string, 
    senderName?: string,
    attachmentUrl?: string,
    attachmentType?: string,
    replyToChatId?: string,
    replyToMessage?: string,
    replyToSenderName?: string
  ): Promise<any> => {
    const response = await apiClient.post(`/tickets/${ticketId}/chat`, { 
      message, 
      senderName,
      attachmentUrl,
      attachmentType,
      replyToChatId,
      replyToMessage,
      replyToSenderName,
    });
    return response.data;
  },

  getChatMessages: async (ticketId: string): Promise<any[]> => {
    const response = await apiClient.get<any[]>(`/tickets/${ticketId}/chat`);
    return response.data;
  },

  uploadChatFile: async (ticketId: string, fileUri: string, fileName: string, type: string): Promise<any> => {
    try {
      const formData = new FormData();
      
      if (Platform.OS === 'web') {
        const responseBlob = await fetch(fileUri);
        const blob = await responseBlob.blob();
        formData.append('file', blob, fileName);
      } else {
        const fileToUpload: any = {
          uri: Platform.OS === 'android' ? fileUri : fileUri.replace('file://', ''),
          name: fileName || `upload_${Date.now()}`,
          type: type || 'application/octet-stream',
        };
        formData.append('file', fileToUpload as any);
      }

      const response = await apiClient.post(`/tickets/chat/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (err: any) {
      console.error("[ChatAPI] Upload Error Data:", err.response?.data || err.message);
      throw err;
    }
  },

  uploadTicketFile: async (fileUri: string): Promise<any> => {
    try {
      const formData = new FormData();
      const fileName = fileUri.split('/').pop() || `ticket_${Date.now()}`;
      
      if (Platform.OS === 'web') {
        try {
          const responseBlob = await fetch(fileUri);
          const blob = await responseBlob.blob();
          formData.append('file', blob, fileName);
        } catch (fetchErr) {
          console.warn("[TicketsAPI] Blob fetch failed, URL might be expired:", fileUri);
          throw new Error("El archivo seleccionado ya no es válido o ha expirado.");
        }
      } else {
        const fileToUpload: any = {
          uri: Platform.OS === 'android' ? fileUri : fileUri.replace('file://', ''),
          name: fileName,
          type: fileUri.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
        };
        formData.append('file', fileToUpload as any);
      }

      // Reusamos el endpoint de upload general
      const response = await apiClient.post(`/tickets/chat/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (err: any) {
      console.error("[TicketsAPI] General Upload Error:", err.message);
      throw err;
    }

  },

  updateTicketDueDate: async (id: string, dueDate: Date): Promise<TicketResponse> => {
    const response = await apiClient.patch<TicketResponse>(`/tickets/${id}/due-date`, { dueDate });
    return response.data;
  },
  getTicketLogs: async (id: string): Promise<any[]> => {
    const response = await apiClient.get<any[]>(`/tickets/${id}/logs`);
    return response.data;
  },
  recordPayment: async (id: string, data: { amount: number; paymentMethod: string; description?: string; attachmentUrl?: string }): Promise<TicketResponse> => {
    const response = await apiClient.post<TicketResponse>(`/tickets/${id}/payment`, data);
    return response.data;
  },
  cancelTicket: async (id: string, reason?: string): Promise<TicketResponse> => {
    const response = await apiClient.post<TicketResponse>(`/tickets/${id}/cancel`, { reason });
    return response.data;
  },

  // RECURRING TICKETS
  createRecurringTicket: async (data: any): Promise<any> => {
    const response = await apiClient.post('/tickets/recurring', data);
    return response.data;
  },

  getMyRecurringTickets: async (): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/tickets/recurring/my', { skipGlobalLoading: true } as any);
    return response.data;
  },

  updateRecurringTicket: async (id: string, data: any): Promise<any> => {
    const response = await apiClient.patch(`/tickets/recurring/${id}`, data);
    return response.data;
  },

  toggleRecurringTicket: async (id: string): Promise<any> => {
    const response = await apiClient.post(`/tickets/recurring/${id}/toggle`);
    return response.data;
  },

  deleteRecurringTicket: async (id: string): Promise<void> => {
    await apiClient.delete(`/tickets/recurring/${id}`);
  },

  getMyPaymentLogs: async (): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/tickets/payments/my', { skipGlobalLoading: true } as any);
    return response.data;
  },
};



