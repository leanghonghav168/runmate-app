import type { UserProfile } from '@runmate/shared';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { api } from '../services/api.service.js';
import { StorageService } from '../services/storage.service.js';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserProfile | null>(null);
  const accessToken = ref<string | null>(null);
  const refreshToken = ref<string | null>(null);
  const isInitialized = ref<boolean>(false);
  const isLoading = ref<boolean>(false);
  const errorMessage = ref<string | null>(null);

  const isAuthenticated = computed(() => !!user.value && !!accessToken.value);

  async function initAuth() {
    if (isInitialized.value) return;
    isLoading.value = true;
    try {
      const storedAccessToken = await StorageService.getAccessToken();
      const storedRefreshToken = await StorageService.getRefreshToken();
      const storedUser = await StorageService.getUserData<UserProfile>();

      if (storedAccessToken && storedRefreshToken) {
        accessToken.value = storedAccessToken;
        refreshToken.value = storedRefreshToken;
        user.value = storedUser;

        // Verify with server & sync profile in background
        try {
          const res = await api.get('/users/me');
          user.value = res.data;
          await StorageService.setUserData(res.data);
        } catch (err: any) {
          // If server call fails due to invalid/expired session, clear
          if (err.response?.status === 401) {
            await logout();
          }
        }
      }
    } catch (err) {
      console.error('Failed to restore auth session:', err);
    } finally {
      isLoading.value = false;
      isInitialized.value = true;
    }
  }

  async function login(email: string, password: string) {
    isLoading.value = true;
    errorMessage.value = null;
    try {
      const res = await api.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      });

      const { user: userData, accessToken: newAccess, refreshToken: newRefresh } = res.data;

      user.value = userData;
      accessToken.value = newAccess;
      refreshToken.value = newRefresh;

      await StorageService.setAccessToken(newAccess);
      await StorageService.setRefreshToken(newRefresh);
      await StorageService.setUserData(userData);

      return true;
    } catch (err: any) {
      errorMessage.value =
        err.response?.data?.message || 'Login failed. Please check your credentials.';
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function register(name: string, email: string, password: string) {
    isLoading.value = true;
    errorMessage.value = null;
    try {
      const res = await api.post('/auth/register', {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      const { user: userData, accessToken: newAccess, refreshToken: newRefresh } = res.data;

      user.value = userData;
      accessToken.value = newAccess;
      refreshToken.value = newRefresh;

      await StorageService.setAccessToken(newAccess);
      await StorageService.setRefreshToken(newRefresh);
      await StorageService.setUserData(userData);

      return true;
    } catch (err: any) {
      errorMessage.value =
        err.response?.data?.message || 'Registration failed. Please try again.';
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function logout() {
    try {
      const token = await StorageService.getRefreshToken();
      if (token) {
        await api.post('/auth/logout', { refreshToken: token }).catch(() => {});
      }
    } finally {
      user.value = null;
      accessToken.value = null;
      refreshToken.value = null;
      await StorageService.clearAuthData();
    }
  }

  async function updateProfile(data: { name?: string; password?: string }) {
    isLoading.value = true;
    errorMessage.value = null;
    try {
      const res = await api.patch('/users/profile', data);
      user.value = res.data;
      await StorageService.setUserData(res.data);
      return true;
    } catch (err: any) {
      errorMessage.value =
        err.response?.data?.message || 'Failed to update profile.';
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  return {
    user,
    accessToken,
    refreshToken,
    isInitialized,
    isLoading,
    errorMessage,
    isAuthenticated,
    initAuth,
    login,
    register,
    logout,
    updateProfile,
  };
});

