import { DatabaseService } from '../database.service.js';
import type { LocalLocationPointRecord } from '../schema.js';

export class LocationRepository {
  /**
   * Insert a single GPS location coordinate.
   */
  static async insertPoint(p: LocalLocationPointRecord): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO location_points (
        id, activity_id, latitude, longitude, altitude,
        accuracy, speed, heading, recorded_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;

    const params = [
      p.id,
      p.activity_id,
      p.latitude,
      p.longitude,
      p.altitude,
      p.accuracy,
      p.speed,
      p.heading,
      p.recorded_at,
      p.sync_status,
    ];

    await DatabaseService.execute(sql, params);
  }

  /**
   * Batch insert GPS location coordinates for efficiency.
   */
  static async insertBatch(points: LocalLocationPointRecord[]): Promise<void> {
    for (const p of points) {
      await this.insertPoint(p);
    }
  }

  /**
   * Retrieve all GPS points for a given activity ordered by recorded timestamp.
   */
  static async getPointsForActivity(
    activityId: string,
  ): Promise<LocalLocationPointRecord[]> {
    const sql = `
      SELECT * FROM location_points
      WHERE activity_id = ?
      ORDER BY recorded_at ASC;
    `;
    return DatabaseService.query<LocalLocationPointRecord>(sql, [activityId]);
  }

  /**
   * Retrieve points pending upload.
   */
  static async getPendingPoints(
    activityId: string,
  ): Promise<LocalLocationPointRecord[]> {
    const sql = `
      SELECT * FROM location_points
      WHERE activity_id = ? AND sync_status = 'PENDING'
      ORDER BY recorded_at ASC;
    `;
    return DatabaseService.query<LocalLocationPointRecord>(sql, [activityId]);
  }

  /**
   * Mark coordinate points as synced.
   */
  static async markPointsSynced(pointIds: string[]): Promise<void> {
    if (pointIds.length === 0) return;
    const placeholders = pointIds.map(() => '?').join(', ');
    const sql = `UPDATE location_points SET sync_status = 'SYNCED' WHERE id IN (${placeholders});`;
    await DatabaseService.execute(sql, pointIds);
  }
}

