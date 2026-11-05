import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { ActivityRepository } from '../database/repositories/activity.repository.js';
import { NetworkService } from '../services/network.service.js';
import { SyncService } from '../services/sync.service.js';

export const useSyncStore = defineStore('sync', () => {
  const isOnline = ref<boolean>(true);
  const isSyncing = ref<boolean>(false);
  const pendingCount = ref<number>(0);
  const lastSyncedAt = ref<Date | null>(null);
  const syncError = ref<string | null>(null);
  let isListenerInitialized = false;

  const isAllSynced = computed(() => pendingCount.value === 0 && !isSyncing.value);

  const syncStatusText = computed(() => {
    if (!isOnline.value) return 'Offline';
    if (isSyncing.value) return 'Syncing...';
    if (pendingCount.value > 0) return `${pendingCount.value} pending`;
    return 'Cloud synced';
  });

  /**
   * Initializes network and app lifecycle listeners for auto-synchronization.
   */
  async function initListeners(userId?: string) {
    if (isListenerInitialized) return;

    const status = await NetworkService.initialize();
    isOnline.value = status.connected;

    NetworkService.onStatusChange(async (netStatus) => {
      isOnline.value = netStatus.connected;
      if (netStatus.connected && userId) {
        await syncNow(userId);
      }
    });

    window.addEventListener('network:online', async () => {
      isOnline.value = true;
      if (userId) {
        await syncNow(userId);
      }
    });

    window.addEventListener('network:offline', () => {
      isOnline.value = false;
    });

    if (userId) {
      await refreshPendingCount(userId);
    }

    isListenerInitialized = true;
  }

  /**
   * Refreshes the count of unsynced activities in SQLite.
   */
  async function refreshPendingCount(userId: string) {
    try {
      pendingCount.value = await ActivityRepository.countPending(userId);
    } catch (err) {
      console.warn('Error counting pending activities:', err);
    }
  }

  /**
   * Triggers an immediate synchronization cycle.
   */
  async function syncNow(userId: string) {
    if (!isOnline.value || isSyncing.value) return;

    isSyncing.value = true;
    syncError.value = null;

    try {
      const res = await SyncService.syncPendingData(userId);
      if (res.success) {
        lastSyncedAt.value = new Date();
        await refreshPendingCount(userId);
      } else if (res.error) {
        syncError.value = res.error;
      }
    } catch (err: any) {
      syncError.value = err?.message || 'Sync failed';
    } finally {
      isSyncing.value = false;
    }
  }

  return {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncedAt,
    syncError,
    isAllSynced,
    syncStatusText,
    initListeners,
    refreshPendingCount,
    syncNow,
  };
});

