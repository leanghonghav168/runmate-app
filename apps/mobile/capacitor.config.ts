import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.runmate.app',
  appName: 'RunMate',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_launcher',
      iconColor: '#10B981',
    },
    BackgroundGeolocation: {
      backgroundMessage: 'RunMate is tracking your workout in the background.',
      backgroundTitle: 'RunMate Active Workout',
    },
  },
};

export default config;

