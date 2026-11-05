<template>
  <div class="stat-card runmate-card">
    <div class="stat-header">
      <span class="stat-label">{{ label }}</span>
      <div v-if="icon" class="stat-icon-wrapper" :style="{ color: iconColor }">
        <ion-icon :icon="icon"></ion-icon>
      </div>
    </div>
    <div class="stat-body">
      <span class="stat-value metric-number">{{ value }}</span>
      <span v-if="unit" class="stat-unit">{{ unit }}</span>
    </div>
    <div v-if="subtitle" class="stat-subtitle text-muted">{{ subtitle }}</div>
  </div>
</template>

<script setup lang="ts">
import { IonIcon } from '@ionic/vue';

defineProps<{
  label: string;
  value: string | number;
  unit?: string;
  icon?: string;
  iconColor?: string;
  subtitle?: string;
}>();
</script>

<style scoped>
.stat-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 96px;
}

.stat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.stat-label {
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--app-text-muted);
}

.stat-icon-wrapper {
  font-size: 1.2rem;
  display: flex;
  align-items: center;
}

.stat-body {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.stat-value {
  font-size: 1.85rem;
  line-height: 1.1;
  color: var(--ion-text-color);
}

.stat-unit {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--app-text-muted);
}

.stat-subtitle {
  font-size: 0.75rem;
  margin-top: 4px;
}
</style>

