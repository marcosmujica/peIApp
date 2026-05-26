import { Platform } from 'react-native';
import { apiClient, API_URL } from './api.client';
import { useAuthStore } from '../store/auth.store';

export const usersApi = {
    updateProfile: async (userId: string, data: { 
        displayName?: string; 
        country?: string; 
        currency?: string; 
        pushEnabled?: boolean; 
        defaultPaymentProcedure?: string; 
        gender?: string; 
        age?: number; 
        theme?: string;
        defaultWalletId?: string;
        preferredNotificationTime?: string;
        dailyReportsEnabled?: boolean;
        monthlyReportsEnabled?: boolean;
        transactionNotificationsEnabled?: boolean;
        lastAccess?: Date;
    }) => {
        const res = await apiClient.patch(`/users/${encodeURIComponent(userId)}`, data);
        return res.data;
    },
    
    uploadAvatar: async (userId: string, imageUri: string) => {
        const formData = new FormData();
        const filename = `avatar_${Date.now()}.jpg`;
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

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

        try {
            const res = await fetch(`${API_URL}/users/${encodeURIComponent(userId)}/avatar`, {
                method: 'POST',
                body: formData,
                headers: {
                    Authorization: `Bearer ${useAuthStore.getState().token}`
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!res.ok) {
                const text = await res.text();
                let errorMessage = 'Error al subir avatar';
                try {
                    const err = JSON.parse(text);
                    errorMessage = err.message || errorMessage;
                } catch (e) {
                    errorMessage = text || res.statusText || errorMessage;
                }
                
                const error: any = new Error(errorMessage);
                error.status = res.status;
                throw error;
            }
            
            return res.json();
        } catch (error: any) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Tiempo de espera agotado');
            }
            throw error;
        }
    }
};
