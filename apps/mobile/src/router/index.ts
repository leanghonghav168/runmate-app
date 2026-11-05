import { createRouter, createWebHistory } from '@ionic/vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '../stores/authStore.js';

import DashboardPage from '../views/DashboardPage.vue';
import HistoryPage from '../views/HistoryPage.vue';
import ActivityDetailPage from '../views/ActivityDetailPage.vue';
import ProfilePage from '../views/ProfilePage.vue';
import TabsPage from '../views/TabsPage.vue';
import TrackingPage from '../views/TrackingPage.vue';
import LoginPage from '../views/auth/LoginPage.vue';
import RegisterPage from '../views/auth/RegisterPage.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/tabs/dashboard',
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginPage,
    meta: { guestOnly: true },
  },
  {
    path: '/register',
    name: 'Register',
    component: RegisterPage,
    meta: { guestOnly: true },
  },
  {
    path: '/tabs/',
    component: TabsPage,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/tabs/dashboard',
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: DashboardPage,
      },
      {
        path: 'track',
        name: 'Tracking',
        component: TrackingPage,
      },
      {
        path: 'history',
        name: 'History',
        component: HistoryPage,
      },
      {
        path: 'history/:id',
        name: 'ActivityDetail',
        component: ActivityDetailPage,
      },
      {
        path: 'profile',
        name: 'Profile',
        component: ProfilePage,
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

// Navigation Guards: Protect private routes & redirect guests
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore();

  if (!authStore.isInitialized) {
    await authStore.initAuth();
  }

  const isAuth = authStore.isAuthenticated;

  if (to.matched.some((record) => record.meta.requiresAuth)) {
    if (!isAuth) {
      return next({ path: '/login', query: { redirect: to.fullPath } });
    }
  }

  if (to.matched.some((record) => record.meta.guestOnly)) {
    if (isAuth) {
      return next({ path: '/tabs/dashboard' });
    }
  }

  next();
});

export default router;
