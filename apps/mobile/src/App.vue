<template>
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>

<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import { onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { DatabaseService } from './database/database.service.js';
import { useAuthStore } from './stores/authStore.js';
import { useSyncStore } from './stores/syncStore.js';

const router = useRouter();
const authStore = useAuthStore();
const syncStore = useSyncStore();

function handleAuthExpired() {
  authStore.logout();
  router.replace('/login');
}

onMounted(async () => {
  window.addEventListener('auth:expired', handleAuthExpired);
  await DatabaseService.initialize();
  await authStore.initAuth();
  if (authStore.user?.id) {
    await syncStore.initListeners(authStore.user.id);
  }
});

onUnmounted(() => {
  window.removeEventListener('auth:expired', handleAuthExpired);
});
</script>
