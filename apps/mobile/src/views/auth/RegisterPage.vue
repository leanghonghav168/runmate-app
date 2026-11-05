<template>
  <ion-page>
    <ion-content :fullscreen="true" class="auth-content">
      <div class="auth-container">
        <!-- Brand Header -->
        <div class="brand-header">
          <div class="logo-circle">
            <ion-icon :icon="fitnessOutline"></ion-icon>
          </div>
          <h1 class="brand-title">Join RunMate</h1>
          <p class="brand-subtitle text-muted">
            Create your account to start tracking and syncing your activities.
          </p>
        </div>

        <!-- Form Card -->
        <div class="auth-card runmate-card">
          <h2>Create Account</h2>

          <!-- Error Alert Banner -->
          <div v-if="localError || authStore.errorMessage" class="error-banner">
            <ion-icon :icon="alertCircleOutline"></ion-icon>
            <span>{{ localError || authStore.errorMessage }}</span>
          </div>

          <form @submit.prevent="handleRegister" class="auth-form">
            <!-- Full Name -->
            <div class="input-group">
              <label>Full Name</label>
              <div class="input-field-wrapper">
                <ion-icon :icon="personOutline" class="input-icon text-muted"></ion-icon>
                <input
                  v-model="name"
                  type="text"
                  placeholder="Alex Johnson"
                  required
                  autocomplete="name"
                />
              </div>
            </div>

            <!-- Email -->
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

            <!-- Password -->
            <div class="input-group">
              <label>Password (Min. 8 characters)</label>
              <div class="input-field-wrapper">
                <ion-icon :icon="lockClosedOutline" class="input-icon text-muted"></ion-icon>
                <input
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="••••••••"
                  minlength="8"
                  required
                  autocomplete="new-password"
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

            <!-- Confirm Password -->
            <div class="input-group">
              <label>Confirm Password</label>
              <div class="input-field-wrapper">
                <ion-icon :icon="shieldCheckmarkOutline" class="input-icon text-muted"></ion-icon>
                <input
                  v-model="confirmPassword"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="••••••••"
                  minlength="8"
                  required
                  autocomplete="new-password"
                />
              </div>
            </div>

            <button
              type="submit"
              class="auth-submit-btn"
              :disabled="authStore.isLoading || !isFormValid"
            >
              <ion-spinner v-if="authStore.isLoading" name="crescent"></ion-spinner>
              <span v-else>Create Account</span>
            </button>
          </form>
        </div>

        <!-- Bottom Switcher Link -->
        <div class="auth-footer text-muted">
          <span>Already have an account?</span>
          <router-link to="/login" class="auth-link">Sign In</router-link>
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
  personOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/authStore.js';

const router = useRouter();
const authStore = useAuthStore();

const name = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const showPassword = ref(false);
const localError = ref<string | null>(null);

const isFormValid = computed(() => {
  return (
    name.value.trim().length > 1 &&
    email.value.includes('@') &&
    password.value.length >= 8 &&
    confirmPassword.value.length >= 8
  );
});

async function handleRegister() {
  localError.value = null;

  if (password.value !== confirmPassword.value) {
    localError.value = 'Passwords do not match';
    return;
  }

  const success = await authStore.register(name.value, email.value, password.value);
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
  gap: 20px;
}

.brand-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.logo-circle {
  width: 58px;
  height: 58px;
  border-radius: 18px;
  background: var(--ion-color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  color: #ffffff;
  box-shadow: 0 8px 24px var(--app-accent-glow);
  margin-bottom: 10px;
}

.brand-title {
  font-size: 1.7rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  margin: 0 0 4px 0;
  color: var(--ion-text-color);
}

.brand-subtitle {
  font-size: 0.85rem;
  max-width: 290px;
  line-height: 1.4;
  margin: 0;
}

.auth-card {
  padding: 22px 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.auth-card h2 {
  font-size: 1.3rem;
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
  gap: 14px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.input-group label {
  font-size: 0.78rem;
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
  height: 48px;
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
  margin-top: 6px;
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

