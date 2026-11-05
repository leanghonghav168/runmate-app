import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { LoginDto } from '../src/auth/dto/login.dto.js';
import { RegisterDto } from '../src/auth/dto/register.dto.js';
import { LocationPointInputDto } from '../src/locations/dto/create-locations.dto.js';

describe('Security: Coordinate & Input Range Validation (Phase 10)', () => {
  it('accepts valid GPS coordinates and timestamps', async () => {
    const valid = plainToInstance(LocationPointInputDto, {
      latitude: 10.7769,
      longitude: 106.7009,
      altitude: 15.2,
      accuracy: 4.5,
      speed: 3.2,
      heading: 90.0,
      recordedAt: '2026-11-05T08:00:00.000Z',
    });

    const errors = await validate(valid);
    expect(errors.length).toBe(0);
  });

  it('rejects latitude beyond [-90, +90] degrees', async () => {
    const invalidLatAbove = plainToInstance(LocationPointInputDto, {
      latitude: 91.5, // > 90
      longitude: 106.7,
      accuracy: 5,
      recordedAt: '2026-11-05T08:00:00.000Z',
    });

    const errorsAbove = await validate(invalidLatAbove);
    expect(errorsAbove.length).toBeGreaterThan(0);
    expect(errorsAbove.some((e) => e.property === 'latitude')).toBe(true);

    const invalidLatBelow = plainToInstance(LocationPointInputDto, {
      latitude: -90.1, // < -90
      longitude: 106.7,
      accuracy: 5,
      recordedAt: '2026-11-05T08:00:00.000Z',
    });

    const errorsBelow = await validate(invalidLatBelow);
    expect(errorsBelow.length).toBeGreaterThan(0);
    expect(errorsBelow.some((e) => e.property === 'latitude')).toBe(true);
  });

  it('rejects longitude beyond [-180, +180] degrees', async () => {
    const invalidLngAbove = plainToInstance(LocationPointInputDto, {
      latitude: 10.5,
      longitude: 180.5, // > 180
      accuracy: 5,
      recordedAt: '2026-11-05T08:00:00.000Z',
    });

    const errors = await validate(invalidLngAbove);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'longitude')).toBe(true);
  });

  it('rejects negative accuracy and negative speed', async () => {
    const invalidNumbers = plainToInstance(LocationPointInputDto, {
      latitude: 10.5,
      longitude: 106.5,
      accuracy: -5, // Invalid negative accuracy
      speed: -2, // Invalid negative speed
      recordedAt: '2026-11-05T08:00:00.000Z',
    });

    const errors = await validate(invalidNumbers);
    expect(errors.length).toBeGreaterThanOrEqual(2);
    expect(errors.some((e) => e.property === 'accuracy')).toBe(true);
    expect(errors.some((e) => e.property === 'speed')).toBe(true);
  });

  it('rejects heading outside [0, 360] degrees', async () => {
    const invalidHeading = plainToInstance(LocationPointInputDto, {
      latitude: 10.5,
      longitude: 106.5,
      accuracy: 5,
      heading: 365, // > 360
      recordedAt: '2026-11-05T08:00:00.000Z',
    });

    const errors = await validate(invalidHeading);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'heading')).toBe(true);
  });

  it('enforces strong password policy and email format on registration', async () => {
    const shortPassword = plainToInstance(RegisterDto, {
      name: 'Alex',
      email: 'alex@example.com',
      password: 'short', // < 8 characters
    });

    const pwErrors = await validate(shortPassword);
    expect(pwErrors.length).toBeGreaterThan(0);
    expect(pwErrors.some((e) => e.property === 'password')).toBe(true);

    const badEmail = plainToInstance(RegisterDto, {
      name: 'Alex',
      email: 'not-an-email',
      password: 'ValidPassword123!',
    });

    const emailErrors = await validate(badEmail);
    expect(emailErrors.length).toBeGreaterThan(0);
    expect(emailErrors.some((e) => e.property === 'email')).toBe(true);
  });

  it('validates login credentials format', async () => {
    const badLogin = plainToInstance(LoginDto, {
      email: 'invalid-email',
      password: '',
    });

    const errors = await validate(badLogin);
    expect(errors.length).toBeGreaterThanOrEqual(2);
  });
});

