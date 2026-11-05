<template>
  <ion-page>
    <ion-content :fullscreen="true" class="detail-content">
      <div v-if="activity" class="detail-container">
        <!-- Floating Header Controls -->
        <header class="detail-header-bar">
          <button class="icon-round-btn back-btn" @click="goBack">
            <ion-icon :icon="arrowBackOutline"></ion-icon>
          </button>

          <div class="header-badges">
            <span class="mode-badge" :class="activity.activity_type.toLowerCase()">
              <ion-icon :icon="getActivityIcon(activity.activity_type)"></ion-icon>
              <span>{{ formatModeName(activity.activity_type) }}</span>
            </span>

            <span
              class="sync-badge"
              :class="{
                synced: activity.sync_status === 'SYNCED',
                pending: activity.sync_status === 'PENDING'
              }"
            >
              <ion-icon :icon="activity.sync_status === 'SYNCED' ? cloudDoneOutline : cloudUploadOutline"></ion-icon>
              <span>{{ activity.sync_status === 'SYNCED' ? 'Synced' : 'Pending Sync' }}</span>
            </span>
          </div>

          <button class="icon-round-btn delete-btn" @click="handleDelete">
            <ion-icon :icon="trashOutline"></ion-icon>
          </button>
        </header>

        <!-- Leaflet Map of Entire Route -->
        <div class="route-map-viewport">
          <LeafletMap
            v-if="routePoints.length > 0"
            :points="routePoints"
            :current-location="routePoints[routePoints.length - 1]"
            :auto-fit-bounds="true"
          />
          <div v-else class="map-placeholder">
            <ion-icon :icon="mapOutline"></ion-icon>
            <span>No GPS breadcrumbs for this session</span>
          </div>
        </div>

        <!-- Primary Stats Card -->
        <section class="main-stats-section runmate-card">
          <div class="primary-distance-row">
            <div class="distance-col">
              <span class="stat-caption text-muted">Total Distance</span>
              <div class="number-unit-row">
                <span class="hero-number metric-number">{{ (activity.distance_meters / 1000).toFixed(2) }}</span>
                <span class="hero-unit">km</span>
              </div>
            </div>
            <div class="date-col text-muted">
              {{ formatFullDate(activity.started_at) }}
            </div>
          </div>

          <div class="metrics-grid">
            <div class="metric-cell">
              <span class="cell-label text-muted">Duration</span>
              <span class="cell-val metric-number">{{ formatDuration(activity.duration_seconds) }}</span>
            </div>
            <div class="metric-cell">
              <span class="cell-label text-muted">Avg Pace</span>
              <span class="cell-val metric-number">{{ formatPace(activity.average_pace) }} /km</span>
            </div>
            <div class="metric-cell">
              <span class="cell-label text-muted">Avg Speed</span>
              <span class="cell-val metric-number">{{ (activity.average_speed * 3.6).toFixed(1) }} km/h</span>
            </div>
            <div class="metric-cell">
              <span class="cell-label text-muted">Max Speed</span>
              <span class="cell-val metric-number">{{ (activity.max_speed * 3.6).toFixed(1) }} km/h</span>
            </div>
          </div>
        </section>

        <!-- Kilometer Splits Section -->
        <section class="splits-section runmate-card">
          <div class="splits-header">
            <h3>Kilometer Splits</h3>
            <span class="text-muted text-sm">{{ splits.length }} split{{ splits.length === 1 ? '' : 's' }}</span>
          </div>

          <div v-if="splits.length > 0" class="splits-list">
            <div class="splits-table-header text-muted">
              <span>KM</span>
              <span>Pace</span>
              <span>Split Time</span>
              <span>Speed</span>
            </div>

            <div
              v-for="split in splits"
              :key="split.kilometer"
              class="split-row"
              :class="{ fastest: isFastestSplit(split) }"
            >
              <div class="km-col">
                <span class="km-badge">Km {{ split.kilometer }}</span>
                <span v-if="isFastestSplit(split)" class="fastest-pill">Best</span>
              </div>
              <span class="split-pace metric-number">{{ split.paceFormatted }}</span>
              <span class="split-duration metric-number">{{ formatDuration(split.durationSeconds) }}</span>
              <span class="split-speed text-muted">{{ split.speedKmh }} km/h</span>
            </div>
          </div>

          <div v-else class="no-splits text-muted">
            <span>Workout was under 1 km. Complete at least 1 km to unlock split analytics.</span>
          </div>
        </section>
      </div>

      <!-- Loading / Not Found State -->
      <div v-else class="empty-detail">
        <ion-spinner name="crescent"></ion-spinner>
        <span>Loading workout details...</span>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ActivityType, type LocationPointDto } from '@runmate/shared';
import { IonContent, IonIcon, IonPage, IonSpinner } from '@ionic/vue';
import {
  arrowBackOutline,
  carOutline,
  cloudDoneOutline,
  cloudUploadOutline,
  fitnessOutline,
  mapOutline,
  trashOutline,
  walkOutline,
} from 'ionicons/icons';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import LeafletMap from '../components/common/LeafletMap.vue';
import type { LocalActivityRecord } from '../database/schema.js';
import { useActivityStore } from '../stores/activityStore.js';
import {
  calculateSplits,
  formatDuration,
  formatPace,
  type ActivitySplit,
} from '../utils/geo.utils.js';

const route = useRoute();
const router = useRouter();
const activityStore = useActivityStore();

const activity = ref<LocalActivityRecord | null>(null);
const routePoints = ref<LocationPointDto[]>([]);
const splits = ref<ActivitySplit[]>([]);

const activityId = computed(() => route.params.id as string);

async function loadDetail() {
  if (!activityId.value) return;

  const act = await activityStore.getActivityById(activityId.value);
  if (act) {
    activity.value = act;
    const pts = await activityStore.getActivityRoute(activityId.value);
    routePoints.value = pts;
    splits.value = calculateSplits(pts);
  }
}

function isFastestSplit(split: ActivitySplit): boolean {
  if (splits.value.length < 2) return false;
  const validPaces = splits.value.map((s) => s.paceMinPerKm).filter((p) => p > 0);
  const minPace = Math.min(...validPaces);
  return split.paceMinPerKm === minPace;
}

function goBack() {
  router.back();
}

async function handleDelete() {
  if (!activity.value) return;
  if (confirm('Delete this workout permanently?')) {
    await activityStore.deleteActivity(activity.value.id);
    router.replace('/tabs/history');
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
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

onMounted(() => {
  loadDetail();
});
</script>

<style scoped>
.detail-content {
  --background: var(--ion-background-color);
}

.detail-container {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding-bottom: 40px;
  gap: 16px;
}

/* Floating Top Controls */
.detail-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(env(safe-area-inset-top) + 12px) 16px 0 16px;
}

.icon-round-btn {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: var(--app-card-bg);
  border: 1px solid var(--app-card-border);
  color: var(--ion-text-color);
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.delete-btn {
  color: var(--ion-color-danger);
}

.header-badges {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mode-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
}

.mode-badge.running {
  background: rgba(16, 185, 129, 0.15);
  color: var(--ion-color-primary);
}

.mode-badge.walking {
  background: rgba(14, 165, 233, 0.15);
  color: var(--ion-color-secondary);
}

.mode-badge.driving {
  background: rgba(245, 158, 11, 0.15);
  color: var(--ion-color-tertiary);
}

.sync-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 600;
}

.sync-badge.synced {
  background: rgba(16, 185, 129, 0.1);
  color: var(--ion-color-primary);
}

.sync-badge.pending {
  background: rgba(245, 158, 11, 0.1);
  color: var(--ion-color-warning);
}

/* Map Viewport */
.route-map-viewport {
  width: 100%;
  height: 280px;
  border-radius: 0;
  overflow: hidden;
  position: relative;
}

.map-placeholder {
  width: 100%;
  height: 100%;
  background: var(--app-surface-elevated);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--app-text-muted);
  font-size: 0.85rem;
}

.map-placeholder ion-icon {
  font-size: 2.2rem;
}

/* Main Stats Card */
.main-stats-section {
  margin: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.primary-distance-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}

.stat-caption {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: block;
}

.number-unit-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.hero-number {
  font-size: 3rem;
  line-height: 1;
  color: var(--ion-text-color);
}

.hero-unit {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--ion-color-primary);
}

.date-col {
  font-size: 0.82rem;
  text-align: right;
  max-width: 140px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  background: var(--app-surface-elevated);
  padding: 12px 6px;
  border-radius: 16px;
  text-align: center;
  gap: 4px;
}

.metric-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cell-label {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.cell-val {
  font-size: 0.92rem;
  color: var(--ion-text-color);
}

/* Splits Section */
.splits-section {
  margin: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.splits-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.splits-header h3 {
  font-size: 1.15rem;
  font-weight: 700;
  margin: 0;
  color: var(--ion-text-color);
}

.splits-table-header {
  display: grid;
  grid-template-columns: 80px 1fr 1fr 1fr;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 6px 12px;
  border-bottom: 1px solid var(--app-card-border);
}

.splits-list {
  display: flex;
  flex-direction: column;
}

.split-row {
  display: grid;
  grid-template-columns: 80px 1fr 1fr 1fr;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 0.88rem;
}

.split-row.fastest {
  background: rgba(16, 185, 129, 0.06);
  border-radius: 10px;
}

.km-col {
  display: flex;
  align-items: center;
  gap: 6px;
}

.km-badge {
  font-weight: 700;
  color: var(--ion-text-color);
}

.fastest-pill {
  font-size: 0.62rem;
  font-weight: 800;
  background: var(--ion-color-primary);
  color: #ffffff;
  padding: 2px 5px;
  border-radius: 6px;
  text-transform: uppercase;
}

.split-pace {
  color: var(--ion-color-primary);
  font-weight: 700;
}

.split-duration {
  color: var(--ion-text-color);
}

.split-speed {
  font-size: 0.8rem;
}

.no-splits {
  padding: 20px;
  text-align: center;
  font-size: 0.82rem;
}

.empty-detail {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 60vh;
  gap: 12px;
  color: var(--app-text-muted);
}
</style>
