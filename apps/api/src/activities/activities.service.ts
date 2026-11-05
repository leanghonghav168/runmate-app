import { Injectable, NotFoundException } from '@nestjs/common';
import type { ActivityType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateActivityDto } from './dto/create-activity.dto.js';
import type { UpdateActivityDto } from './dto/update-activity.dto.js';

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateActivityDto) {
    const activityId = dto.id;

    if (activityId) {
      // Idempotent upsert based on client UUID
      return this.prisma.activity.upsert({
        where: { id: activityId },
        update: {
          activityType: dto.activityType,
          status: dto.status,
          distanceMeters: dto.distanceMeters ?? 0,
          durationSeconds: dto.durationSeconds ?? 0,
          averageSpeed: dto.averageSpeed ?? 0,
          maxSpeed: dto.maxSpeed ?? 0,
          averagePace: dto.averagePace,
          startedAt: new Date(dto.startedAt),
          endedAt: dto.endedAt ? new Date(dto.endedAt) : null,
        },
        create: {
          id: activityId,
          userId,
          activityType: dto.activityType,
          status: dto.status,
          distanceMeters: dto.distanceMeters ?? 0,
          durationSeconds: dto.durationSeconds ?? 0,
          averageSpeed: dto.averageSpeed ?? 0,
          maxSpeed: dto.maxSpeed ?? 0,
          averagePace: dto.averagePace,
          startedAt: new Date(dto.startedAt),
          endedAt: dto.endedAt ? new Date(dto.endedAt) : null,
        },
      });
    }

    return this.prisma.activity.create({
      data: {
        userId,
        activityType: dto.activityType,
        status: dto.status,
        distanceMeters: dto.distanceMeters ?? 0,
        durationSeconds: dto.durationSeconds ?? 0,
        averageSpeed: dto.averageSpeed ?? 0,
        maxSpeed: dto.maxSpeed ?? 0,
        averagePace: dto.averagePace,
        startedAt: new Date(dto.startedAt),
        endedAt: dto.endedAt ? new Date(dto.endedAt) : null,
      },
    });
  }

  async findAll(
    userId: string,
    filters?: {
      type?: ActivityType;
      page?: number;
      limit?: number;
    },
  ) {
    const page = Math.max(1, filters?.page ?? 1);
    const limit = Math.min(50, Math.max(1, filters?.limit ?? 20));
    const skip = (page - 1) * limit;

    const where = {
      userId,
      deletedAt: null,
      ...(filters?.type ? { activityType: filters.type } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.activity.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.activity.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(userId: string, id: string) {
    const activity = await this.prisma.activity.findFirst({
      where: { id, userId, deletedAt: null },
      include: {
        locationPoints: {
          orderBy: { recordedAt: 'asc' },
        },
      },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    return activity;
  }

  async update(userId: string, id: string, dto: UpdateActivityDto) {
    await this.findOne(userId, id);

    return this.prisma.activity.update({
      where: { id },
      data: {
        activityType: dto.activityType,
        status: dto.status,
        distanceMeters: dto.distanceMeters,
        durationSeconds: dto.durationSeconds,
        averageSpeed: dto.averageSpeed,
        maxSpeed: dto.maxSpeed,
        averagePace: dto.averagePace,
        startedAt: dto.startedAt ? new Date(dto.startedAt) : undefined,
        endedAt: dto.endedAt ? new Date(dto.endedAt) : undefined,
      },
    });
  }

  async delete(userId: string, id: string) {
    await this.findOne(userId, id);

    await this.prisma.activity.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: 'Activity deleted successfully' };
  }
}

