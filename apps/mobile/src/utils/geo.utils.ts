import { ActivityType, type LocationPointDto } from '@runmate/shared';

// Earth's mean radius in meters
const EARTH_RADIUS_METERS = 6371000;

export interface GpsThresholds {
  maxAccuracyMeters: number;
  maxSpeedMps: number;
  minDistanceDeltaMeters: number;
}

export const MODE_THRESHOLDS: Record<ActivityType, GpsThresholds> = {
  [ActivityType.WALKING]: {
    maxAccuracyMeters: 40,
    maxSpeedMps: 4.5, // ~16.2 km/h
    minDistanceDeltaMeters: 1.8,
  },
  [ActivityType.RUNNING]: {
    maxAccuracyMeters: 40,
    maxSpeedMps: 11.0, // ~39.6 km/h (sprint record)
    minDistanceDeltaMeters: 2.0,
  },
  [ActivityType.DRIVING]: {
    maxAccuracyMeters: 70,
    maxSpeedMps: 65.0, // ~234 km/h
    minDistanceDeltaMeters: 4.0,
  },
};

/**
 * Calculates Great-Circle distance between two coordinates using the Haversine formula.
 * Returns distance in meters.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  if (lat1 === lat2 && lon1 === lon2) {
    return 0;
  }

  const toRad = (degree: number) => (degree * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(rLat1) * Math.cos(rLat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

/**
 * Converts meters per second to kilometers per hour.
 */
export function mpsToKmph(speedMps: number): number {
  if (!speedMps || speedMps < 0) return 0;
  return speedMps * 3.6;
}

/**
 * Calculates pace in minutes per kilometer.
 */
export function calculatePace(durationSeconds: number, distanceMeters: number): number | null {
  if (distanceMeters < 15 || durationSeconds <= 0) return null;
  const distanceKm = distanceMeters / 1000;
  const paceSecondsPerKm = durationSeconds / distanceKm;

  // If pace is unrealistically high (> 45 min/km) or invalid, return null
  if (!isFinite(paceSecondsPerKm) || paceSecondsPerKm <= 0 || paceSecondsPerKm > 2700) {
    return null;
  }

  return paceSecondsPerKm / 60; // in fractional minutes (e.g. 5.5 = 5m 30s)
}

/**
 * Formats pace in MM:SS /km format.
 */
export function formatPace(paceMinPerKm: number | null): string {
  if (!paceMinPerKm || !isFinite(paceMinPerKm) || paceMinPerKm <= 0) {
    return '--:--';
  }
  const totalSeconds = Math.round(paceMinPerKm * 60);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Formats duration in HH:MM:SS or MM:SS.
 */
export function formatDuration(totalSeconds: number): string {
  const secs = Math.floor(totalSeconds);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;

  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Validates incoming GPS location reading and rejects inaccurate readings,
 * noise, or impossible location jumps.
 */
export function validateGpsPoint(
  newPoint: LocationPointDto,
  lastPoint: LocationPointDto | null,
  mode: ActivityType,
): { isValid: boolean; reason?: string; distanceDelta: number } {
  const thresholds = MODE_THRESHOLDS[mode];

  // 1. Accuracy Filter
  if (newPoint.accuracy > thresholds.maxAccuracyMeters) {
    return {
      isValid: false,
      reason: `Accuracy too low (${Math.round(newPoint.accuracy)}m > ${thresholds.maxAccuracyMeters}m)`,
      distanceDelta: 0,
    };
  }

  // If first point, accept as anchor
  if (!lastPoint) {
    return { isValid: true, distanceDelta: 0 };
  }

  // 2. Haversine distance from previous point
  const distanceDelta = calculateHaversineDistance(
    lastPoint.latitude,
    lastPoint.longitude,
    newPoint.latitude,
    newPoint.longitude,
  );

  const timeDeltaSec =
    (new Date(newPoint.recordedAt).getTime() - new Date(lastPoint.recordedAt).getTime()) / 1000;

  // 3. Stationary GPS Drift Filter: ignore micro vibrations when stationary
  if (distanceDelta < thresholds.minDistanceDeltaMeters) {
    return {
      isValid: false,
      reason: 'Stationary GPS noise drift ignored',
      distanceDelta: 0,
    };
  }

  // 4. Impossible Speed Jump Filter
  if (timeDeltaSec > 0) {
    const derivedSpeedMps = distanceDelta / timeDeltaSec;
    if (derivedSpeedMps > thresholds.maxSpeedMps) {
      return {
        isValid: false,
        reason: `Impossible speed jump detected (${(derivedSpeedMps * 3.6).toFixed(1)} km/h)`,
        distanceDelta: 0,
      };
    }
  }

  return {
    isValid: true,
    distanceDelta,
  };
}

export interface ActivitySplit {
  kilometer: number;
  distanceMeters: number;
  durationSeconds: number;
  paceMinPerKm: number;
  paceFormatted: string;
  speedKmh: number;
  elevationDeltaMeters: number | null;
}

/**
 * Calculates kilometer-by-kilometer splits for an activity route.
 */
export function calculateSplits(points: LocationPointDto[]): ActivitySplit[] {
  if (points.length < 2) return [];

  const splits: ActivitySplit[] = [];
  let currentKmAccumulatedMeters = 0;
  let splitStartTimestamp = new Date(points[0].recordedAt).getTime();
  let splitStartAltitude = points[0].altitude;
  let currentKmIndex = 1;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];

    const d = calculateHaversineDistance(
      prev.latitude,
      prev.longitude,
      curr.latitude,
      curr.longitude,
    );

    currentKmAccumulatedMeters += d;

    // When we cross a kilometer mark (1000m)
    if (currentKmAccumulatedMeters >= 1000) {
      const currTime = new Date(curr.recordedAt).getTime();
      const splitDurationSec = Math.max(1, (currTime - splitStartTimestamp) / 1000);
      const paceVal = (splitDurationSec / 60) / (currentKmAccumulatedMeters / 1000);
      const speedVal = (currentKmAccumulatedMeters / splitDurationSec) * 3.6;

      const elevDelta =
        curr.altitude !== null && splitStartAltitude !== null
          ? Math.round(curr.altitude - splitStartAltitude)
          : null;

      splits.push({
        kilometer: currentKmIndex,
        distanceMeters: Math.round(currentKmAccumulatedMeters),
        durationSeconds: Math.round(splitDurationSec),
        paceMinPerKm: Number(paceVal.toFixed(2)),
        paceFormatted: formatPace(paceVal),
        speedKmh: Number(speedVal.toFixed(1)),
        elevationDeltaMeters: elevDelta,
      });

      currentKmIndex += 1;
      currentKmAccumulatedMeters = 0;
      splitStartTimestamp = currTime;
      splitStartAltitude = curr.altitude;
    }
  }

  // Final partial kilometer (e.g. 0.42 km at the end)
  if (currentKmAccumulatedMeters > 50) {
    const lastPoint = points[points.length - 1];
    const lastTime = new Date(lastPoint.recordedAt).getTime();
    const splitDurationSec = Math.max(1, (lastTime - splitStartTimestamp) / 1000);
    const paceVal = (splitDurationSec / 60) / (currentKmAccumulatedMeters / 1000);
    const speedVal = (currentKmAccumulatedMeters / splitDurationSec) * 3.6;

    const elevDelta =
      lastPoint.altitude !== null && splitStartAltitude !== null
        ? Math.round(lastPoint.altitude - splitStartAltitude)
        : null;

    splits.push({
      kilometer: currentKmIndex,
      distanceMeters: Math.round(currentKmAccumulatedMeters),
      durationSeconds: Math.round(splitDurationSec),
      paceMinPerKm: Number(paceVal.toFixed(2)),
      paceFormatted: formatPace(paceVal),
      speedKmh: Number(speedVal.toFixed(1)),
      elevationDeltaMeters: elevDelta,
    });
  }

  return splits;
}

