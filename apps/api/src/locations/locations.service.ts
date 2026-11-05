import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { LocationPointInputDto } from './dto/create-locations.dto.js';

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async addPoints(userId: string, activityId: string, points: LocationPointInputDto[]) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      select: { userId: true },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }
    if (activity.userId !== userId) {
      throw new ForbiddenException('Cannot append locations to another user activity');
    }

    if (!points || points.length === 0) {
      return { inserted: 0 };
    }

    const data = points.map((p) => ({
      id: p.id,
      activityId,
      latitude: p.latitude,
      longitude: p.longitude,
      altitude: p.altitude,
      accuracy: p.accuracy,
      speed: p.speed,
      heading: p.heading,
      recordedAt: new Date(p.recordedAt),
    }));

    const result = await this.prisma.locationPoint.createMany({
      data,
      skipDuplicates: true,
    });

    return { inserted: result.count };
  }

  async getPoints(userId: string, activityId: string) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      select: { userId: true },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }
    if (activity.userId !== userId) {
      throw new ForbiddenException('Cannot access another user activity');
    }

    return this.prisma.locationPoint.findMany({
      where: { activityId },
      orderBy: { recordedAt: 'asc' },
    });
  }
}

