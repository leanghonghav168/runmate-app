<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet></ion-router-outlet>
      <ion-tab-bar slot="bottom" class="custom-tab-bar">
        <ion-tab-button tab="dashboard" href="/tabs/dashboard">
          <ion-icon :icon="homeOutline"></ion-icon>
          <ion-label>Dashboard</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="track" href="/tabs/track" class="track-tab-button">
          <div class="track-tab-circle">
            <ion-icon :icon="play"></ion-icon>
          </div>
          <ion-label>Track</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="history" href="/tabs/history">
          <ion-icon :icon="timeOutline"></ion-icon>
          <ion-label>History</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="profile" href="/tabs/profile">
          <ion-icon :icon="personOutline"></ion-icon>
          <ion-label>Profile</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonIcon,
  IonLabel,
  IonPage,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
} from '@ionic/vue';
import { homeOutline, personOutline, play, timeOutline } from 'ionicons/icons';
</script>

<style scoped>
.custom-tab-bar {
  border-top: 1px solid var(--app-card-border);
  height: 64px;
  padding-bottom: env(safe-area-inset-bottom);
}

.track-tab-button {
  position: relative;
}

.track-tab-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--ion-color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 1.3rem;
  box-shadow: 0 4px 14px var(--app-accent-glow);
  margin-bottom: 2px;
  transition: transform 0.2s ease;
}

.track-tab-button:active .track-tab-circle {
  transform: scale(0.92);
}
</style>

