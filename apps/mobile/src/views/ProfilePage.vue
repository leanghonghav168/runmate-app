<template>
  <ion-page>
    <ion-content :fullscreen="true" class="profile-content">
      <div class="page-container">
        <!-- Header -->
        <header class="profile-header">
          <h1>My Profile</h1>
        </header>

        <!-- User Info Card -->
        <div class="user-card runmate-card">
          <div class="avatar-large">
            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80" alt="Avatar" />
          </div>
          <div class="user-info-text">
            <h2>{{ authStore.user?.name || 'RunMate Athlete' }}</h2>
            <span class="user-email text-muted">{{ authStore.user?.email || 'runner@runmate.app' }}</span>
            <div class="member-pill">
              <ion-icon :icon="shieldCheckmarkOutline"></ion-icon>
              <span>{{ memberSinceText }}</span>
            </div>
          </div>
        </div>

        <!-- Sync & Storage Status Card -->
        <div class="sync-status-card runmate-card">
          <div class="sync-icon-col">
            <ion-icon :icon="cloudDoneOutline"></ion-icon>
          </div>
          <div class="sync-info-col">
            <span class="sync-title">Cloud Account & Sync</span>
            <span class="sync-desc text-muted">Signed In as {{ authStore.user?.email }}</span>
          </div>
          <span class="status-indicator">Connected</span>
        </div>

        <!-- Edit Profile Section -->
        <section class="settings-section">
          <span class="section-title text-muted">PROFILE DETAILS</span>
          <div class="settings-group runmate-card">
            <div class="profile-edit-row">
              <label>Full Name</label>
              <div class="edit-input-wrapper">
                <input v-model="editName" type="text" placeholder="Update name" />
                <button
                  type="button"
                  class="save-name-btn"
                  :disabled="!editName || editName === authStore.user?.name || isUpdating"
                  @click="handleUpdateName"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- Settings List Section -->
        <section class="settings-section">
          <span class="section-title text-muted">APP SETTINGS</span>
          <div class="settings-group runmate-card">
            <div class="settings-row">
              <div class="row-left">
                <ion-icon :icon="locationOutline" class="row-icon"></ion-icon>
                <span>GPS High Accuracy</span>
              </div>
              <ion-toggle :checked="true" color="primary"></ion-toggle>
            </div>

            <div class="settings-divider"></div>

            <div class="settings-row">
              <div class="row-left">
                <ion-icon :icon="notificationsOutline" class="row-icon"></ion-icon>
                <span>Background Tracking Alerts</span>
              </div>
              <ion-toggle :checked="true" color="primary"></ion-toggle>
            </div>

            <div class="settings-divider"></div>

            <div class="settings-row">
              <div class="row-left">
                <ion-icon :icon="moonOutline" class="row-icon"></ion-icon>
                <span>Dark Theme</span>
              </div>
              <ion-toggle :checked="true" color="primary"></ion-toggle>
            </div>
          </div>
        </section>

        <!-- Account Actions -->
        <section class="settings-section">
          <span class="section-title text-muted">ACCOUNT</span>
          <div class="settings-group runmate-card">
            <button class="menu-action-btn" @click="handleLogout">
              <ion-icon :icon="logOutOutline" class="danger-icon"></ion-icon>
              <span class="danger-text">Log Out</span>
            </button>
          </div>
        </section>

        <!-- App Footer Info -->
        <div class="app-info-footer text-muted">
          <span>RunMate v1.0.0 (Capacitor 8)</span>
          <span>Connected to NestJS & PostgreSQL</span>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonContent, IonIcon, IonPage, IonToggle } from '@ionic/vue';
import {
  cloudDoneOutline,
  locationOutline,
  logOutOutline,
  moonOutline,
  notificationsOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/authStore.js';

const router = useRouter();
const authStore = useAuthStore();

const editName = ref(authStore.user?.name || '');
const isUpdating = ref(false);

watch(
  () => authStore.user?.name,
  (val) => {
    if (val) editName.value = val;
  },
);

const memberSinceText = computed(() => {
  if (!authStore.user?.createdAt) return 'Member';
  const d = new Date(authStore.user.createdAt);
  return `Member since ${d.getFullYear()}`;
});

async function handleUpdateName() {
  if (!editName.value) return;
  isUpdating.value = true;
  await authStore.updateProfile({ name: editName.value });
  isUpdating.value = false;
}

async function handleLogout() {
  if (confirm('Are you sure you want to log out?')) {
    await authStore.logout();
    router.replace('/login');
  }
}
</script>

<style scoped>
.profile-content {
  --background: var(--ion-background-color);
}

.page-container {
  padding: calc(env(safe-area-inset-top) + 20px) 16px 32px 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.profile-header h1 {
  font-size: 1.6rem;
  font-weight: 800;
  margin: 0;
  color: var(--ion-text-color);
}

.user-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
}

.avatar-large {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid var(--ion-color-primary);
  box-shadow: 0 4px 14px var(--app-accent-glow);
}

.avatar-large img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-info-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-info-text h2 {
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0;
  color: var(--ion-text-color);
}

.user-email {
  font-size: 0.85rem;
}

.member-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--ion-color-primary);
  margin-top: 4px;
}

.sync-status-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
}

.sync-icon-col {
  font-size: 1.6rem;
  color: var(--ion-color-primary);
  display: flex;
  align-items: center;
}

.sync-info-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sync-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--ion-text-color);
}

.sync-desc {
  font-size: 0.75rem;
}

.status-indicator {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--ion-color-primary);
  background: rgba(16, 185, 129, 0.12);
  padding: 4px 8px;
  border-radius: 8px;
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-title {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  padding-left: 4px;
}

.settings-group {
  padding: 10px 16px;
}

.profile-edit-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 4px 0;
}

.profile-edit-row label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--app-text-muted);
}

.edit-input-wrapper {
  display: flex;
  gap: 8px;
}

.edit-input-wrapper input {
  flex: 1;
  background: var(--app-surface-elevated);
  border: 1px solid var(--app-card-border);
  border-radius: 12px;
  padding: 10px 12px;
  color: var(--ion-text-color);
  outline: none;
}

.save-name-btn {
  background: var(--ion-color-primary);
  color: #ffffff;
  border: none;
  border-radius: 12px;
  padding: 0 16px;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
}

.save-name-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
}

.row-left {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.92rem;
  font-weight: 500;
  color: var(--ion-text-color);
}

.row-icon {
  font-size: 1.25rem;
  color: var(--app-text-muted);
}

.settings-divider {
  height: 1px;
  background: var(--app-card-border);
}

.menu-action-btn {
  width: 100%;
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  cursor: pointer;
}

.danger-icon,
.danger-text {
  color: var(--ion-color-danger);
  font-size: 1.25rem;
  font-weight: 600;
}

.danger-text {
  font-size: 0.95rem;
}

.app-info-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  font-size: 0.75rem;
  margin-top: 10px;
}
</style>
