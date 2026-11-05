import { DatabaseService } from '../database.service.js';
import type { LocalActivityRecord } from '../schema.js';

export class ActivityRepository {
  /**
   * Insert a new activity record into SQLite.
   */
  static async insert(act: LocalActivityRecord): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO activities (
        id, user_id, activity_type, status, distance_meters,
        duration_seconds, average_speed, max_speed, average_pace,
        started_at, ended_at, sync_status, created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;

    const params = [
      act.id,
      act.user_id,
      act.activity_type,
      act.status,
      act.distance_meters,
      act.duration_seconds,
      act.average_speed,
      act.max_speed,
      act.average_pace,
      act.started_at,
      act.ended_at,
      act.sync_status,
      act.created_at,
      act.updated_at,
      act.deleted_at,
    ];

    await DatabaseService.execute(sql, params);
  }

  /**
   * Update an existing activity in SQLite.
   */
  static async update(
    id: string,
    updates: Partial<LocalActivityRecord>,
  ): Promise<void> {
    const keys = Object.keys(updates) as (keyof LocalActivityRecord)[];
    if (keys.length === 0) return;

    const setClauses = keys.map((k) => `${k} = ?`).join(', ');
    const values = keys.map((k) => updates[k]);
    values.push(id as any);

    const sql = `UPDATE activities SET ${setClauses}, updated_at = ? WHERE id = ?;`;
    values.splice(values.length - 1, 0, new Date().toISOString() as any);

    await DatabaseService.execute(sql, values);
  }

  /**
   * Find activity by UUID.
   */
  static async findById(id: string): Promise<LocalActivityRecord | null> {
    const sql = `SELECT * FROM activities WHERE id = ? AND deleted_at IS NULL LIMIT 1;`;
    const rows = await DatabaseService.query<LocalActivityRecord>(sql, [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Find all active activities for a user, sorted newest first.
   */
  static async findAllByUserId(
    userId: string,
    activityType?: string,
  ): Promise<LocalActivityRecord[]> {
    let sql = `SELECT * FROM activities WHERE user_id = ? AND deleted_at IS NULL`;
    const params: any[] = [userId];

    if (activityType && activityType !== 'ALL') {
      sql += ` AND activity_type = ?`;
      params.push(activityType);
    }

    sql += ` ORDER BY started_at DESC;`;

    return DatabaseService.query<LocalActivityRecord>(sql, params);
  }

  /**
   * Find all activities pending server synchronization.
   */
  static async getPendingSyncActivities(
    userId: string,
  ): Promise<LocalActivityRecord[]> {
    const sql = `
      SELECT * FROM activities
      WHERE user_id = ? AND sync_status = 'PENDING' AND deleted_at IS NULL
      ORDER BY started_at ASC;
    `;
    return DatabaseService.query<LocalActivityRecord>(sql, [userId]);
  }

  /**
   * Count activities pending synchronization.
   */
  static async countPending(userId: string): Promise<number> {
    const sql = `
      SELECT COUNT(id) AS count FROM activities
      WHERE user_id = ? AND sync_status = 'PENDING' AND deleted_at IS NULL;
    `;
    const rows = await DatabaseService.query<{ count: number }>(sql, [userId]);
    return rows[0]?.count ?? 0;
  }

  /**
   * Mark an activity as successfully synced with PostgreSQL backend.
   */
  static async markAsSynced(id: string): Promise<void> {
    const sql = `UPDATE activities SET sync_status = 'SYNCED', updated_at = ? WHERE id = ?;`;
    await DatabaseService.execute(sql, [new Date().toISOString(), id]);
  }

  /**
   * Soft delete an activity.
   */
  static async delete(id: string): Promise<void> {
    const sql = `UPDATE activities SET deleted_at = ?, sync_status = 'PENDING' WHERE id = ?;`;
    await DatabaseService.execute(sql, [new Date().toISOString(), id]);
  }

  /**
   * Calculate 7-day summary metrics directly in SQLite.
   */
  static async getWeeklySummary(
    userId: string,
  ): Promise<{
    totalDistanceMeters: number;
    totalDurationSeconds: number;
    activityCount: number;
  }> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const sql = `
      SELECT
        COALESCE(SUM(distance_meters), 0) AS totalDistanceMeters,
        COALESCE(SUM(duration_seconds), 0) AS totalDurationSeconds,
        COUNT(id) AS activityCount
      FROM activities
      WHERE user_id = ? AND started_at >= ? AND deleted_at IS NULL AND status = 'COMPLETED';
    `;

    const rows = await DatabaseService.query<{
      totalDistanceMeters: number;
      totalDurationSeconds: number;
      activityCount: number;
    }>(sql, [userId, sevenDaysAgo]);

    return (
      rows[0] || {
        totalDistanceMeters: 0,
        totalDurationSeconds: 0,
        activityCount: 0,
      }
    );
  }
}

