import { apiClient } from './api.client';

export interface RequestOtpDto {
  phoneNumber: string;
  country?: string;
  currency?: string;
}

export interface VerifyOtpDto {
  phoneNumber: string;
  code: string;
}

export interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    phoneNumber: string;
    needsOnboarding: boolean;
    avatarUrl?: string;
    displayName?: string;
    country?: string;
    currency?: string;
    pushEnabled?: boolean;
  };
}

export const authApi = {
  requestOtp: async (data: RequestOtpDto): Promise<void> => {
    await apiClient.post('/auth/request-otp', data);
  },

  verifyOtp: async (data: VerifyOtpDto): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/verify-otp', data);
    return response.data;
  },
};
