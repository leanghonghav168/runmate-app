export enum ActivityType {
  WALKING = 'WALKING',
  RUNNING = 'RUNNING',
  DRIVING = 'DRIVING',
}

export enum ActivityStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocationPointDto {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  recordedAt: string;
}

export interface ActivitySummaryDto {
  id: string;
  userId: string;
  activityType: ActivityType;
  status: ActivityStatus;
  distanceMeters: number;
  durationSeconds: number;
  averageSpeed: number;
  maxSpeed: number;
  averagePace: number | null;
  startedAt: string;
  endedAt: string | null;
}

