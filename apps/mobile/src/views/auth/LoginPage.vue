<template>
  <ion-page>
    <ion-content :fullscreen="true" class="auth-content">
      <div class="auth-container">
        <!-- Logo & Brand Header -->
        <div class="brand-header">
          <div class="logo-circle">
            <ion-icon :icon="fitnessOutline"></ion-icon>
          </div>
          <h1 class="brand-title">RunMate</h1>
          <p class="brand-subtitle text-muted">
            Track your movement, visualize routes, and achieve your fitness goals.
          </p>
        </div>

        <!-- Form Card -->
        <div class="auth-card runmate-card">
          <h2>Sign In</h2>

          <!-- Error Alert Banner -->
          <div v-if="authStore.errorMessage" class="error-banner">
            <ion-icon :icon="alertCircleOutline"></ion-icon>
            <span>{{ authStore.errorMessage }}</span>
          </div>

          <form @submit.prevent="handleLogin" class="auth-form">
            <div class="input-group">
              <label>Email Address</label>
              <div class="input-field-wrapper">
                <ion-icon :icon="mailOutline" class="input-icon text-muted"></ion-icon>
                <input
                  v-model="email"
                  type="email"
                  placeholder="name@example.com"
                  required
                  autocomplete="email"
                />
              </div>
            </div>

            <div class="input-group">
              <label>Password</label>
              <div class="input-field-wrapper">
                <ion-icon :icon="lockClosedOutline" class="input-icon text-muted"></ion-icon>
                <input
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="••••••••"
                  required
                  autocomplete="current-password"
                />
                <button
                  type="button"
                  class="toggle-eye-btn"
                  @click="showPassword = !showPassword"
                >
                  <ion-icon :icon="showPassword ? eyeOffOutline : eyeOutline"></ion-icon>
                </button>
              </div>
            </div>

            <button
              type="submit"
              class="auth-submit-btn"
              :disabled="authStore.isLoading || !email || !password"
            >
              <ion-spinner v-if="authStore.isLoading" name="crescent"></ion-spinner>
              <span v-else>Sign In</span>
            </button>
          </form>
        </div>

        <!-- Bottom Switcher Link -->
        <div class="auth-footer text-muted">
          <span>Don't have an account?</span>
          <router-link to="/register" class="auth-link">Sign Up</router-link>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonContent, IonIcon, IonPage, IonSpinner } from '@ionic/vue';
import {
  alertCircleOutline,
  eyeOffOutline,
  eyeOutline,
  fitnessOutline,
  lockClosedOutline,
  mailOutline,
} from 'ionicons/icons';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/authStore.js';

const router = useRouter();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const showPassword = ref(false);

async function handleLogin() {
  if (!email.value || !password.value) return;

  const success = await authStore.login(email.value, password.value);
  if (success) {
    router.replace('/tabs/dashboard');
  }
}
</script>

<style scoped>
.auth-content {
  --background: var(--ion-background-color);
}

.auth-container {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: calc(env(safe-area-inset-top) + 24px) 20px calc(env(safe-area-inset-bottom) + 24px) 20px;
  gap: 24px;
}

.brand-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.logo-circle {
  width: 64px;
  height: 64px;
  border-radius: 20px;
  background: var(--ion-color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: #ffffff;
  box-shadow: 0 8px 24px var(--app-accent-glow);
  margin-bottom: 12px;
}

.brand-title {
  font-size: 1.8rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  margin: 0 0 6px 0;
  color: var(--ion-text-color);
}

.brand-subtitle {
  font-size: 0.88rem;
  max-width: 280px;
  line-height: 1.4;
  margin: 0;
}

.auth-card {
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.auth-card h2 {
  font-size: 1.35rem;
  font-weight: 700;
  margin: 0;
  color: var(--ion-text-color);
}

.error-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.3);
  padding: 10px 14px;
  border-radius: 12px;
  color: var(--ion-color-danger);
  font-size: 0.84rem;
  font-weight: 500;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.input-group label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--app-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.input-field-wrapper {
  display: flex;
  align-items: center;
  background: var(--app-surface-elevated);
  border: 1.5px solid var(--app-card-border);
  border-radius: 14px;
  padding: 0 14px;
  height: 50px;
  transition: border-color 0.2s ease;
}

.input-field-wrapper:focus-within {
  border-color: var(--ion-color-primary);
}

.input-icon {
  font-size: 1.25rem;
  margin-right: 10px;
}

.input-field-wrapper input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: 0.95rem;
  color: var(--ion-text-color);
}

.toggle-eye-btn {
  background: transparent;
  border: none;
  color: var(--app-text-muted);
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  cursor: pointer;
}

.auth-submit-btn {
  height: 52px;
  border-radius: 16px;
  background: var(--ion-color-primary);
  color: #ffffff;
  border: none;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 18px var(--app-accent-glow);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 4px;
  transition: transform 0.15s ease;
}

.auth-submit-btn:active {
  transform: scale(0.98);
}

.auth-submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.auth-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 0.88rem;
}

.auth-link {
  color: var(--ion-color-primary);
  font-weight: 700;
  text-decoration: none;
}
</style>

