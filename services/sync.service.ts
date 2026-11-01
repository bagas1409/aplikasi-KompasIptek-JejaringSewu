import NetInfo from "@react-native-community/netinfo";
import { getPendingOfflineTasks, markTaskCompleted, incrementTaskRetry } from "./sqlite.service";
import { apiClient } from "./api";

let isSyncing = false;

export async function syncOfflineQueue(): Promise<{ synced: number; failed: number }> {
  if (isSyncing) return { synced: 0, failed: 0 };

  const net = await NetInfo.fetch();
  if (!net.isConnected || !net.isInternetReachable) {
    return { synced: 0, failed: 0 };
  }

  isSyncing = true;
  let synced = 0;
  let failed = 0;

  try {
    const tasks = await getPendingOfflineTasks();
    for (const task of tasks) {
      try {
        const payload = JSON.parse(task.payload);
        await apiClient({
          url: task.endpoint,
          method: task.method,
          data: payload,
          headers: {
            "X-Idempotency-Key": task.idempotency_key,
          },
        });
        await markTaskCompleted(task.id);
        synced++;
      } catch (err) {
        await incrementTaskRetry(task.id);
        failed++;
      }
    }
  } finally {
    isSyncing = false;
  }

  return { synced, failed };
}

// Listener perubahan koneksi
export function setupAutoSyncListener(onSyncComplete?: (synced: number) => void) {
  return NetInfo.addEventListener(async (state) => {
    if (state.isConnected && state.isInternetReachable) {
      const res = await syncOfflineQueue();
      if (res.synced > 0 && onSyncComplete) {
        onSyncComplete(res.synced);
      }
    }
  });
}
