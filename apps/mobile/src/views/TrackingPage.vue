<template>
  <ion-page>
    <ion-content :fullscreen="true" class="tracking-content">
      <div class="tracking-container">
        <!-- Top Floating Header Bar -->
        <div class="tracking-header-bar">
          <!-- Activity Mode Switcher Pills -->
          <div class="mode-pill-group">
            <button
              v-for="mode in modes"
              :key="mode"
              class="mode-pill-btn"
              :class="{ active: trackingStore.selectedMode === mode }"
              :disabled="trackingStore.isTracking"
              @click="trackingStore.setActivityMode(mode)"
            >
              <ion-icon :icon="getModeIcon(mode)"></ion-icon>
              <span>{{ formatModeName(mode) }}</span>
            </button>
          </div>

          <!-- GPS Status Indicator -->
          <div
            class="gps-status-pill"
            :class="{
              live: trackingStore.isTracking && trackingStore.gpsStatus !== 'POOR',
              warning: trackingStore.gpsStatus === 'POOR' || trackingStore.gpsStatus === 'SEARCHING',
              error: trackingStore.gpsStatus === 'DENIED' || trackingStore.gpsStatus === 'ERROR'
            }"
          >
            <span class="pulse-dot"></span>
            <span>{{ gpsStatusText }}</span>
          </div>
        </div>

        <!-- Live Leaflet Map View -->
        <div class="map-viewport">
          <LeafletMap
            :points="trackingStore.routePoints"
            :current-location="trackingStore.currentPosition"
          />
        </div>

        <!-- Floating HUD Metrics Panel -->
        <div class="tracking-hud-panel runmate-card">
          <!-- Big Primary Distance Metric -->
          <div class="primary-metric-box">
            <span class="hud-label text-muted">Total Distance</span>
            <div class="metric-value-row">
              <span class="primary-metric-number metric-number">{{ trackingStore.distanceKmFormatted }}</span>
              <span class="metric-unit">km</span>
            </div>
          </div>

          <!-- Secondary Metrics Grid -->
          <div class="secondary-metrics-grid">
            <div class="hud-sub-metric">
              <span class="hud-label text-muted">Duration</span>
              <span class="hud-value metric-number">{{ trackingStore.durationFormatted }}</span>
            </div>

            <div class="hud-sub-metric">
              <span class="hud-label text-muted">
                {{ trackingStore.selectedMode === ActivityType.DRIVING ? 'Speed' : 'Avg Pace' }}
              </span>
              <span class="hud-value metric-number">
                {{ trackingStore.selectedMode === ActivityType.DRIVING ? trackingStore.currentSpeedKmh : trackingStore.paceFormatted }}
              </span>
              <span class="hud-unit text-muted">
                {{ trackingStore.selectedMode === ActivityType.DRIVING ? 'km/h' : '/km' }}
              </span>
            </div>

            <div class="hud-sub-metric">
              <span class="hud-label text-muted">Avg Speed</span>
              <span class="hud-value metric-number">{{ trackingStore.averageSpeedKmh }}</span>
              <span class="hud-unit text-muted">km/h</span>
            </div>
          </div>

          <!-- Primary Tracking Action Button -->
          <div class="action-btn-wrapper">
            <button
              v-if="trackingStore.isIdle"
              class="tracking-action-btn start-btn"
              @click="handleStart"
            >
              <div class="btn-icon-circle">
                <ion-icon :icon="play"></ion-icon>
              </div>
              <span>Start Tracking</span>
            </button>

            <button
              v-else-if="trackingStore.isTracking"
              class="tracking-action-btn stop-btn"
              @click="handleStop"
            >
              <div class="btn-icon-circle">
                <ion-icon :icon="stop"></ion-icon>
              </div>
              <span>Stop Tracking</span>
            </button>

            <div v-else class="completed-actions">
              <button class="save-summary-btn" @click="handleSaveAndReset">
                Save Activity
              </button>
            </div>
          </div>

          <!-- Browser UI Simulation Helper -->
          <div v-if="trackingStore.isTracking" class="sim-helper-row">
            <button type="button" class="sim-btn" @click="simulateStep">
              + Simulate GPS Movement (Desktop Test)
            </button>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ActivityStatus, ActivityType, type ActivitySummaryDto, type LocationPointDto } from '@runmate/shared';
import { IonContent, IonIcon, IonPage } from '@ionic/vue';
import { carOutline, fitnessOutline, play, stop, walkOutline } from 'ionicons/icons';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import LeafletMap from '../components/common/LeafletMap.vue';
import { useActivityStore } from '../stores/activityStore.js';
import { useAuthStore } from '../stores/authStore.js';
import { useTrackingStore } from '../stores/trackingStore.js';

const router = useRouter();
const authStore = useAuthStore();
const trackingStore = useTrackingStore();
const activityStore = useActivityStore();

const modes = [ActivityType.RUNNING, ActivityType.WALKING, ActivityType.DRIVING];

// GPS Signal badge text
const gpsStatusText = computed(() => {
  switch (trackingStore.gpsStatus) {
    case 'SEARCHING':
      return 'Acquiring GPS...';
    case 'EXCELLENT':
    case 'GOOD':
      return `GPS Locked ${trackingStore.lastAccuracy ? '±' + Math.round(trackingStore.lastAccuracy) + 'm' : ''}`;
    case 'POOR':
      return 'Weak GPS Signal';
    case 'DENIED':
      return 'Permission Denied';
    case 'ERROR':
      return 'GPS Unavailable';
    default:
      return 'GPS Ready';
  }
});

function formatModeName(mode: ActivityType) {
  return mode.charAt(0) + mode.slice(1).toLowerCase();
}

function getModeIcon(mode: ActivityType) {
  switch (mode) {
    case ActivityType.WALKING:
      return walkOutline;
    case ActivityType.RUNNING:
      return fitnessOutline;
    case ActivityType.DRIVING:
      return carOutline;
  }
}

async function handleStart() {
  const result = await trackingStore.startTracking(authStore.user?.id || 'local-user');
  if (!result.success && result.error) {
    alert(result.error);
  }
}

async function handleStop() {
  await trackingStore.stopTracking();
}

async function handleSaveAndReset() {
  const finalDistance = trackingStore.distanceMeters;
  const finalDuration = trackingStore.durationSeconds;

  const newActivity: ActivitySummaryDto = {
    id: trackingStore.activeActivityId || (crypto.randomUUID ? crypto.randomUUID() : `act-${Date.now()}`),
    userId: authStore.user?.id || 'local-user',
    activityType: trackingStore.selectedMode,
    status: ActivityStatus.COMPLETED,
    distanceMeters: finalDistance,
    durationSeconds: finalDuration,
    averageSpeed: finalDuration > 0 ? finalDistance / finalDuration : 0,
    maxSpeed: trackingStore.maxSpeed,
    averagePace: finalDistance > 0 ? (finalDuration / 60) / (finalDistance / 1000) : null,
    startedAt: trackingStore.startedAt?.toISOString() || new Date().toISOString(),
    endedAt: trackingStore.endedAt?.toISOString() || new Date().toISOString(),
  };

  await activityStore.saveCompletedActivity(newActivity, [...trackingStore.routePoints]);
  trackingStore.resetTracking();
  router.push('/tabs/history');
}

// Simulation helper for browser desktop testing
const currentSimLat = ref(10.7769);
const currentSimLng = ref(106.7009);

function simulateStep() {
  currentSimLat.value += 0.00035 * (Math.random() - 0.2);
  currentSimLng.value += 0.00035 * (Math.random() - 0.2);

  const speedMs = trackingStore.selectedMode === ActivityType.DRIVING ? 13.5 : 3.4;

  const point: LocationPointDto = {
    latitude: currentSimLat.value,
    longitude: currentSimLng.value,
    altitude: 12,
    accuracy: 6,
    speed: speedMs,
    heading: 90,
    recordedAt: new Date().toISOString(),
  };

  trackingStore.handleNewLocationPoint(point);
}

onMounted(async () => {
  await trackingStore.fetchInitialLocation();
  const recovered = await trackingStore.checkInterruptedSession();
  if (recovered) {
    console.log('Restored previous tracking session from offline database');
  }
});
</script>

<style scoped>
.tracking-content {
  --background: var(--ion-background-color);
}

.tracking-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* Top Floating Header */
.tracking-header-bar {
  position: absolute;
  top: calc(env(safe-area-inset-top) + 12px);
  left: 16px;
  right: 16px;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.mode-pill-group {
  display: flex;
  background: var(--app-card-bg);
  padding: 4px;
  border-radius: 30px;
  border: 1px solid var(--app-card-border);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.mode-pill-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  background: transparent;
  border: none;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--app-text-muted);
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-pill-btn.active {
  background: var(--ion-color-primary);
  color: #ffffff;
  box-shadow: 0 2px 8px var(--app-accent-glow);
}

.mode-pill-btn:disabled {
  opacity: 0.8;
  cursor: not-allowed;
}

.gps-status-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--app-card-bg);
  border: 1px solid var(--app-card-border);
  padding: 8px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--app-text-muted);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.gps-status-pill.live {
  color: var(--ion-color-primary);
  border-color: var(--ion-color-primary);
}

.gps-status-pill.warning {
  color: var(--ion-color-warning);
  border-color: var(--ion-color-warning);
}

.gps-status-pill.error {
  color: var(--ion-color-danger);
  border-color: var(--ion-color-danger);
}

.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
  animation: pulse 1.6s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
  }
  70% {
    transform: scale(1);
    box-shadow: 0 0 0 8px rgba(16, 185, 129, 0);
  }
  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
  }
}

/* Map Viewport */
.map-viewport {
  flex: 1;
  width: 100%;
  min-height: 50vh;
}

/* Floating HUD Metrics Panel */
.tracking-hud-panel {
  position: absolute;
  bottom: 12px;
  left: 16px;
  right: 16px;
  z-index: 1000;
  border-radius: 28px;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
}

.primary-metric-box {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.hud-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.metric-value-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.primary-metric-number {
  font-size: 3.4rem;
  line-height: 1;
  color: var(--ion-text-color);
}

.metric-unit {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--ion-color-primary);
}

.secondary-metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  background: var(--app-surface-elevated);
  padding: 12px 8px;
  border-radius: 18px;
  text-align: center;
}

.hud-sub-metric {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.hud-value {
  font-size: 1.25rem;
  margin-top: 2px;
  color: var(--ion-text-color);
}

.hud-unit {
  font-size: 0.72rem;
}

/* Action Button */
.action-btn-wrapper {
  margin-top: 4px;
}

.tracking-action-btn {
  width: 100%;
  height: 58px;
  border-radius: 20px;
  border: none;
  font-size: 1.1rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  cursor: pointer;
  color: #ffffff;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.tracking-action-btn:active {
  transform: scale(0.98);
}

.start-btn {
  background: var(--ion-color-primary);
  box-shadow: 0 6px 20px var(--app-accent-glow);
}

.stop-btn {
  background: var(--ion-color-danger);
  box-shadow: 0 6px 20px rgba(239, 68, 68, 0.35);
}

.btn-icon-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
}

.save-summary-btn {
  width: 100%;
  height: 54px;
  border-radius: 18px;
  background: var(--ion-color-primary);
  color: #ffffff;
  font-size: 1rem;
  font-weight: 700;
  border: none;
  cursor: pointer;
}

.sim-helper-row {
  display: flex;
  justify-content: center;
}

.sim-btn {
  background: transparent;
  border: 1px dashed var(--app-text-muted);
  color: var(--app-text-muted);
  padding: 6px 14px;
  border-radius: 12px;
  font-size: 0.75rem;
  cursor: pointer;
}
</style>
