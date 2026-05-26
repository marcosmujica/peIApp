/**
 * ILocalDB — Interfaz común para la capa de base de datos local
 * Implementada por SqliteAdapter (iOS/Android) y DexieAdapter (Web)
 */

export interface SyncQueueItem {
  id: string;
  operation_type: "CREATE" | "UPDATE" | "DELETE";
  payload_json: string;
  local_created_at: string; // ISO 8601
  status: "pending" | "syncing" | "done" | "error";
  retry_count: number;
}

export interface ILocalDB {
  // Lifecycle
  init(): Promise<void>;

  // Sync Queue
  enqueueSyncItem(item: Omit<SyncQueueItem, "id" | "status" | "retry_count">): Promise<void>;
  getPendingSyncItems(): Promise<SyncQueueItem[]>;
  updateSyncItemStatus(id: string, status: SyncQueueItem["status"]): Promise<void>;
  incrementSyncRetry(id: string): Promise<void>;
  clearDoneSyncItems(): Promise<void>;

  // Generic
  execute(sql: string, params?: unknown[]): Promise<void>;
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
}
