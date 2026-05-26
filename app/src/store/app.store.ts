import { create } from "zustand";

type SyncStatus = "idle" | "syncing" | "success" | "error";

interface AuthUser {
  userId: string;         // phone E.164
  longUserId: string;     // UUID
  displayName?: string;
  phoneNumber: string;
}

interface AppState {
  // Auth
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;

  // Sync
  syncStatus: SyncStatus;

  // Actions
  setUser: (user: AuthUser, token: string) => void;
  clearAuth: () => void;
  setSyncStatus: (status: SyncStatus) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  syncStatus: "idle",

  setUser: (user, accessToken) =>
    set({ user, accessToken, isAuthenticated: true }),

  clearAuth: () =>
    set({ user: null, accessToken: null, isAuthenticated: false }),

  setSyncStatus: (syncStatus) => set({ syncStatus }),
}));
