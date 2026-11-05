import type { ActivityStatus, ActivityType } from '@runmate/shared';

export type SyncStatus = 'PENDING' | 'SYNCED' | 'FAILED';

export interface LocalActivityRecord {
  id: string;
  user_id: string;
  activity_type: ActivityType;
  status: ActivityStatus;
  distance_meters: number;
  duration_seconds: number;
  average_speed: number;
  max_speed: number;
  average_pace: number | null;
  started_at: string;
  ended_at: string | null;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface LocalLocationPointRecord {
  id: string;
  activity_id: string;
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  recorded_at: string;
  sync_status: SyncStatus;
}

export const DB_NAME = 'runmate_local';
export const DB_VERSION = 1;

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'IN_PROGRESS',
  distance_meters REAL NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  average_speed REAL NOT NULL DEFAULT 0,
  max_speed REAL NOT NULL DEFAULT 0,
  average_pace REAL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_started ON activities(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_sync ON activities(sync_status);

CREATE TABLE IF NOT EXISTS location_points (
  id TEXT PRIMARY KEY NOT NULL,
  activity_id TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  altitude REAL,
  accuracy REAL NOT NULL,
  speed REAL,
  heading REAL,
  recorded_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'PENDING',
  FOREIGN KEY (activity_id) REFERENCES activities (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_points_activity ON location_points(activity_id, recorded_at ASC);
CREATE INDEX IF NOT EXISTS idx_points_sync ON location_points(sync_status);

CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TEXT,
  created_at TEXT NOT NULL
);
`;

