<template>
  <div class="map-wrapper">
    <div ref="mapContainer" class="map-container"></div>
    <div v-if="isLoading" class="map-loading-overlay">
      <ion-spinner name="crescent"></ion-spinner>
      <span>Acquiring GPS position...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IonSpinner } from '@ionic/vue';
import type { LocationPointDto } from '@runmate/shared';
import * as L from 'leaflet';
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    points?: LocationPointDto[];
    currentLocation?: LocationPointDto | null;
    centerLat?: number;
    centerLng?: number;
    zoom?: number;
    interactive?: boolean;
    autoFitBounds?: boolean;
  }>(),
  {
    points: () => [],
    currentLocation: null,
    centerLat: 10.7769,
    centerLng: 106.7009,
    zoom: 16,
    interactive: true,
    autoFitBounds: false,
  },
);

const mapContainer = ref<HTMLElement | null>(null);
const isLoading = ref<boolean>(true);

let map: L.Map | null = null;
let polyline: L.Polyline | null = null;
let currentMarker: L.CircleMarker | null = null;
let startMarker: L.CircleMarker | null = null;

function initMap() {
  if (!mapContainer.value || map) return;

  const initialLat = props.currentLocation?.latitude ?? props.centerLat;
  const initialLng = props.currentLocation?.longitude ?? props.centerLng;

  map = L.map(mapContainer.value, {
    zoomControl: false,
    attributionControl: false,
    dragging: props.interactive,
    touchZoom: props.interactive,
    scrollWheelZoom: props.interactive,
  }).setView([initialLat, initialLng], props.zoom);

  // OpenStreetMap Tile Layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);

  // Route Polyline
  polyline = L.polyline([], {
    color: '#10B981',
    weight: 5,
    opacity: 0.9,
    lineJoin: 'round',
    lineCap: 'round',
  }).addTo(map);

  isLoading.value = false;
  updateRoute();
}

function updateRoute() {
  if (!map || !polyline) return;

  // 1. Draw route polyline
  const latLngs: L.LatLngExpression[] = props.points.map((p) => [p.latitude, p.longitude]);
  polyline.setLatLngs(latLngs);

  if (props.autoFitBounds && latLngs.length >= 2) {
    try {
      const bounds = polyline.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [36, 36] });
      }
    } catch {
      // ignore
    }
  }

  // 2. Mark starting position
  if (props.points.length > 0) {
    const startPoint = props.points[0];
    const startPos: L.LatLngExpression = [startPoint.latitude, startPoint.longitude];

    if (!startMarker) {
      startMarker = L.circleMarker(startPos, {
        radius: 7,
        fillColor: '#0EA5E9',
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 1,
      }).addTo(map);
    }
  }

  // 3. Current active position indicator
  const targetPoint =
    props.points.length > 0
      ? props.points[props.points.length - 1]
      : props.currentLocation;

  if (targetPoint) {
    const latestPos: L.LatLngExpression = [targetPoint.latitude, targetPoint.longitude];

    if (!currentMarker) {
      currentMarker = L.circleMarker(latestPos, {
        radius: 8,
        fillColor: '#10B981',
        color: '#ffffff',
        weight: 3,
        opacity: 1,
        fillOpacity: 1,
      }).addTo(map);
    } else {
      currentMarker.setLatLng(latestPos);
    }

    map.panTo(latestPos, { animate: true });
  }
}

watch(
  () => props.points,
  () => updateRoute(),
  { deep: true },
);

watch(
  () => props.currentLocation,
  (loc) => {
    if (loc && map && props.points.length === 0) {
      map.setView([loc.latitude, loc.longitude], props.zoom);
      updateRoute();
    }
  },
  { deep: true },
);

onMounted(() => {
  nextTick(() => {
    initMap();
    setTimeout(() => {
      map?.invalidateSize();
    }, 200);
  });
});

onBeforeUnmount(() => {
  if (map) {
    map.remove();
    map = null;
  }
});

defineExpose({
  invalidateSize: () => map?.invalidateSize(),
});
</script>

<style scoped>
.map-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 24px;
  overflow: hidden;
  background: var(--app-surface-elevated);
}

.map-container {
  width: 100%;
  height: 100%;
}

.map-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: rgba(15, 23, 42, 0.4);
  color: #ffffff;
  font-size: 0.9rem;
  z-index: 100;
  backdrop-filter: blur(4px);
}
</style>
