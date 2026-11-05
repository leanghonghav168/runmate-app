import { ActivityRepository } from '../database/repositories/activity.repository.js';
import { LocationRepository } from '../database/repositories/location.repository.js';
import { api } from './api.service.js';
import { NetworkService } from './network.service.js';

export interface SyncResult {
  success: boolean;
  syncedActivities: number;
  syncedPoints: number;
  error?: string;
}

export class SyncService {
  private static isSyncing = false;

  /**
   * Performs an idempotent batch upload of pending offline activities and points to the NestJS backend.
   */
  static async syncPendingData(userId: string): Promise<SyncResult> {
    if (this.isSyncing) {
      return {
        success: false,
        syncedActivities: 0,
        syncedPoints: 0,
        error: 'Sync already in progress',
      };
    }

    const online = await NetworkService.isConnected();
    if (!online) {
      return {
        success: false,
        syncedActivities: 0,
        syncedPoints: 0,
        error: 'Device is offline',
      };
    }

    this.isSyncing = true;

    try {
      // 1. Gather all pending activities for this user
      const pendingActivities = await ActivityRepository.getPendingSyncActivities(userId);
      if (pendingActivities.length === 0) {
        return { success: true, syncedActivities: 0, syncedPoints: 0 };
      }

      // 2. Fetch pending coordinates and construct batch payload
      const activitiesPayload = [];
      const pointIdMap: Record<string, string[]> = {};

      for (const act of pendingActivities) {
        const points = await LocationRepository.getPendingPoints(act.id);
        pointIdMap[act.id] = points.map((p) => p.id);

        activitiesPayload.push({
          id: act.id,
          activityType: act.activity_type,
          status: act.status,
          distanceMeters: act.distance_meters,
          durationSeconds: act.duration_seconds,
          averageSpeed: act.average_speed,
          maxSpeed: act.max_speed,
          averagePace: act.average_pace,
          startedAt: act.started_at,
          endedAt: act.ended_at,
          points: points.map((p) => ({
            id: p.id,
            latitude: p.latitude,
            longitude: p.longitude,
            altitude: p.altitude,
            accuracy: p.accuracy,
            speed: p.speed,
            heading: p.heading,
            recordedAt: p.recorded_at,
          })),
        });
      }

      // 3. Post batch to backend /sync endpoint
      const response = await api.post('/sync', { activities: activitiesPayload });
      const { syncedActivityIds, totalPointsInserted } = response.data;

      // 4. Mark local SQLite records as SYNCED without deleting history
      for (const id of syncedActivityIds || []) {
        await ActivityRepository.markAsSynced(id);
        const pointsForAct = pointIdMap[id] || [];
        if (pointsForAct.length > 0) {
          await LocationRepository.markPointsSynced(pointsForAct);
        }
      }

      return {
        success: true,
        syncedActivities: syncedActivityIds?.length || 0,
        syncedPoints: totalPointsInserted || 0,
      };
    } catch (err: any) {
      console.warn('Sync failed:', err?.message || err);
      return {
        success: false,
        syncedActivities: 0,
        syncedPoints: 0,
        error: err?.response?.data?.message || err?.message || 'Sync failed',
      };
    } finally {
      this.isSyncing = false;
    }
  }
}

