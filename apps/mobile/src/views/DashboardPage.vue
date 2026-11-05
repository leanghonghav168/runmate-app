<template>
  <ion-page>
    <ion-content :fullscreen="true" class="dashboard-content">
      <div class="page-container">
        <!-- Modern Header -->
        <header class="dashboard-header">
          <div class="user-info">
            <span class="greeting-subtitle text-muted">Welcome back,</span>
            <h1 class="user-title">{{ authStore.user?.name || 'Athlete' }} ⚡</h1>
          </div>
          <div class="avatar-badge" @click="router.push('/tabs/profile')">
            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80" alt="Avatar" />
          </div>
        </header>

        <!-- Quick Start Card -->
        <section class="quick-start-card runmate-card">
          <div class="quick-start-info">
            <span class="badge-pill">Ready to move</span>
            <h2>Start your workout</h2>
            <p class="text-muted">Pick your mode and track distance, pace, and route in real-time.</p>
          </div>
          <div class="mode-selector-grid">
            <ActivityModeCard
              :mode="ActivityType.RUNNING"
              :is-selected="trackingStore.selectedMode === ActivityType.RUNNING"
              @select="selectMode(ActivityType.RUNNING)"
            />
            <ActivityModeCard
              :mode="ActivityType.WALKING"
              :is-selected="trackingStore.selectedMode === ActivityType.WALKING"
              @select="selectMode(ActivityType.WALKING)"
            />
            <ActivityModeCard
              :mode="ActivityType.DRIVING"
              :is-selected="trackingStore.selectedMode === ActivityType.DRIVING"
              @select="selectMode(ActivityType.DRIVING)"
            />
          </div>
          <button class="primary-launch-btn" @click="goToTracking">
            <span>Launch Tracking</span>
            <ion-icon :icon="arrowForwardOutline"></ion-icon>
          </button>
        </section>

        <!-- Weekly Summary Section -->
        <section class="section-container">
          <div class="section-header">
            <h3>Weekly Summary</h3>
            <span class="text-muted text-sm">Last 7 days</span>
          </div>
          <div class="stats-grid">
            <StatCard
              label="Distance"
              :value="activityStore.weeklyTotalDistanceKm"
              unit="km"
              :icon="trendingUpOutline"
              icon-color="var(--ion-color-primary)"
            />
            <StatCard
              label="Active Time"
              :value="activityStore.weeklyTotalDurationMinutes"
              unit="mins"
              :icon="timeOutline"
              icon-color="var(--ion-color-secondary)"
            />
            <StatCard
              label="Workouts"
              :value="activityStore.totalActivitiesCount"
              unit="completed"
              :icon="flameOutline"
              icon-color="var(--ion-color-tertiary)"
            />
          </div>
        </section>

        <!-- Recent Activities Feed -->
        <section class="section-container">
          <div class="section-header">
            <h3>Recent Activities</h3>
            <a class="see-all-link" @click="router.push('/tabs/history')">See All</a>
          </div>

          <div class="recent-list">
            <div
              v-for="act in activityStore.recentActivities"
              :key="act.id"
              class="activity-item runmate-card"
              @click="openDetail(act.id)"
            >
              <div class="activity-icon-col" :class="act.activityType.toLowerCase()">
                <ion-icon :icon="getActivityIcon(act.activityType)"></ion-icon>
              </div>
              <div class="activity-details-col">
                <div class="activity-top-row">
                  <span class="activity-type-name">{{ formatModeName(act.activityType) }}</span>
                  <span class="activity-date text-muted">{{ formatDate(act.startedAt) }}</span>
                </div>
                <div class="activity-metrics-row">
                  <span class="metric-highlight">{{ (act.distanceMeters / 1000).toFixed(2) }} km</span>
                  <span class="metric-separator">•</span>
                  <span class="text-muted">{{ Math.round(act.durationSeconds / 60) }} min</span>
                  <span v-if="act.averagePace" class="metric-separator">•</span>
                  <span v-if="act.averagePace" class="text-muted">{{ act.averagePace }} /km</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ActivityType } from '@runmate/shared';
import { IonContent, IonIcon, IonPage, onIonViewWillEnter } from '@ionic/vue';
import {
  arrowForwardOutline,
  carOutline,
  fitnessOutline,
  flameOutline,
  timeOutline,
  trendingUpOutline,
  walkOutline,
} from 'ionicons/icons';
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import ActivityModeCard from '../components/common/ActivityModeCard.vue';
import StatCard from '../components/common/StatCard.vue';
import { useActivityStore } from '../stores/activityStore';
import { useAuthStore } from '../stores/authStore';
import { useTrackingStore } from '../stores/trackingStore';

const router = useRouter();
const authStore = useAuthStore();
const trackingStore = useTrackingStore();
const activityStore = useActivityStore();

async function refreshActivities() {
  if (authStore.user?.id) {
    await activityStore.loadActivitiesFromDb(authStore.user.id);
  }
}

onMounted(() => {
  refreshActivities();
});

onIonViewWillEnter(() => {
  refreshActivities();
});

function selectMode(mode: ActivityType) {
  trackingStore.setActivityMode(mode);
}

function goToTracking() {
  router.push('/tabs/track');
}

function openDetail(id: string) {
  router.push(`/tabs/history/${id}`);
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

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
</script>

<style scoped>
.dashboard-content {
  --background: var(--ion-background-color);
}

.page-container {
  padding: calc(env(safe-area-inset-top) + 20px) 16px 32px 16px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.greeting-subtitle {
  font-size: 0.85rem;
  font-weight: 500;
}

.user-title {
  font-size: 1.55rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 2px 0 0 0;
  color: var(--ion-text-color);
}

.avatar-badge {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid var(--ion-color-primary);
  box-shadow: 0 4px 12px var(--app-accent-glow);
  cursor: pointer;
}

.avatar-badge img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Quick Start Card */
.quick-start-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.badge-pill {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  background: rgba(16, 185, 129, 0.12);
  color: var(--ion-color-primary);
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}

.quick-start-info h2 {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 0 4px 0;
  color: var(--ion-text-color);
}

.quick-start-info p {
  font-size: 0.85rem;
  margin: 0;
}

.mode-selector-grid {
  display: flex;
  gap: 10px;
}

.primary-launch-btn {
  width: 100%;
  height: 52px;
  border-radius: 16px;
  background: var(--ion-color-primary);
  color: #ffffff;
  border: none;
  font-size: 1rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  box-shadow: 0 4px 18px var(--app-accent-glow);
  transition: transform 0.15s ease;
}

.primary-launch-btn:active {
  transform: scale(0.98);
}

/* Section styling */
.section-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-header h3 {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
  color: var(--ion-text-color);
}

.see-all-link {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--ion-color-primary);
  cursor: pointer;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

/* Recent list */
.recent-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  cursor: pointer;
  transition: transform 0.15s ease;
}

.activity-item:active {
  transform: scale(0.99);
}

.activity-icon-col {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
}

.activity-icon-col.running {
  background: rgba(16, 185, 129, 0.12);
  color: var(--ion-color-primary);
}

.activity-icon-col.walking {
  background: rgba(14, 165, 233, 0.12);
  color: var(--ion-color-secondary);
}

.activity-icon-col.driving {
  background: rgba(245, 158, 11, 0.12);
  color: var(--ion-color-tertiary);
}

.activity-details-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.activity-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.activity-type-name {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--ion-text-color);
}

.activity-date {
  font-size: 0.78rem;
}

.activity-metrics-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
}

.metric-highlight {
  font-weight: 600;
  color: var(--ion-text-color);
}

.metric-separator {
  color: var(--app-text-muted);
  font-size: 0.7rem;
}
</style>

