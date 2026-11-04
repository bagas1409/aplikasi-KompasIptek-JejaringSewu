import type * as SQLiteTypes from "expo-sqlite";

let dbInstance: SQLiteTypes.SQLiteDatabase | null = null;
let memoryFallbackQueue: OfflineTask[] = [];

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

export async function getDatabase(): Promise<SQLiteTypes.SQLiteDatabase | null> {
  if (dbInstance) {
    return dbInstance;
  }

  try {
    // Lazy-load expo-sqlite agar tidak memicu crash sinkron saat inisialisasi modul/route
    // jika ExpoContext sedang di-reload oleh Expo Go.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const SQLite = require("expo-sqlite") as typeof SQLiteTypes;
    const db = await SQLite.openDatabaseAsync("jejaring_offline.db");
    await initTables(db);
    dbInstance = db;
    return dbInstance;
  } catch (err) {
    console.warn(
      "⚠️ [SQLite] Modul native SQLite belum siap atau ExpoContext tertutup, beralih ke antrean memori sementara:",
      err
    );
    dbInstance = null;
    return null;
  }
}

async function initTables(db: SQLiteTypes.SQLiteDatabase) {
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

export async function queueOfflineTask(
  id: string,
  idempotencyKey: string,
  endpoint: string,
  method: string,
  payload: any
): Promise<void> {
  try {
    const db = await getDatabase();
    if (db) {
      await db.runAsync(
        `INSERT OR REPLACE INTO offline_tx_queue (id, idempotency_key, endpoint, method, payload, created_at, retry_count, status)
         VALUES (?, ?, ?, ?, ?, ?, 0, 'PENDING');`,
        [id, idempotencyKey, endpoint, method, JSON.stringify(payload), Date.now()]
      );
      return;
    }
  } catch (err) {
    console.warn("⚠️ [SQLite] Gagal menyimpan ke DB lokal, menggunakan fallback memori:", err);
    dbInstance = null;
  }

  // Fallback in-memory
  const existingIdx = memoryFallbackQueue.findIndex((t) => t.id === id);
  const task: OfflineTask = {
    id,
    idempotency_key: idempotencyKey,
    endpoint,
    method,
    payload: JSON.stringify(payload),
    created_at: Date.now(),
    retry_count: 0,
    status: "PENDING",
  };
  if (existingIdx >= 0) {
    memoryFallbackQueue[existingIdx] = task;
  } else {
    memoryFallbackQueue.push(task);
  }
}

export async function getPendingOfflineTasks(): Promise<OfflineTask[]> {
  try {
    const db = await getDatabase();
    if (db) {
      return await db.getAllAsync<OfflineTask>(
        `SELECT * FROM offline_tx_queue WHERE status = 'PENDING' ORDER BY created_at ASC;`
      );
    }
  } catch (err) {
    console.warn("⚠️ [SQLite] Gagal membaca antrean offline dari DB:", err);
    dbInstance = null;
  }

  return memoryFallbackQueue.filter((t) => t.status === "PENDING");
}

export async function markTaskCompleted(id: string): Promise<void> {
  try {
    const db = await getDatabase();
    if (db) {
      await db.runAsync(`DELETE FROM offline_tx_queue WHERE id = ?;`, [id]);
    }
  } catch (err) {
    console.warn("⚠️ [SQLite] Gagal menghapus task dari DB:", err);
    dbInstance = null;
  }

  memoryFallbackQueue = memoryFallbackQueue.filter((t) => t.id !== id);
}

export async function incrementTaskRetry(id: string): Promise<void> {
  try {
    const db = await getDatabase();
    if (db) {
      await db.runAsync(
        `UPDATE offline_tx_queue SET retry_count = retry_count + 1 WHERE id = ?;`,
        [id]
      );
    }
  } catch (err) {
    console.warn("⚠️ [SQLite] Gagal update retry_count di DB:", err);
    dbInstance = null;
  }

  memoryFallbackQueue = memoryFallbackQueue.map((t) =>
    t.id === id ? { ...t, retry_count: t.retry_count + 1 } : t
  );
}

