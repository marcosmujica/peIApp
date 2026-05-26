import { getLocalDB } from "@/db/db.factory";
import { useAppStore } from "@/store/app.store";
import apiClient from "@/api/client";

const LAST_SYNC_KEY = "peiapp_last_sync_at";

async function getLastSyncAt(): Promise<string | null> {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return localStorage.getItem(LAST_SYNC_KEY);
    }
    const { default: SecureStore } = await import("expo-secure-store");
    return await SecureStore.getItemAsync(LAST_SYNC_KEY);
  } catch {
    return null;
  }
}

async function setLastSyncAt(ts: string): Promise<void> {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(LAST_SYNC_KEY, ts);
      return;
    }
    const { default: SecureStore } = await import("expo-secure-store");
    await SecureStore.setItemAsync(LAST_SYNC_KEY, ts);
  } catch {
    // Ignore
  }
}

async function pushPendingQueue(): Promise<void> {
  const db = await getLocalDB();
  const pending = await db.getPendingSyncItems();

  for (const item of pending) {
    try {
      await db.updateSyncItemStatus(item.id, "syncing");
      await apiClient.post("/sync/push", {
        operation_type: item.operation_type,
        payload: JSON.parse(item.payload_json),
        local_created_at: item.local_created_at,
      });
      await db.updateSyncItemStatus(item.id, "done");
    } catch {
      await db.incrementSyncRetry(item.id);
      await db.updateSyncItemStatus(item.id, "error");
    }
  }

  await db.clearDoneSyncItems();
}

async function pullServerChanges(): Promise<void> {
  const since = await getLastSyncAt();
  const now = new Date().toISOString();

  try {
    // Pull server changes since last sync (only user's own data)
    await apiClient.get("/sync/pull", { params: { since } });
    // TODO (Fase 3): Aplicar cambios a la DB local según tipo de entidad
    await setLastSyncAt(now);
  } catch {
    // Ignore — app sigue funcionando offline
  }
}

export const syncService = {
  runSync: async (): Promise<void> => {
    const { setSyncStatus } = useAppStore.getState();
    setSyncStatus("syncing");

    try {
      await pushPendingQueue();
      await pullServerChanges();
      setSyncStatus("success");
      setTimeout(() => setSyncStatus("idle"), 3000);
    } catch {
      setSyncStatus("error");
    }
  },
};
