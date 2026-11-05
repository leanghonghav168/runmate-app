<template>
  <button
    type="button"
    class="mode-card"
    :class="{ active: isSelected }"
    :disabled="disabled"
    @click="$emit('select', mode)"
  >
    <div class="mode-icon-circle">
      <ion-icon :icon="icon"></ion-icon>
    </div>
    <span class="mode-title">{{ title }}</span>
  </button>
</template>

<script setup lang="ts">
import { ActivityType } from '@runmate/shared';
import { IonIcon } from '@ionic/vue';
import { computed } from 'vue';
import { carOutline, fitnessOutline, walkOutline } from 'ionicons/icons';

const props = defineProps<{
  mode: ActivityType;
  isSelected: boolean;
  disabled?: boolean;
}>();

defineEmits<{
  (e: 'select', mode: ActivityType): void;
}>();

const title = computed(() => {
  switch (props.mode) {
    case ActivityType.WALKING:
      return 'Walking';
    case ActivityType.RUNNING:
      return 'Running';
    case ActivityType.DRIVING:
      return 'Driving';
    default:
      return 'Activity';
  }
});

const icon = computed(() => {
  switch (props.mode) {
    case ActivityType.WALKING:
      return walkOutline;
    case ActivityType.RUNNING:
      return fitnessOutline;
    case ActivityType.DRIVING:
      return carOutline;
    default:
      return fitnessOutline;
  }
});
</script>

<style scoped>
.mode-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 14px 10px;
  border-radius: 18px;
  background: var(--app-card-bg);
  border: 1.5px solid var(--app-card-border);
  box-shadow: var(--app-card-shadow);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  color: var(--ion-text-color);
  outline: none;
}

.mode-icon-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--app-surface-elevated);
  font-size: 1.4rem;
  margin-bottom: 8px;
  transition: all 0.2s ease;
  color: var(--app-text-muted);
}

.mode-title {
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.mode-card.active {
  border-color: var(--ion-color-primary);
  background: rgba(16, 185, 129, 0.08);
}

.mode-card.active .mode-icon-circle {
  background: var(--ion-color-primary);
  color: #ffffff;
  box-shadow: 0 4px 14px var(--app-accent-glow);
}

.mode-card.active .mode-title {
  color: var(--ion-color-primary);
  font-weight: 700;
}

.mode-card:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

