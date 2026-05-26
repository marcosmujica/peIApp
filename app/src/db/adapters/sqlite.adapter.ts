import * as SQLite from "expo-sqlite";
import { ILocalDB, SyncQueueItem } from "../ILocalDB";
import { generateId } from "@/utils/id";

export class SqliteAdapter implements ILocalDB {
  private db: SQLite.SQLiteDatabase | null = null;

  async init(): Promise<void> {
    this.db = await SQLite.openDatabaseAsync("peiapp.db");
    await this.createTables();
  }

  private getDb(): SQLite.SQLiteDatabase {
    if (!this.db) throw new Error("SQLiteAdapter: DB not initialized. Call init() first.");
    return this.db;
  }

  private async createTables(): Promise<void> {
    await this.getDb().execAsync(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        operation_type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        local_created_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        retry_count INTEGER NOT NULL DEFAULT 0
      );
    `);
  }

  async enqueueSyncItem(
    item: Omit<SyncQueueItem, "id" | "status" | "retry_count">
  ): Promise<void> {
    const id = generateId();
    await this.getDb().runAsync(
      `INSERT INTO sync_queue (id, operation_type, payload_json, local_created_at, status, retry_count)
       VALUES (?, ?, ?, ?, 'pending', 0)`,
      [id, item.operation_type, item.payload_json, item.local_created_at]
    );
  }

  async getPendingSyncItems(): Promise<SyncQueueItem[]> {
    return await this.getDb().getAllAsync<SyncQueueItem>(
      `SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY local_created_at ASC`
    );
  }

  async updateSyncItemStatus(id: string, status: SyncQueueItem["status"]): Promise<void> {
    await this.getDb().runAsync(
      `UPDATE sync_queue SET status = ? WHERE id = ?`,
      [status, id]
    );
  }

  async incrementSyncRetry(id: string): Promise<void> {
    await this.getDb().runAsync(
      `UPDATE sync_queue SET retry_count = retry_count + 1 WHERE id = ?`,
      [id]
    );
  }

  async clearDoneSyncItems(): Promise<void> {
    await this.getDb().runAsync(`DELETE FROM sync_queue WHERE status = 'done'`);
  }

  async execute(sql: string, params: unknown[] = []): Promise<void> {
    await this.getDb().runAsync(sql, params as SQLite.SQLiteBindValue[]);
  }

  async query<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = []
  ): Promise<T[]> {
    return await this.getDb().getAllAsync<T>(sql, params as SQLite.SQLiteBindValue[]);
  }
}
