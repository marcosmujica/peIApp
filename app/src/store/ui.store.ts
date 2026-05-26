import { create } from 'zustand';

interface UIState {
  isGlobalLoading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
  toast: {
    message: string;
    visible: boolean;
    type?: 'warning' | 'error' | 'success';
    action?: {
      label: string;
      onPress: () => void;
    };
  };
  showToast: (message: string, type?: 'warning' | 'error' | 'success', action?: { label: string; onPress: () => void }) => void;
  hideToast: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isGlobalLoading: false,
  startLoading: () => set({ isGlobalLoading: true }),
  stopLoading: () => set({ isGlobalLoading: false }),
  toast: { message: '', visible: false },
  showToast: (message, type, action) => set({ toast: { message, visible: true, type, action } }),
  hideToast: () => set(state => ({ toast: { ...state.toast, visible: false } })),
}));
