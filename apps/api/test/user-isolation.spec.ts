import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ActivitiesService } from '../src/activities/activities.service.js';
import type { PrismaService } from '../src/prisma/prisma.service.js';

describe('Security: User Isolation Verification (Phase 10)', () => {
  let service: ActivitiesService;
  let mockPrisma: any;

  const userA = 'user-uuid-A';
  const userB = 'user-uuid-B';
  const activityA = {
    id: 'activity-100-owned-by-A',
    userId: userA,
    activityType: 'RUNNING',
    distanceMeters: 5000,
    durationSeconds: 1500,
    deletedAt: null,
  };

  beforeEach(() => {
    mockPrisma = {
      activity: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
      },
    };

    service = new ActivitiesService(mockPrisma as unknown as PrismaService);
  });

  it('allows User A to access their own activity', async () => {
    mockPrisma.activity.findFirst.mockResolvedValue(activityA);

    const result = await service.findOne(userA, activityA.id);
    expect(result).toEqual(activityA);
    expect(mockPrisma.activity.findFirst).toHaveBeenCalledWith({
      where: { id: activityA.id, userId: userA, deletedAt: null },
      include: {
        locationPoints: {
          orderBy: { recordedAt: 'asc' },
        },
      },
    });
  });

  it('prevents User B from accessing User A activity (returns 404)', async () => {
    // When querying with User B's ID, Prisma finds no record matching both id and userId
    mockPrisma.activity.findFirst.mockResolvedValue(null);

    await expect(service.findOne(userB, activityA.id)).rejects.toThrow(NotFoundException);
    expect(mockPrisma.activity.findFirst).toHaveBeenCalledWith({
      where: { id: activityA.id, userId: userB, deletedAt: null },
      include: {
        locationPoints: {
          orderBy: { recordedAt: 'asc' },
        },
      },
    });
  });

  it('prevents User B from deleting User A activity', async () => {
    mockPrisma.activity.findFirst.mockResolvedValue(null);

    await expect(service.delete(userB, activityA.id)).rejects.toThrow(NotFoundException);
    expect(mockPrisma.activity.update).not.toHaveBeenCalled();
  });

  it('scopes activity listing strictly to the requesting user', async () => {
    mockPrisma.activity.findMany.mockResolvedValue([activityA]);
    mockPrisma.activity.count.mockResolvedValue(1);

    await service.findAll(userA);

    expect(mockPrisma.activity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: userA,
          deletedAt: null,
        }),
      }),
    );
  });
});

