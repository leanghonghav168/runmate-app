import { ActivityType, type LocationPointDto } from '@runmate/shared';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { useTrackingStore } from '../../src/stores/trackingStore.js';

describe('Background GPS Tracking Store & Services', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('initializes with default IDLE tracking state', () => {
    const store = useTrackingStore();
    expect(store.isIdle).toBe(true);
    expect(store.isTracking).toBe(false);
    expect(store.distanceMeters).toBe(0);
    expect(store.distanceKmFormatted).toBe('0.00');
    expect(store.durationFormatted).toBe('00:00');
    expect(store.currentSpeedKmh).toBe('0.0');
    expect(store.averageSpeedKmh).toBe('0.0');
    expect(store.paceFormatted).toBe('--:--');
  });

  it('allows mode selection only when IDLE', () => {
    const store = useTrackingStore();
    store.setActivityMode(ActivityType.WALKING);
    expect(store.selectedMode).toBe(ActivityType.WALKING);

    store.setActivityMode(ActivityType.DRIVING);
    expect(store.selectedMode).toBe(ActivityType.DRIVING);
  });

  it('accurately accumulates distance and updates speeds for valid coordinates', async () => {
    const store = useTrackingStore();
    store.setActivityMode(ActivityType.RUNNING);

    const pt1: LocationPointDto = {
      latitude: 10.7769,
      longitude: 106.7009,
      altitude: 10,
      accuracy: 6,
      speed: 3.2,
      heading: 90,
      recordedAt: '2026-11-05T08:00:00.000Z',
    };

    const pt2: LocationPointDto = {
      latitude: 10.7778, // ~100m north
      longitude: 106.7009,
      altitude: 10,
      accuracy: 5,
      speed: 3.8,
      heading: 0,
      recordedAt: '2026-11-05T08:00:25.000Z',
    };

    await store.handleNewLocationPoint(pt1);
    expect(store.routePoints.length).toBe(1);
    expect(store.distanceMeters).toBe(0); // First point has no delta

    await store.handleNewLocationPoint(pt2);
    expect(store.routePoints.length).toBe(2);
    expect(store.distanceMeters).toBeGreaterThan(90);
    expect(store.distanceMeters).toBeLessThan(110);
    expect(store.maxSpeed).toBe(3.8);
    expect(store.currentSpeed).toBe(3.8);
  });

  it('filters out inaccurate GPS points with excessive uncertainty', async () => {
    const store = useTrackingStore();

    const inaccuratePoint: LocationPointDto = {
      latitude: 10.7769,
      longitude: 106.7009,
      altitude: 10,
      accuracy: 85, // Greater than MAX_ACCEPTABLE_ACCURACY (50m)
      speed: 3.0,
      heading: 90,
      recordedAt: '2026-11-05T08:00:00.000Z',
    };

    await store.handleNewLocationPoint(inaccuratePoint);
    expect(store.routePoints.length).toBe(0);
    expect(store.gpsStatus).toBe('POOR');
  });

  it('rejects impossible speed jumps (e.g. GPS teleportation)', async () => {
    const store = useTrackingStore();
    store.setActivityMode(ActivityType.RUNNING);

    const startPoint: LocationPointDto = {
      latitude: 10.7769,
      longitude: 106.7009,
      altitude: 10,
      accuracy: 5,
      speed: 3.0,
      heading: 90,
      recordedAt: '2026-11-05T08:00:00.000Z',
    };

    const jumpPoint: LocationPointDto = {
      latitude: 10.8769, // ~11 km away in 2 seconds
      longitude: 106.7009,
      altitude: 10,
      accuracy: 5,
      speed: 3.0,
      heading: 90,
      recordedAt: '2026-11-05T08:00:02.000Z',
    };

    await store.handleNewLocationPoint(startPoint);
    expect(store.routePoints.length).toBe(1);

    await store.handleNewLocationPoint(jumpPoint);
    // Jump point must be rejected
    expect(store.routePoints.length).toBe(1);
    expect(store.distanceMeters).toBe(0);
  });
});

