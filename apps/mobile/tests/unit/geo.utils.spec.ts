import { ActivityType, type LocationPointDto } from '@runmate/shared';
import { describe, expect, it } from 'vitest';
import {
  calculateHaversineDistance,
  calculatePace,
  formatDuration,
  formatPace,
  mpsToKmph,
  validateGpsPoint,
} from '../../src/utils/geo.utils.js';

describe('geo.utils', () => {
  describe('calculateHaversineDistance', () => {
    it('returns 0 for identical points', () => {
      const dist = calculateHaversineDistance(10.7769, 106.7009, 10.7769, 106.7009);
      expect(dist).toBe(0);
    });

    it('accurately calculates distance between known points', () => {
      // Coordinate delta ~160 meters
      const dist = calculateHaversineDistance(10.7769, 106.7009, 10.778, 106.702);
      expect(dist).toBeGreaterThan(150);
      expect(dist).toBeLessThan(180);
    });
  });

  describe('speed and pace conversions', () => {
    it('correctly converts m/s to km/h', () => {
      expect(mpsToKmph(10)).toBeCloseTo(36.0, 1);
      expect(mpsToKmph(0)).toBe(0);
    });

    it('calculates pace in min/km', () => {
      // 1000 meters in 300 seconds (5 mins) = 5.0 min/km
      const pace = calculatePace(300, 1000);
      expect(pace).toBeCloseTo(5.0, 1);
      expect(formatPace(pace)).toBe('5:00');
    });

    it('formats duration', () => {
      expect(formatDuration(65)).toBe('01:05');
      expect(formatDuration(3665)).toBe('01:01:05');
    });
  });

  describe('validateGpsPoint quality filter', () => {
    const basePoint: LocationPointDto = {
      latitude: 10.7769,
      longitude: 106.7009,
      altitude: 10,
      accuracy: 8,
      speed: 3.0,
      heading: 0,
      recordedAt: new Date(1000000000).toISOString(),
    };

    it('accepts initial point', () => {
      const result = validateGpsPoint(basePoint, null, ActivityType.RUNNING);
      expect(result.isValid).toBe(true);
      expect(result.distanceDelta).toBe(0);
    });

    it('rejects points with poor accuracy (> 40m)', () => {
      const inaccuratePoint: LocationPointDto = {
        ...basePoint,
        accuracy: 65,
      };
      const result = validateGpsPoint(inaccuratePoint, basePoint, ActivityType.RUNNING);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Accuracy too low');
    });

    it('rejects stationary drift noise (< 2m)', () => {
      // Tiny shift ~0.5m
      const driftPoint: LocationPointDto = {
        ...basePoint,
        latitude: 10.776903,
        recordedAt: new Date(1000001000).toISOString(),
      };
      const result = validateGpsPoint(driftPoint, basePoint, ActivityType.RUNNING);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Stationary GPS noise');
    });

    it('rejects impossible speed jumps for activity mode', () => {
      // 500 meters in 1 second = 500 m/s (~1800 km/h)
      const jumpPoint: LocationPointDto = {
        ...basePoint,
        latitude: 10.7819,
        recordedAt: new Date(1000001000).toISOString(), // 1s later
      };
      const result = validateGpsPoint(jumpPoint, basePoint, ActivityType.RUNNING);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Impossible speed jump');
    });

    it('accepts legitimate running movement', () => {
      // 15 meters in 4 seconds = ~3.75 m/s (~13.5 km/h)
      const validPoint: LocationPointDto = {
        ...basePoint,
        latitude: 10.777035,
        recordedAt: new Date(1000004000).toISOString(),
      };
      const result = validateGpsPoint(validPoint, basePoint, ActivityType.RUNNING);
      expect(result.isValid).toBe(true);
      expect(result.distanceDelta).toBeGreaterThan(10);
    });
  });
});

