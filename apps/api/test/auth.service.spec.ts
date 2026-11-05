import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../src/auth/auth.service.js';

describe('AuthService & Argon2id Security (Phase 10)', () => {
  let authService: AuthService;
  let mockPrisma: any;
  let mockJwtService: any;
  let mockConfigService: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      refreshToken: {
        create: vi.fn(),
        findUnique: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
      },
    };

    mockJwtService = {
      signAsync: vi.fn().mockResolvedValue('mock-jwt-token'),
    };

    mockConfigService = {
      get: vi.fn((key: string, defaultVal: string) => defaultVal || '15m'),
    };

    authService = new AuthService(
      mockPrisma as any,
      mockJwtService as any,
      mockConfigService as any,
    );
  });

  it('hashes password securely using Argon2id algorithm', async () => {
    const rawPassword = 'SecurePassword123!';
    const hash = await argon2.hash(rawPassword, { type: argon2.argon2id });

    // Argon2id hash signature begins with $argon2id$
    expect(hash.startsWith('$argon2id$')).toBe(true);

    const isMatch = await argon2.verify(hash, rawPassword);
    expect(isMatch).toBe(true);

    const isWrong = await argon2.verify(hash, 'WrongPassword456!');
    expect(isWrong).toBe(false);
  });

  it('throws ConflictException on duplicate email registration', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'existing-user-id',
      email: 'test@example.com',
    });

    await expect(
      authService.register({
        name: 'Test Athlete',
        email: 'test@example.com',
        password: 'Password123!',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('throws UnauthorizedException on login with unknown email', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(
      authService.login({
        email: 'nonexistent@example.com',
        password: 'Password123!',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException on login with incorrect password', async () => {
    const hash = await argon2.hash('CorrectPassword123!', { type: argon2.argon2id });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      passwordHash: hash,
    });

    await expect(
      authService.login({
        email: 'test@example.com',
        password: 'WrongPassword!',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});

