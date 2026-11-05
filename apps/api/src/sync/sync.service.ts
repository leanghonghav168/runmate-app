import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { SyncPayloadDto } from './dto/sync-payload.dto.js';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  async syncBatch(userId: string, dto: SyncPayloadDto) {
    const syncedActivityIds: string[] = [];
    let totalPointsInserted = 0;

    for (const item of dto.activities) {
      if (!item.id) continue;

      // Upsert activity
      const activity = await this.prisma.activity.upsert({
        where: { id: item.id },
        update: {
          activityType: item.activityType,
          status: item.status,
          distanceMeters: item.distanceMeters ?? 0,
          durationSeconds: item.durationSeconds ?? 0,
          averageSpeed: item.averageSpeed ?? 0,
          maxSpeed: item.maxSpeed ?? 0,
          averagePace: item.averagePace,
          startedAt: new Date(item.startedAt),
          endedAt: item.endedAt ? new Date(item.endedAt) : null,
        },
        create: {
          id: item.id,
          userId,
          activityType: item.activityType,
          status: item.status,
          distanceMeters: item.distanceMeters ?? 0,
          durationSeconds: item.durationSeconds ?? 0,
          averageSpeed: item.averageSpeed ?? 0,
          maxSpeed: item.maxSpeed ?? 0,
          averagePace: item.averagePace,
          startedAt: new Date(item.startedAt),
          endedAt: item.endedAt ? new Date(item.endedAt) : null,
        },
      });

      syncedActivityIds.push(activity.id);

      // Insert points if any
      if (item.points && item.points.length > 0) {
        const pointData = item.points.map((p) => ({
          id: p.id,
          activityId: activity.id,
          latitude: p.latitude,
          longitude: p.longitude,
          altitude: p.altitude,
          accuracy: p.accuracy,
          speed: p.speed,
          heading: p.heading,
          recordedAt: new Date(p.recordedAt),
        }));

        const result = await this.prisma.locationPoint.createMany({
          data: pointData,
          skipDuplicates: true,
        });

        totalPointsInserted += result.count;
      }
    }

    this.logger.log(`Synced ${syncedActivityIds.length} activities and ${totalPointsInserted} points for user ${userId}`);

    return {
      success: true,
      syncedActivityIds,
      totalPointsInserted,
      syncedAt: new Date().toISOString(),
    };
  }
}

