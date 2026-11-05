import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const TRACKING_NOTIFICATION_ID = 1001;
const TRACKING_CHANNEL_ID = 'runmate_tracking_channel';

export class NotificationService {
  private static isChannelCreated = false;

  /**
   * Ensure the notification channel is registered on Android.
   */
  static async initChannel(): Promise<void> {
    if (this.isChannelCreated || !Capacitor.isNativePlatform()) return;

    try {
      await LocalNotifications.createChannel({
        id: TRACKING_CHANNEL_ID,
        name: 'Active Workout Tracking',
        description: 'Displays persistent status and statistics during an active workout',
        importance: 4, // High importance
        visibility: 1, // Public on lock-screen
        vibration: false,
      });
      this.isChannelCreated = true;
    } catch (err) {
      console.warn('Could not create notification channel:', err);
    }
  }

  /**
   * Request push/local notification permission.
   */
  static async requestPermission(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return true;

    try {
      const status = await LocalNotifications.requestPermissions();
      return status.display === 'granted';
    } catch (err) {
      console.warn('Error requesting notification permissions:', err);
      return false;
    }
  }

  /**
   * Displays or updates the persistent tracking notification on the lock screen / tray.
   */
  static async updateTrackingNotification(params: {
    modeTitle: string;
    distanceText: string;
    durationText: string;
    paceOrSpeedText: string;
  }): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    await this.initChannel();

    const title = `RunMate • ${params.modeTitle}`;
    const body = `${params.distanceText} • ${params.durationText} • ${params.paceOrSpeedText}`;

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: TRACKING_NOTIFICATION_ID,
            title,
            body,
            channelId: TRACKING_CHANNEL_ID,
            ongoing: true, // Cannot be dismissed while workout is running
            autoCancel: false,
            smallIcon: 'ic_launcher',
            iconColor: '#10B981',
          },
        ],
      });
    } catch (err) {
      console.warn('Could not post tracking notification:', err);
    }
  }

  /**
   * Clears the ongoing workout notification once tracking is stopped or saved.
   */
  static async clearTrackingNotification(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    try {
      await LocalNotifications.cancel({
        notifications: [{ id: TRACKING_NOTIFICATION_ID }],
      });
    } catch (err) {
      console.warn('Error cancelling tracking notification:', err);
    }
  }
}

