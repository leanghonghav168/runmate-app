import type { LocationPointDto } from '@runmate/shared';
import { describe, expect, it } from 'vitest';
import { calculateSplits } from '../../src/utils/geo.utils.js';

describe('Kilometer Splits Calculator (Phase 9)', () => {
  it('returns empty splits array for less than 2 points', () => {
    expect(calculateSplits([])).toEqual([]);
    expect(
      calculateSplits([
        {
          latitude: 10.7769,
          longitude: 106.7009,
          altitude: 10,
          accuracy: 5,
          speed: 3,
          heading: 0,
          recordedAt: new Date().toISOString(),
        },
      ]),
    ).toEqual([]);
  });

  it('calculates kilometer splits accurately across a multi-kilometer workout', () => {
    const points: LocationPointDto[] = [];
    const baseTime = new Date('2026-11-05T07:00:00Z').getTime();

    // Generate ~2500m of points running North (~0.009 deg lat per km)
    // 25 points, each ~100m apart, 30 seconds apart (~3.33 m/s = 5:00/km pace)
    for (let i = 0; i <= 25; i++) {
      points.push({
        latitude: 10.7769 + i * 0.0009,
        longitude: 106.7009,
        altitude: 10 + i * 0.5,
        accuracy: 4,
        speed: 3.33,
        heading: 0,
        recordedAt: new Date(baseTime + i * 30000).toISOString(),
      });
    }

    const splits = calculateSplits(points);

    // Should produce at least 2 full kilometers + 1 partial split
    expect(splits.length).toBeGreaterThanOrEqual(2);

    const km1 = splits[0];
    expect(km1.kilometer).toBe(1);
    expect(km1.distanceMeters).toBeGreaterThanOrEqual(950);
    expect(km1.paceMinPerKm).toBeGreaterThan(4);
    expect(km1.paceMinPerKm).toBeLessThan(6);
    expect(km1.elevationDeltaMeters).toBeGreaterThan(0);

    const km2 = splits[1];
    expect(km2.kilometer).toBe(2);
    expect(km2.distanceMeters).toBeGreaterThanOrEqual(950);
  });
});

