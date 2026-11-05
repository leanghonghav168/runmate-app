import { Injectable } from '@nestjs/common';
import { ActivityStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class StatisticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserSummary(userId: string) {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const baseWhere = {
      userId,
      deletedAt: null,
      status: ActivityStatus.COMPLETED,
    };

    // Overall totals
    const allActivities = await this.prisma.activity.findMany({
      where: baseWhere,
      select: {
        activityType: true,
        distanceMeters: true,
        durationSeconds: true,
        startedAt: true,
      },
    });

    let totalDistanceMeters = 0;
    let totalDurationSeconds = 0;
    let weeklyDistanceMeters = 0;
    let weeklyDurationSeconds = 0;
    let monthlyDistanceMeters = 0;
    let monthlyDurationSeconds = 0;

    const byType = {
      WALKING: { count: 0, distanceMeters: 0, durationSeconds: 0 },
      RUNNING: { count: 0, distanceMeters: 0, durationSeconds: 0 },
      DRIVING: { count: 0, distanceMeters: 0, durationSeconds: 0 },
    };

    for (const act of allActivities) {
      totalDistanceMeters += act.distanceMeters;
      totalDurationSeconds += act.durationSeconds;

      if (act.startedAt >= sevenDaysAgo) {
        weeklyDistanceMeters += act.distanceMeters;
        weeklyDurationSeconds += act.durationSeconds;
      }

      if (act.startedAt >= thirtyDaysAgo) {
        monthlyDistanceMeters += act.distanceMeters;
        monthlyDurationSeconds += act.durationSeconds;
      }

      const typeKey = act.activityType as keyof typeof byType;
      if (byType[typeKey]) {
        byType[typeKey].count += 1;
        byType[typeKey].distanceMeters += act.distanceMeters;
        byType[typeKey].durationSeconds += act.durationSeconds;
      }
    }

    return {
      allTime: {
        totalActivities: allActivities.length,
        totalDistanceMeters,
        totalDistanceKm: Number((totalDistanceMeters / 1000).toFixed(2)),
        totalDurationSeconds,
        totalDurationMinutes: Math.round(totalDurationSeconds / 60),
      },
      weekly: {
        distanceMeters: weeklyDistanceMeters,
        distanceKm: Number((weeklyDistanceMeters / 1000).toFixed(2)),
        durationSeconds: weeklyDurationSeconds,
        durationMinutes: Math.round(weeklyDurationSeconds / 60),
      },
      monthly: {
        distanceMeters: monthlyDistanceMeters,
        distanceKm: Number((monthlyDistanceMeters / 1000).toFixed(2)),
        durationSeconds: monthlyDurationSeconds,
        durationMinutes: Math.round(monthlyDurationSeconds / 60),
      },
      byType,
    };
  }
}

