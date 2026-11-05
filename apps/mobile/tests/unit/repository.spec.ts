import { ActivityStatus, ActivityType } from '@runmate/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { ActivityRepository } from '../../src/database/repositories/activity.repository.js';
import { LocationRepository } from '../../src/database/repositories/location.repository.js';
import type { LocalActivityRecord, LocalLocationPointRecord } from '../../src/database/schema.js';

describe('Offline Database Repositories', () => {
  const testUserId = 'user-test-offline-1';
  const testActivityId = 'activity-uuid-1001';

  beforeEach(async () => {
    // Reset or prepare database state if needed
  });

  it('inserts and retrieves an activity for a user', async () => {
    const act: LocalActivityRecord = {
      id: testActivityId,
      user_id: testUserId,
      activity_type: ActivityType.RUNNING,
      status: ActivityStatus.COMPLETED,
      distance_meters: 5000,
      duration_seconds: 1500,
      average_speed: 3.33,
      max_speed: 4.5,
      average_pace: 5.0,
      started_at: '2026-11-05T10:00:00.000Z',
      ended_at: '2026-11-05T10:25:00.000Z',
      sync_status: 'PENDING',
      created_at: '2026-11-05T10:25:00.000Z',
      updated_at: '2026-11-05T10:25:00.000Z',
      deleted_at: null,
    };

    await ActivityRepository.insert(act);

    const found = await ActivityRepository.findById(testActivityId);
    expect(found).not.toBeNull();
    if (found) {
      expect(found.id).toBe(testActivityId);
      expect(found.user_id).toBe(testUserId);
      expect(found.distance_meters).toBe(5000);
      expect(found.sync_status).toBe('PENDING');
    }

    const userActivities = await ActivityRepository.findAllByUserId(testUserId);
    expect(userActivities.length).toBeGreaterThanOrEqual(1);
    expect(userActivities.some((a) => a.id === testActivityId)).toBe(true);
  });

  it('filters activities by activity type', async () => {
    const walkAct: LocalActivityRecord = {
      id: 'activity-uuid-walk-2',
      user_id: testUserId,
      activity_type: ActivityType.WALKING,
      status: ActivityStatus.COMPLETED,
      distance_meters: 2100,
      duration_seconds: 1800,
      average_speed: 1.16,
      max_speed: 1.5,
      average_pace: 14.2,
      started_at: '2026-11-05T11:00:00.000Z',
      ended_at: '2026-11-05T11:30:00.000Z',
      sync_status: 'PENDING',
      created_at: '2026-11-05T11:30:00.000Z',
      updated_at: '2026-11-05T11:30:00.000Z',
      deleted_at: null,
    };

    await ActivityRepository.insert(walkAct);

    const walkingOnly = await ActivityRepository.findAllByUserId(testUserId, ActivityType.WALKING);
    expect(walkingOnly.every((a) => a.activity_type === ActivityType.WALKING)).toBe(true);
    expect(walkingOnly.some((a) => a.id === 'activity-uuid-walk-2')).toBe(true);
  });

  it('marks activity as synced', async () => {
    await ActivityRepository.markAsSynced(testActivityId);
    const updated = await ActivityRepository.findById(testActivityId);
    if (updated) {
      expect(updated.sync_status).toBe('SYNCED');
    }
  });

  it('soft deletes an activity', async () => {
    await ActivityRepository.delete(testActivityId);
    const deleted = await ActivityRepository.findById(testActivityId);
    expect(deleted).toBeNull();
  });

  it('inserts and retrieves GPS points for an activity', async () => {
    const points: LocalLocationPointRecord[] = [
      {
        id: 'pt-1',
        activity_id: 'activity-track-gps',
        latitude: 10.7769,
        longitude: 106.7009,
        altitude: 10,
        accuracy: 5,
        speed: 3.2,
        heading: 90,
        recorded_at: '2026-11-05T12:00:00.000Z',
        sync_status: 'PENDING',
      },
      {
        id: 'pt-2',
        activity_id: 'activity-track-gps',
        latitude: 10.7775,
        longitude: 106.7015,
        altitude: 11,
        accuracy: 4,
        speed: 3.4,
        heading: 92,
        recorded_at: '2026-11-05T12:00:05.000Z',
        sync_status: 'PENDING',
      },
    ];

    await LocationRepository.insertBatch(points);

    const fetched = await LocationRepository.getPointsForActivity('activity-track-gps');
    expect(fetched.length).toBe(2);
    expect(fetched[0].latitude).toBe(10.7769);
    expect(fetched[1].latitude).toBe(10.7775);

    const pending = await LocationRepository.getPendingPoints('activity-track-gps');
    expect(pending.length).toBe(2);

    await LocationRepository.markPointsSynced(['pt-1', 'pt-2']);
    const pendingAfter = await LocationRepository.getPendingPoints('activity-track-gps');
    expect(pendingAfter.length).toBe(0);
  });
});

