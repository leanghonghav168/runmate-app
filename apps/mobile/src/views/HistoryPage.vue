<template>
  <ion-page>
    <ion-content :fullscreen="true" class="history-content">
      <div class="page-container">
        <!-- Header -->
        <header class="page-header">
          <div class="header-titles">
            <h1>Activity History</h1>
            <span class="text-muted text-sm">All your recorded sessions</span>
          </div>
          <button
            class="sync-pill-btn"
            :class="{ offline: !syncStore.isOnline, pending: syncStore.pendingCount > 0 }"
            :disabled="syncStore.isSyncing"
            @click="triggerSync"
          >
            <ion-icon
              :icon="syncStore.isAllSynced ? cloudDoneOutline : cloudUploadOutline"
              :class="{ spinning: syncStore.isSyncing }"
            ></ion-icon>
            <span>{{ syncStore.syncStatusText }}</span>
          </button>
        </header>

        <!-- Filter Chips -->
        <div class="filter-chips-row">
          <button
            class="filter-chip"
            :class="{ active: selectedFilter === 'ALL' }"
            @click="selectedFilter = 'ALL'"
          >
            All
          </button>
          <button
            class="filter-chip"
            :class="{ active: selectedFilter === ActivityType.RUNNING }"
            @click="selectedFilter = ActivityType.RUNNING"
          >
            Running
          </button>
          <button
            class="filter-chip"
            :class="{ active: selectedFilter === ActivityType.WALKING }"
            @click="selectedFilter = ActivityType.WALKING"
          >
            Walking
          </button>
          <button
            class="filter-chip"
            :class="{ active: selectedFilter === ActivityType.DRIVING }"
            @click="selectedFilter = ActivityType.DRIVING"
          >
            Driving
          </button>
        </div>

        <!-- Activity List -->
        <div v-if="filteredActivities.length > 0" class="activities-list">
          <div
            v-for="act in filteredActivities"
            :key="act.id"
            class="history-card runmate-card"
            @click="openDetail(act.id)"
          >
            <div class="card-top">
              <div class="mode-badge" :class="act.activityType.toLowerCase()">
                <ion-icon :icon="getActivityIcon(act.activityType)"></ion-icon>
                <span>{{ formatModeName(act.activityType) }}</span>
              </div>
              <button class="delete-icon-btn" @click.stop="confirmDelete(act.id)">
                <ion-icon :icon="trashOutline"></ion-icon>
              </button>
            </div>

            <div class="card-main">
              <div class="main-metric">
                <span class="metric-number distance-num">
                  {{ (act.distanceMeters / 1000).toFixed(2) }}
                </span>
                <span class="unit">km</span>
              </div>
              <div class="date-tag text-muted">
                {{ formatFullDate(act.startedAt) }}
              </div>
            </div>

            <div class="card-stats-grid">
              <div class="stat-cell">
                <span class="cell-label text-muted">Duration</span>
                <span class="cell-value metric-number">{{ formatDuration(act.durationSeconds) }}</span>
              </div>
              <div class="stat-cell">
                <span class="cell-label text-muted">Avg Speed</span>
                <span class="cell-value metric-number">{{ (act.averageSpeed * 3.6).toFixed(1) }} km/h</span>
              </div>
              <div class="stat-cell">
                <span class="cell-label text-muted">Pace</span>
                <span class="cell-value metric-number">{{ act.averagePace ? act.averagePace.toFixed(2) + ' /km' : '--' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="empty-state runmate-card">
          <ion-icon :icon="timeOutline" class="empty-icon text-muted"></ion-icon>
          <h3>No activities recorded</h3>
          <p class="text-muted">Start tracking a session from the Track tab to see your history here.</p>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ActivityType, type ActivitySummaryDto } from '@runmate/shared';
import { IonContent, IonIcon, IonPage, onIonViewWillEnter } from '@ionic/vue';
import {
  carOutline,
  cloudDoneOutline,
  cloudUploadOutline,
  fitnessOutline,
  timeOutline,
  trashOutline,
  walkOutline,
} from 'ionicons/icons';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useActivityStore } from '../stores/activityStore';
import { useAuthStore } from '../stores/authStore';
import { useSyncStore } from '../stores/syncStore';

const router = useRouter();
const activityStore = useActivityStore();
const authStore = useAuthStore();
const syncStore = useSyncStore();
const selectedFilter = ref<string>('ALL');

async function refreshActivities() {
  if (authStore.user?.id) {
    await activityStore.loadActivitiesFromDb(authStore.user.id);
    await syncStore.refreshPendingCount(authStore.user.id);
  }
}

onMounted(() => {
  refreshActivities();
});

onIonViewWillEnter(() => {
  refreshActivities();
});

function openDetail(id: string) {
  router.push(`/tabs/history/${id}`);
}

async function triggerSync() {
  if (authStore.user?.id) {
    await syncStore.syncNow(authStore.user.id);
    await refreshActivities();
  }
}

const filteredActivities = computed(() => {
  if (selectedFilter.value === 'ALL') {
    return activityStore.recentActivities;
  }
  return activityStore.recentActivities.filter(
    (act) => act.activityType === selectedFilter.value,
  );
});

function confirmDelete(id: string) {
  if (confirm('Delete this activity record?')) {
    activityStore.deleteActivity(id);
  }
}

function formatModeName(mode: ActivityType) {
  return mode.charAt(0) + mode.slice(1).toLowerCase();
}

function getActivityIcon(mode: ActivityType) {
  switch (mode) {
    case ActivityType.WALKING:
      return walkOutline;
    case ActivityType.RUNNING:
      return fitnessOutline;
    case ActivityType.DRIVING:
      return carOutline;
  }
}

function formatFullDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}
</script>

<style scoped>
.history-content {
  --background: var(--ion-background-color);
}

.page-container {
  padding: calc(env(safe-area-inset-top) + 20px) 16px 32px 16px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-header h1 {
  font-size: 1.6rem;
  font-weight: 800;
  margin: 0 0 4px 0;
  color: var(--ion-text-color);
}

.sync-pill-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--app-surface-elevated);
  border: 1px solid var(--app-card-border);
  color: var(--ion-color-primary);
  font-size: 0.78rem;
  font-weight: 700;
  padding: 6px 12px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sync-pill-btn.offline {
  color: var(--app-text-muted);
}

.sync-pill-btn.pending {
  color: var(--ion-color-warning);
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  100% {
    transform: rotate(360deg);
  }
}

.history-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  cursor: pointer;
  transition: transform 0.15s ease;
}

.history-card:active {
  transform: scale(0.99);
}

.filter-chips-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.filter-chip {
  padding: 8px 16px;
  border-radius: 20px;
  background: var(--app-card-bg);
  border: 1px solid var(--app-card-border);
  color: var(--app-text-muted);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.filter-chip.active {
  background: var(--ion-color-primary);
  color: #ffffff;
  border-color: var(--ion-color-primary);
}

.activities-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.history-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mode-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
}

.mode-badge.running {
  background: rgba(16, 185, 129, 0.12);
  color: var(--ion-color-primary);
}

.mode-badge.walking {
  background: rgba(14, 165, 233, 0.12);
  color: var(--ion-color-secondary);
}

.mode-badge.driving {
  background: rgba(245, 158, 11, 0.12);
  color: var(--ion-color-tertiary);
}

.delete-icon-btn {
  background: transparent;
  border: none;
  color: var(--app-text-muted);
  font-size: 1.1rem;
  cursor: pointer;
}

.card-main {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.distance-num {
  font-size: 2.2rem;
  line-height: 1;
  color: var(--ion-text-color);
}

.unit {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--ion-color-primary);
  margin-left: 4px;
}

.date-tag {
  font-size: 0.8rem;
}

.card-stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  background: var(--app-surface-elevated);
  padding: 10px;
  border-radius: 14px;
  text-align: center;
}

.cell-label {
  font-size: 0.7rem;
  display: block;
}

.cell-value {
  font-size: 0.95rem;
  color: var(--ion-text-color);
  margin-top: 2px;
  display: block;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 40px 20px;
  gap: 10px;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 6px;
}

.empty-state h3 {
  font-size: 1.15rem;
  font-weight: 700;
  margin: 0;
  color: var(--ion-text-color);
}
</style>

