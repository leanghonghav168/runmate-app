import { Preferences } from '@capacitor/preferences';

const KEYS = {
  ACCESS_TOKEN: 'runmate_access_token',
  REFRESH_TOKEN: 'runmate_refresh_token',
  USER_DATA: 'runmate_user_data',
} as const;

export class StorageService {
  static async getAccessToken(): Promise<string | null> {
    const { value } = await Preferences.get({ key: KEYS.ACCESS_TOKEN });
    return value;
  }

  static async setAccessToken(token: string): Promise<void> {
    await Preferences.set({ key: KEYS.ACCESS_TOKEN, value: token });
  }

  static async getRefreshToken(): Promise<string | null> {
    const { value } = await Preferences.get({ key: KEYS.REFRESH_TOKEN });
    return value;
  }

  static async setRefreshToken(token: string): Promise<void> {
    await Preferences.set({ key: KEYS.REFRESH_TOKEN, value: token });
  }

  static async getUserData<T>(): Promise<T | null> {
    const { value } = await Preferences.get({ key: KEYS.USER_DATA });
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  static async setUserData<T>(data: T): Promise<void> {
    await Preferences.set({
      key: KEYS.USER_DATA,
      value: JSON.stringify(data),
    });
  }

  static async clearAuthData(): Promise<void> {
    await Preferences.remove({ key: KEYS.ACCESS_TOKEN });
    await Preferences.remove({ key: KEYS.REFRESH_TOKEN });
    await Preferences.remove({ key: KEYS.USER_DATA });
  }
}

