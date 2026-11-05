import { Geolocation, type Position } from '@capacitor/geolocation';
import type { LocationPointDto } from '@runmate/shared';

export type GpsPermissionState = 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale';

export class GpsService {
  private static watchId: string | null = null;

  /**
   * Check current device location permission state.
   */
  static async checkPermission(): Promise<GpsPermissionState> {
    try {
      const status = await Geolocation.checkPermissions();
      return status.location as GpsPermissionState;
    } catch {
      return 'prompt';
    }
  }

  /**
   * Request location permission from user.
   */
  static async requestPermission(): Promise<boolean> {
    try {
      const status = await Geolocation.requestPermissions({
        permissions: ['location'],
      });
      return status.location === 'granted';
    } catch (err) {
      console.error('Error requesting location permission:', err);
      return false;
    }
  }

  /**
   * Get single one-shot location reading for map centering.
   */
  static async getCurrentPosition(): Promise<LocationPointDto | null> {
    try {
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      });
      return this.positionToDto(pos);
    } catch (err) {
      console.warn('Unable to get immediate current position:', err);
      return null;
    }
  }

  /**
   * Starts real-time continuous GPS tracking.
   */
  static async startTracking(
    onLocation: (point: LocationPointDto) => void,
    onError?: (err: any) => void,
  ): Promise<boolean> {
    await this.stopTracking();

    try {
      const id = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
        (position, err) => {
          if (err) {
            console.error('GPS Watch error:', err);
            onError?.(err);
            return;
          }
          if (position) {
            const dto = this.positionToDto(position);
            onLocation(dto);
          }
        },
      );

      this.watchId = id;
      return true;
    } catch (err) {
      console.error('Failed to start GPS watch:', err);
      onError?.(err);
      return false;
    }
  }

  /**
   * Stops active GPS watch.
   */
  static async stopTracking(): Promise<void> {
    if (this.watchId !== null) {
      try {
        await Geolocation.clearWatch({ id: this.watchId });
      } catch (err) {
        console.warn('Error clearing GPS watch:', err);
      } finally {
        this.watchId = null;
      }
    }
  }

  /**
   * Converts Capacitor Position to LocationPointDto.
   */
  private static positionToDto(pos: Position): LocationPointDto {
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      altitude: pos.coords.altitude ?? null,
      accuracy: pos.coords.accuracy,
      speed: pos.coords.speed !== null && pos.coords.speed !== undefined && pos.coords.speed >= 0 ? pos.coords.speed : null,
      heading: pos.coords.heading !== null && pos.coords.heading !== undefined && pos.coords.heading >= 0 ? pos.coords.heading : null,
      recordedAt: new Date(pos.timestamp).toISOString(),
    };
  }
}

