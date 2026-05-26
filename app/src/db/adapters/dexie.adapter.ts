import Dexie, { Table } from "dexie";
import { ILocalDB, SyncQueueItem } from "../ILocalDB";
import { generateId } from "@/utils/id";

class PeiAppDexie extends Dexie {
  sync_queue!: Table<SyncQueueItem, string>;

  constructor() {
    super("peiapp_db");
    this.version(1).stores({
      sync_queue: "id, operation_type, local_created_at, status, retry_count",
    });
  }
}

export class DexieAdapter implements ILocalDB {
  private dexie: PeiAppDexie;

  constructor() {
    this.dexie = new PeiAppDexie();
  }

  async init(): Promise<void> {
    await this.dexie.open();
  }

  async enqueueSyncItem(
    item: Omit<SyncQueueItem, "id" | "status" | "retry_count">
  ): Promise<void> {
    await this.dexie.sync_queue.add({
      id: generateId(),
      ...item,
      status: "pending",
      retry_count: 0,
    });
  }

  async getPendingSyncItems(): Promise<SyncQueueItem[]> {
    return await this.dexie.sync_queue
      .where("status")
      .equals("pending")
      .sortBy("local_created_at");
  }

  async updateSyncItemStatus(id: string, status: SyncQueueItem["status"]): Promise<void> {
    await this.dexie.sync_queue.update(id, { status });
  }

  async incrementSyncRetry(id: string): Promise<void> {
    const item = await this.dexie.sync_queue.get(id);
    if (item) {
      await this.dexie.sync_queue.update(id, {
        retry_count: item.retry_count + 1,
      });
    }
  }

  async clearDoneSyncItems(): Promise<void> {
    await this.dexie.sync_queue.where("status").equals("done").delete();
  }

  // Generic raw query (Dexie doesn't support raw SQL — these are no-ops for web)
  async execute(_sql: string, _params?: unknown[]): Promise<void> {
    console.warn("[DexieAdapter] execute() — use Dexie methods directly for Web.");
  }

  async query<T = Record<string, unknown>>(
    _sql: string,
    _params?: unknown[]
  ): Promise<T[]> {
    console.warn("[DexieAdapter] query() — use Dexie methods directly for Web.");
    return [];
  }
}
