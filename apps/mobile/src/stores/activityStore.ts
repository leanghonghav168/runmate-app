import {
  ActivityStatus,
  ActivityType,
  type ActivitySummaryDto,
  type LocationPointDto,
} from '@runmate/shared';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { ActivityRepository } from '../database/repositories/activity.repository.js';
import { LocationRepository } from '../database/repositories/location.repository.js';
import type { LocalActivityRecord, LocalLocationPointRecord } from '../database/schema.js';

export const useActivityStore = defineStore('activity', () => {
  const activities = ref<ActivitySummaryDto[]>([]);
  const isLoaded = ref<boolean>(false);
  const isLoading = ref<boolean>(false);

  // Weekly Stats (Computed or retrieved from SQLite)
  const weeklyTotalDistanceMeters = computed(() => {
    return activities.value.reduce((acc, curr) => acc + curr.distanceMeters, 0);
  });

  const weeklyTotalDistanceKm = computed(() => {
    return (weeklyTotalDistanceMeters.value / 1000).toFixed(1);
  });

  const weeklyTotalDurationMinutes = computed(() => {
    const totalSecs = activities.value.reduce((acc, curr) => acc + curr.durationSeconds, 0);
    return Math.round(totalSecs / 60);
  });

  const totalActivitiesCount = computed(() => {
    return activities.value.length;
  });

  const recentActivities = computed(() => {
    return [...activities.value].sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    );
  });

  /**
   * Load activities from local SQLite database.
   */
  async function loadActivitiesFromDb(userId: string) {
    isLoading.value = true;
    try {
      const records = await ActivityRepository.findAllByUserId(userId);

      if (records.length === 0) {
        // Seed welcome workout for newly registered user so they have initial data
        await seedInitialData(userId);
        const seeded = await ActivityRepository.findAllByUserId(userId);
        activities.value = seeded.map(mapLocalRecordToDto);
      } else {
        activities.value = records.map(mapLocalRecordToDto);
      }

      isLoaded.value = true;
    } catch (err) {
      console.error('Error loading activities from SQLite:', err);
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Saves a newly completed tracking session to SQLite (offline-first).
   */
  async function saveCompletedActivity(
    activity: ActivitySummaryDto,
    points: LocationPointDto[] = [],
  ) {
    const now = new Date().toISOString();

    const localRecord: LocalActivityRecord = {
      id: activity.id,
      user_id: activity.userId,
      activity_type: activity.activityType,
      status: activity.status,
      distance_meters: activity.distanceMeters,
      duration_seconds: activity.durationSeconds,
      average_speed: activity.averageSpeed,
      max_speed: activity.maxSpeed,
      average_pace: activity.averagePace,
      started_at: activity.startedAt,
      ended_at: activity.endedAt,
      sync_status: 'PENDING',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };

    // 1. Insert activity into SQLite
    await ActivityRepository.insert(localRecord);

    // 2. Batch insert location points into SQLite
    if (points.length > 0) {
      const pointRecords: LocalLocationPointRecord[] = points.map((p, idx) => ({
        id: crypto.randomUUID ? crypto.randomUUID() : `${activity.id}-pt-${idx}`,
        activity_id: activity.id,
        latitude: p.latitude,
        longitude: p.longitude,
        altitude: p.altitude,
        accuracy: p.accuracy,
        speed: p.speed,
        heading: p.heading,
        recorded_at: p.recordedAt,
        sync_status: 'PENDING',
      }));

      await LocationRepository.insertBatch(pointRecords);
    }

    // 3. Update in-memory reactive state
    activities.value.unshift(activity);
  }

  /**
   * Retrieve single activity record by ID from local SQLite.
   */
  async function getActivityById(id: string): Promise<LocalActivityRecord | null> {
    return ActivityRepository.findById(id);
  }

  /**
   * Soft deletes an activity from local SQLite.
   */
  async function deleteActivity(id: string) {
    await ActivityRepository.delete(id);
    activities.value = activities.value.filter((act) => act.id !== id);
  }

  /**
   * Retrieve GPS trail coordinates for an activity from SQLite.
   */
  async function getActivityRoute(activityId: string): Promise<LocationPointDto[]> {
    const records = await LocationRepository.getPointsForActivity(activityId);
    return records.map((r) => ({
      latitude: r.latitude,
      longitude: r.longitude,
      altitude: r.altitude,
      accuracy: r.accuracy,
      speed: r.speed,
      heading: r.heading,
      recordedAt: r.recorded_at,
    }));
  }

  function mapLocalRecordToDto(record: LocalActivityRecord): ActivitySummaryDto {
    return {
      id: record.id,
      userId: record.user_id,
      activityType: record.activity_type,
      status: record.status,
      distanceMeters: record.distance_meters,
      durationSeconds: record.duration_seconds,
      averageSpeed: record.average_speed,
      maxSpeed: record.max_speed,
      averagePace: record.average_pace,
      startedAt: record.started_at,
      endedAt: record.ended_at,
    };
  }

  async function seedInitialData(userId: string) {
    const sampleRecord: LocalActivityRecord = {
      id: crypto.randomUUID ? crypto.randomUUID() : 'welcome-run-101',
      user_id: userId,
      activity_type: ActivityType.RUNNING,
      status: ActivityStatus.COMPLETED,
      distance_meters: 5240,
      duration_seconds: 1620, // 27 mins
      average_speed: 3.23,
      max_speed: 4.2,
      average_pace: 5.15,
      started_at: new Date(Date.now() - 86400000).toISOString(),
      ended_at: new Date(Date.now() - 86400000 + 1620000).toISOString(),
      sync_status: 'PENDING',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };

    await ActivityRepository.insert(sampleRecord);
  }

  return {
    activities,
    isLoaded,
    isLoading,
    weeklyTotalDistanceKm,
    weeklyTotalDurationMinutes,
    totalActivitiesCount,
    recentActivities,
    loadActivitiesFromDb,
    saveCompletedActivity,
    deleteActivity,
    getActivityRoute,
    getActivityById,
  };
});
