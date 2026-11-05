import { ActivityStatus, ActivityType } from '@runmate/shared';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { ActivityRepository } from '../../src/database/repositories/activity.repository.js';
import type { LocalActivityRecord } from '../../src/database/schema.js';
import { useSyncStore } from '../../src/stores/syncStore.js';

describe('Data Synchronization Store & Services (Phase 8)', () => {
  const testUserId = 'user-sync-test-99';

  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('initializes with default online state and zero pending count', () => {
    const store = useSyncStore();
    expect(store.isOnline).toBe(true);
    expect(store.isSyncing).toBe(false);
    expect(store.pendingCount).toBe(0);
    expect(store.isAllSynced).toBe(true);
    expect(store.syncStatusText).toBe('Cloud synced');
  });

  it('updates pending count when offline activity is added to SQLite', async () => {
    const store = useSyncStore();

    const act: LocalActivityRecord = {
      id: 'activity-pending-sync-1',
      user_id: testUserId,
      activity_type: ActivityType.RUNNING,
      status: ActivityStatus.COMPLETED,
      distance_meters: 4200,
      duration_seconds: 1200,
      average_speed: 3.5,
      max_speed: 4.8,
      average_pace: 4.76,
      started_at: '2026-11-05T09:00:00Z',
      ended_at: '2026-11-05T09:20:00Z',
      sync_status: 'PENDING',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };

    await ActivityRepository.insert(act);
    await store.refreshPendingCount(testUserId);

    expect(store.pendingCount).toBeGreaterThanOrEqual(1);
    expect(store.syncStatusText).toMatch(/pending/);
  });

  it('marks activity as synced and reflects zero pending', async () => {
    const store = useSyncStore();

    await ActivityRepository.markAsSynced('activity-pending-sync-1');
    const updated = await ActivityRepository.findById('activity-pending-sync-1');
    expect(updated?.sync_status).toBe('SYNCED');

    await store.refreshPendingCount(testUserId);
    expect(store.pendingCount).toBe(0);
    expect(store.isAllSynced).toBe(true);
  });
});

