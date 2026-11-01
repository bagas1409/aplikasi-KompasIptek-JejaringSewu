import * as SQLite from "expo-sqlite";

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync("jejaring_offline.db");
    await initTables(dbInstance);
  }
  return dbInstance;
}

async function initTables(db: SQLite.SQLiteDatabase) {
  // Tabel antrean transaksi saat sinyal blank-spot
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS offline_tx_queue (
      id TEXT PRIMARY KEY,
      idempotency_key TEXT UNIQUE,
      endpoint TEXT NOT NULL,
      method TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      retry_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'PENDING'
    );
  `);
}

export interface OfflineTask {
  id: string;
  idempotency_key: string;
  endpoint: string;
  method: string;
  payload: string;
  created_at: number;
  retry_count: number;
  status: string;
}

export async function queueOfflineTask(
  id: string,
  idempotencyKey: string,
  endpoint: string,
  method: string,
  payload: any
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO offline_tx_queue (id, idempotency_key, endpoint, method, payload, created_at, retry_count, status)
     VALUES (?, ?, ?, ?, ?, ?, 0, 'PENDING');`,
    [id, idempotencyKey, endpoint, method, JSON.stringify(payload), Date.now()]
  );
}

export async function getPendingOfflineTasks(): Promise<OfflineTask[]> {
  const db = await getDatabase();
  return await db.getAllAsync<OfflineTask>(
    `SELECT * FROM offline_tx_queue WHERE status = 'PENDING' ORDER BY created_at ASC;`
  );
}

export async function markTaskCompleted(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM offline_tx_queue WHERE id = ?;`, [id]);
}

export async function incrementTaskRetry(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE offline_tx_queue SET retry_count = retry_count + 1 WHERE id = ?;`,
    [id]
  );
}
