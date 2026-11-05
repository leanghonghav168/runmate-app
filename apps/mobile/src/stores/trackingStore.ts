import { App } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';
import {
  ActivityStatus,
  ActivityType,
  type LocationPointDto,
} from '@runmate/shared';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { ActivityRepository } from '../database/repositories/activity.repository.js';
import { LocationRepository } from '../database/repositories/location.repository.js';
import type { LocalActivityRecord, LocalLocationPointRecord } from '../database/schema.js';
import { BackgroundGpsService } from '../services/backgroundGps.service.js';
import { GpsService } from '../services/gps.service.js';
import { NotificationService } from '../services/notification.service.js';
import {
  calculatePace,
  formatDuration,
  formatPace,
  mpsToKmph,
  validateGpsPoint,
} from '../utils/geo.utils.js';

export type TrackingState = 'IDLE' | 'TRACKING' | 'PAUSED' | 'COMPLETED';
export type GpsSignalQuality =
  | 'IDLE'
  | 'SEARCHING'
  | 'EXCELLENT'
  | 'GOOD'
  | 'POOR'
  | 'DENIED'
  | 'ERROR';

const ACTIVE_SESSION_KEY = 'active_tracking_session_id';

export const useTrackingStore = defineStore('tracking', () => {
  // Tracking State Machine
  const trackingState = ref<TrackingState>('IDLE');
  const selectedMode = ref<ActivityType>(ActivityType.RUNNING);
  const gpsStatus = ref<GpsSignalQuality>('IDLE');
  const lastAccuracy = ref<number | null>(null);
  const activeActivityId = ref<string | null>(null);
  const startedAt = ref<Date | null>(null);
  const endedAt = ref<Date | null>(null);
  const isAppInBackground = ref<boolean>(false);

  // Live Metrics
  const distanceMeters = ref<number>(0);
  const durationSeconds = ref<number>(0);
  const currentSpeed = ref<number>(0); // in m/s
  const maxSpeed = ref<number>(0); // in m/s
  const routePoints = ref<LocationPointDto[]>([]);
  const currentPosition = ref<LocationPointDto | null>(null);

  let timerInterval: ReturnType<typeof setInterval> | null = null;
  let lastNotificationUpdate = 0;

  // Computed Properties & Formatters
  const isTracking = computed(() => trackingState.value === 'TRACKING');
  const isIdle = computed(() => trackingState.value === 'IDLE');

  const distanceKmFormatted = computed(() => {
    return (distanceMeters.value / 1000).toFixed(2);
  });

  const durationFormatted = computed(() => {
    return formatDuration(durationSeconds.value);
  });

  const currentSpeedKmh = computed(() => {
    return mpsToKmph(currentSpeed.value).toFixed(1);
  });

  const averageSpeedKmh = computed(() => {
    if (durationSeconds.value <= 0 || distanceMeters.value <= 0) return '0.0';
    const avgMs = distanceMeters.value / durationSeconds.value;
    return mpsToKmph(avgMs).toFixed(1);
  });

  const rawPace = computed(() => {
    return calculatePace(durationSeconds.value, distanceMeters.value);
  });

  const paceFormatted = computed(() => {
    return formatPace(rawPace.value);
  });

  // App Lifecycle Listener for Foreground/Background transitions
  App.addListener('appStateChange', ({ isActive }) => {
    isAppInBackground.value = !isActive;

    if (isActive && trackingState.value === 'TRACKING' && startedAt.value) {
      // Wall-clock recovery: Eliminate any timer lag caused by OS suspension
      const realElapsedSeconds = Math.floor(
        (Date.now() - startedAt.value.getTime()) / 1000,
      );
      if (realElapsedSeconds > durationSeconds.value) {
        durationSeconds.value = realElapsedSeconds;
      }
    }
  });

  function setActivityMode(mode: ActivityType) {
    if (trackingState.value === 'IDLE') {
      selectedMode.value = mode;
    }
  }

  /**
   * Initializes initial device location for map preview.
   */
  async function fetchInitialLocation() {
    const point = await GpsService.getCurrentPosition();
    if (point) {
      currentPosition.value = point;
      lastAccuracy.value = point.accuracy;
    }
  }

  /**
   * Starts GPS tracking session with native background service and SQLite persistence.
   */
  async function startTracking(userId = 'local-user'): Promise<{ success: boolean; error?: string }> {
    // 1. Request required permissions (Location + Notifications)
    const hasPermission = await BackgroundGpsService.requestAllPermissions();
    if (!hasPermission) {
      gpsStatus.value = 'DENIED';
      return {
        success: false,
        error: 'Location & notification permissions are required to record activity GPS routes.',
      };
    }

    const sessionId = crypto.randomUUID ? crypto.randomUUID() : `act-${Date.now()}`;
    const now = new Date();

    activeActivityId.value = sessionId;
    trackingState.value = 'TRACKING';
    gpsStatus.value = 'SEARCHING';
    startedAt.value = now;
    endedAt.value = null;
    distanceMeters.value = 0;
    durationSeconds.value = 0;
    currentSpeed.value = 0;
    maxSpeed.value = 0;
    routePoints.value = [];

    // 2. Persist active session in Preferences and initial SQLite record
    await Preferences.set({ key: ACTIVE_SESSION_KEY, value: sessionId });

    const initialRecord: LocalActivityRecord = {
      id: sessionId,
      user_id: userId,
      activity_type: selectedMode.value,
      status: ActivityStatus.IN_PROGRESS,
      distance_meters: 0,
      duration_seconds: 0,
      average_speed: 0,
      max_speed: 0,
      average_pace: null,
      started_at: now.toISOString(),
      ended_at: null,
      sync_status: 'PENDING',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      deleted_at: null,
    };
    await ActivityRepository.insert(initialRecord);

    // 3. Wall-clock interval timer
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (startedAt.value) {
        durationSeconds.value = Math.floor(
          (Date.now() - startedAt.value.getTime()) / 1000,
        );
      }
    }, 1000);

    // 4. Start background GPS tracking with native foreground service
    const started = await BackgroundGpsService.startTracking(
      selectedMode.value,
      (point) => handleNewLocationPoint(point),
      (err) => {
        console.error('Background GPS Tracking error:', err);
        gpsStatus.value = 'ERROR';
      },
    );

    if (!started) {
      await stopTracking();
      return { success: false, error: 'Failed to access GPS hardware.' };
    }

    // 5. Post initial lock-screen notification
    updateLockScreenNotification();

    return { success: true };
  }

  /**
   * Ingests, filters, and records incoming location points from GPS.
   */
  async function handleNewLocationPoint(point: LocationPointDto) {
    currentPosition.value = point;
    lastAccuracy.value = point.accuracy;

    // Update GPS signal status badge
    if (point.accuracy <= 15) {
      gpsStatus.value = 'EXCELLENT';
    } else if (point.accuracy <= 35) {
      gpsStatus.value = 'GOOD';
    } else {
      gpsStatus.value = 'POOR';
    }

    const lastPoint =
      routePoints.value.length > 0
        ? routePoints.value[routePoints.value.length - 1]
        : null;

    // Mathematical quality filter & outlier rejection
    const validation = validateGpsPoint(point, lastPoint, selectedMode.value);
    if (!validation.isValid) {
      return;
    }

    // Point accepted: append to trail & accumulate distance
    routePoints.value.push(point);
    distanceMeters.value += validation.distanceDelta;

    // Speed calculation
    if (point.speed !== null && point.speed >= 0) {
      currentSpeed.value = point.speed;
      if (point.speed > maxSpeed.value) {
        maxSpeed.value = point.speed;
      }
    } else if (lastPoint) {
      const dt =
        (new Date(point.recordedAt).getTime() -
          new Date(lastPoint.recordedAt).getTime()) /
        1000;
      if (dt > 0) {
        const derivedSpeed = validation.distanceDelta / dt;
        currentSpeed.value = derivedSpeed;
        if (derivedSpeed > maxSpeed.value) {
          maxSpeed.value = derivedSpeed;
        }
      }
    }

    // Immediately persist location point to SQLite (offline-first crash resilience)
    if (activeActivityId.value) {
      const pointRecord: LocalLocationPointRecord = {
        id: crypto.randomUUID
          ? crypto.randomUUID()
          : `${activeActivityId.value}-${Date.now()}`,
        activity_id: activeActivityId.value,
        latitude: point.latitude,
        longitude: point.longitude,
        altitude: point.altitude,
        accuracy: point.accuracy,
        speed: point.speed,
        heading: point.heading,
        recorded_at: point.recordedAt,
        sync_status: 'PENDING',
      };
      await LocationRepository.insertPoint(pointRecord);
    }

    // Throttle lock-screen notification updates to every 4 seconds
    const nowMs = Date.now();
    if (nowMs - lastNotificationUpdate >= 4000) {
      lastNotificationUpdate = nowMs;
      updateLockScreenNotification();
    }
  }

  function updateLockScreenNotification() {
    const modeName =
      selectedMode.value.charAt(0) + selectedMode.value.slice(1).toLowerCase();
    const speedOrPace =
      selectedMode.value === ActivityType.DRIVING
        ? `${currentSpeedKmh.value} km/h`
        : `${paceFormatted.value} /km`;

    NotificationService.updateTrackingNotification({
      modeTitle: modeName,
      distanceText: `${distanceKmFormatted.value} km`,
      durationText: durationFormatted.value,
      paceOrSpeedText: speedOrPace,
    });
  }

  /**
   * Stops active GPS collection, shuts down foreground service, and finalizes statistics.
   */
  async function stopTracking() {
    trackingState.value = 'COMPLETED';
    endedAt.value = new Date();

    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }

    await BackgroundGpsService.stopTracking();
    await NotificationService.clearTrackingNotification();
    await Preferences.remove({ key: ACTIVE_SESSION_KEY });

    // Update SQLite activity status to COMPLETED
    if (activeActivityId.value) {
      await ActivityRepository.update(activeActivityId.value, {
        status: ActivityStatus.COMPLETED,
        distance_meters: distanceMeters.value,
        duration_seconds: durationSeconds.value,
        average_speed:
          durationSeconds.value > 0
            ? distanceMeters.value / durationSeconds.value
            : 0,
        max_speed: maxSpeed.value,
        average_pace: rawPace.value,
        ended_at: endedAt.value.toISOString(),
      });
    }

    gpsStatus.value = 'IDLE';
  }

  /**
   * Resets tracking state for next session.
   */
  function resetTracking() {
    trackingState.value = 'IDLE';
    gpsStatus.value = 'IDLE';
    activeActivityId.value = null;
    startedAt.value = null;
    endedAt.value = null;
    distanceMeters.value = 0;
    durationSeconds.value = 0;
    currentSpeed.value = 0;
    maxSpeed.value = 0;
    routePoints.value = [];

    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  /**
   * Checks if an interrupted workout exists after app restart or OS kill.
   */
  async function checkInterruptedSession(): Promise<boolean> {
    const { value: savedId } = await Preferences.get({ key: ACTIVE_SESSION_KEY });
    if (!savedId) return false;

    const activity = await ActivityRepository.findById(savedId);
    if (!activity || activity.status !== ActivityStatus.IN_PROGRESS) {
      await Preferences.remove({ key: ACTIVE_SESSION_KEY });
      return false;
    }

    // Recover recorded route points from SQLite
    const points = await LocationRepository.getPointsForActivity(savedId);
    if (points.length > 0) {
      routePoints.value = points.map((p) => ({
        latitude: p.latitude,
        longitude: p.longitude,
        altitude: p.altitude,
        accuracy: p.accuracy,
        speed: p.speed,
        heading: p.heading,
        recordedAt: p.recorded_at,
      }));
      distanceMeters.value = activity.distance_meters;
      durationSeconds.value = activity.duration_seconds;
      activeActivityId.value = savedId;
      selectedMode.value = activity.activity_type;
      trackingState.value = 'COMPLETED'; // Ready to review or save
      return true;
    }

    return false;
  }

  return {
    trackingState,
    selectedMode,
    gpsStatus,
    lastAccuracy,
    activeActivityId,
    startedAt,
    endedAt,
    isAppInBackground,
    distanceMeters,
    durationSeconds,
    currentSpeed,
    maxSpeed,
    routePoints,
    currentPosition,
    isTracking,
    isIdle,
    distanceKmFormatted,
    durationFormatted,
    currentSpeedKmh,
    averageSpeedKmh,
    paceFormatted,
    rawPace,
    setActivityMode,
    fetchInitialLocation,
    startTracking,
    stopTracking,
    resetTracking,
    checkInterruptedSession,
    handleNewLocationPoint,
  };
});
