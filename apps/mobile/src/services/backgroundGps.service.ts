import { Capacitor, registerPlugin } from '@capacitor/core';
import type {
  BackgroundGeolocationPlugin,
  Location as NativeBgLocation,
} from '@capacitor-community/background-geolocation';
import { Geolocation, type Position } from '@capacitor/geolocation';
import { ActivityType, type LocationPointDto } from '@runmate/shared';
import { NotificationService } from './notification.service.js';

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');

export type GpsCallback = (point: LocationPointDto) => void;
export type GpsErrorCallback = (err: any) => void;

export class BackgroundGpsService {
  private static watcherId: string | null = null;
  private static webWatchId: string | null = null;

  /**
   * Check or request all required permissions (Location + Notifications).
   */
  static async requestAllPermissions(): Promise<boolean> {
    try {
      if (Capacitor.isNativePlatform()) {
        // 1. Notification permission for ongoing foreground service (Android 13+ / iOS)
        await NotificationService.requestPermission();

        // 2. Location permissions
        const geoPerm = await Geolocation.requestPermissions({
          permissions: ['location'],
        });

        return geoPerm.location === 'granted';
      } else {
        // Web / desktop browser
        const perm = await Geolocation.requestPermissions();
        return perm.location === 'granted';
      }
    } catch (err) {
      console.warn('Error during permission request:', err);
      return false;
    }
  }

  /**
   * Starts background GPS tracking using native foreground service.
   */
  static async startTracking(
    mode: ActivityType,
    onLocation: GpsCallback,
    onError?: GpsErrorCallback,
  ): Promise<boolean> {
    await this.stopTracking();

    const modeName = mode.charAt(0) + mode.slice(1).toLowerCase();

    if (Capacitor.isNativePlatform()) {
      try {
        // Dynamic distance filter: tighter for walking/running, larger for driving
        const distanceFilter = mode === ActivityType.DRIVING ? 5 : 2;

        const watcher = await BackgroundGeolocation.addWatcher(
          {
            backgroundTitle: `RunMate • ${modeName} in progress`,
            backgroundMessage: 'Recording activity GPS route. Screen lock enabled.',
            requestPermissions: true,
            stale: false,
            distanceFilter,
          },
          (position, err) => {
            if (err) {
              console.error('Background Geolocation Error:', err);
              onError?.(err);
              return;
            }

            if (position) {
              const dto = this.nativeLocationToDto(position);
              onLocation(dto);
            }
          },
        );

        this.watcherId = watcher;
        return true;
      } catch (err) {
        console.error('Failed to start native background GPS watcher, falling back:', err);
      }
    }

    // Fallback: Web / Simulator continuous geolocation
    try {
      const id = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
        (pos, err) => {
          if (err) {
            onError?.(err);
            return;
          }
          if (pos) {
            onLocation(this.webPositionToDto(pos));
          }
        },
      );
      this.webWatchId = id;
      return true;
    } catch (webErr) {
      onError?.(webErr);
      return false;
    }
  }

  /**
   * Stops background GPS collection and shuts down the foreground service.
   */
  static async stopTracking(): Promise<void> {
    if (this.watcherId !== null) {
      try {
        await BackgroundGeolocation.removeWatcher({ id: this.watcherId });
      } catch (err) {
        console.warn('Error removing native background watcher:', err);
      } finally {
        this.watcherId = null;
      }
    }

    if (this.webWatchId !== null) {
      try {
        await Geolocation.clearWatch({ id: this.webWatchId });
      } catch (err) {
        console.warn('Error clearing web watch:', err);
      } finally {
        this.webWatchId = null;
      }
    }
  }

  /**
   * Opens the system settings if permission was permanently denied.
   */
  static async openAppSettings(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        await BackgroundGeolocation.openSettings();
      } catch (err) {
        console.warn('Could not open device settings:', err);
      }
    }
  }

  private static nativeLocationToDto(pos: NativeBgLocation): LocationPointDto {
    return {
      latitude: pos.latitude,
      longitude: pos.longitude,
      altitude: pos.altitude ?? null,
      accuracy: pos.accuracy,
      speed: pos.speed !== null && pos.speed >= 0 ? pos.speed : null,
      heading: pos.bearing !== null && pos.bearing >= 0 ? pos.bearing : null,
      recordedAt: pos.time ? new Date(pos.time).toISOString() : new Date().toISOString(),
    };
  }

  private static webPositionToDto(pos: Position): LocationPointDto {
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      altitude: pos.coords.altitude ?? null,
      accuracy: pos.coords.accuracy,
      speed: pos.coords.speed !== null && pos.coords.speed >= 0 ? pos.coords.speed : null,
      heading: pos.coords.heading !== null && pos.coords.heading >= 0 ? pos.coords.heading : null,
      recordedAt: new Date(pos.timestamp).toISOString(),
    };
  }
}

