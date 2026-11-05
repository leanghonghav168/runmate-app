# RunMate — Multi-User GPS Activity Tracking Application

RunMate is a multi-user GPS physical activity tracking mobile application designed with an **offline-first architecture**, real-time route rendering on interactive maps, native background GPS tracking, and automatic backend synchronization.

Users can track three activity modes:
1. **Walking**
2. **Running**
3. **Driving**

---

## 🏗️ Technology Stack & Monorepo Architecture

RunMate is engineered as a unified **pnpm workspace** monorepo:

```text
runmate/
├── apps/
│   ├── mobile/                 # Ionic 9 + Vue 3.5 + Vite 8 + Pinia + Leaflet + SQLite
│   │   ├── src/
│   │   │   ├── components/     # StatCard, ActivityModeCard, LeafletMap
│   │   │   ├── database/       # SQLite schema, migrations & repositories
│   │   │   │   └── repositories/ # ActivityRepository, LocationRepository
│   │   │   ├── services/       # BackgroundGpsService, NetworkService, SyncService, NotificationService
│   │   │   ├── stores/         # authStore, trackingStore, activityStore, syncStore
│   │   │   ├── utils/          # Haversine distance, Pace calculation, Kilometer splits, GPS filter
│   │   │   ├── views/          # DashboardPage, TrackingPage, HistoryPage, ActivityDetailPage, ProfilePage
│   │   │   └── router/         # Tab navigation with authentication guards
│   │   ├── android/            # Generated Android Native Studio project
│   │   ├── ios/                # Generated iOS Xcode project
│   │   └── capacitor.config.ts # Capacitor native plugin configurations
│   │
│   └── api/                    # NestJS 12 REST API + PostgreSQL + Prisma ORM
│       ├── prisma/             # schema.prisma database schema & migrations
│       ├── src/
│       │   ├── auth/           # Argon2id password hashing, JWT, refresh-token rotation
│       │   ├── users/          # Profile retrieval, updates, account deletion
│       │   ├── activities/     # User-isolated activity CRUD & pagination
│       │   ├── locations/      # Batch GPS coordinates upload & route trail retrieval
│       │   ├── statistics/     # Weekly, monthly, and all-time aggregations
│       │   ├── sync/           # Idempotent batch sync endpoint (POST /api/v1/sync)
│       │   └── health/         # Container & reverse-proxy healthcheck endpoint
│       ├── Dockerfile          # Multi-stage production container build
│       └── ecosystem.config.cjs# PM2 cluster configuration for VPS
│
├── packages/
│   └── shared/                 # Shared TypeScript DTOs, Enums, and Interfaces
│
├── deploy/
│   └── nginx/runmate.conf      # Production Nginx reverse-proxy & SSL configuration
├── docker-compose.yml          # PostgreSQL 17 + NestJS API container orchestration
├── package.json                # Monorepo root scripts
└── pnpm-workspace.yaml         # pnpm workspace definition
```

---

## 🚀 Quickstart & Local Development

### Prerequisites
- **Node.js** $\ge 20$ (Tested on Node `v23.11`)
- **pnpm** $\ge 9$ (Tested on pnpm `v10.34`)
- **PostgreSQL** (Listening on port `5432`)
- **Android Studio** & **JDK 17/21** (For native Android builds)

### 1. Installation
Install all workspace dependencies using one root lockfile:
```bash
pnpm install
```

### 2. Environment Setup
Configure your database connection and secrets:
```bash
# In apps/api/.env
PORT=3333
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/runmate?schema=public"
JWT_SECRET="your-development-jwt-access-secret"
JWT_REFRESH_SECRET="your-development-jwt-refresh-secret"
```

Initialize your PostgreSQL database and generate Prisma Client:
```bash
# Push schema directly or run migrations
pnpm --filter api exec prisma db push
pnpm --filter api exec prisma generate
```

### 3. Run Development Servers
Start both backend API and mobile frontend concurrently:
```bash
# Start NestJS REST API (http://localhost:3333/api/v1)
pnpm dev:api

# Start Ionic Vue Mobile Web App (http://localhost:5173)
pnpm dev:mobile
```

Swagger API documentation is automatically accessible at:  
👉 **`http://localhost:3333/api/docs`**

---

## 🧪 Automated Testing Suite (42 Passed Tests)

RunMate features **42 automated unit, integration, and security tests** across both applications:

```bash
# Run all tests across the entire monorepo
pnpm test

# Run mobile tests (Geo math, GPS filtering, SQLite repositories, Splits, Sync)
pnpm --filter mobile test

# Run backend tests (Argon2id hashing, User isolation, Coordinate bounds validation)
pnpm --filter api test
```

### What is Tested:
1. **Mathematical Geolocation:** Haversine distance, pace ($\text{min/km}$), speed ($\text{km/h}$), and duration formatting.
2. **GPS Quality & Outlier Filtering:** Rejection of low-accuracy points ($> 50\text{m}$), stationary drift elimination, and impossible speed jump rejection.
3. **Kilometer Splits Calculator:** Chronological grouping into $1.0\text{ km}$ segments, pace/duration calculation, and elevation delta tracking.
4. **Offline SQLite Repositories:** Local CRUD, soft deletes, user filtering, and sync status flags.
5. **Security & Input Validation:** Coordinate range boundaries (Latitude $[-90, 90]$, Longitude $[-180, 180]$, positive speed/accuracy, heading $[0, 360]$), strong password policy, and email formatting.
6. **User Data Isolation:** Enforces that User B cannot access, read, or delete User A's workout sessions.
7. **Argon2id Cryptography:** Verification of `$argon2id$` password hashing and authentication rejections.

---

## 📱 Native Mobile Compilation (Android & iOS)

### Android Build (APK & AAB)

1. **Build mobile web bundle and synchronize Capacitor:**
   ```bash
   pnpm build:mobile
   pnpm --filter mobile exec cap sync android
   ```

2. **Generate a Production Signing Keystore** (Run once):
   ```bash
   keytool -genkey -v -keystore runmate-release.keystore -alias runmate -keyalg RSA -keysize 2048 -validity 10000
   ```

3. **Build Signed Release APK / AAB:**
   Set the signing environment variables and execute Gradle:
   ```bash
   cd apps/mobile/android

   # Set environment variables
   $env:KEYSTORE_PATH = "C:\path\to\runmate-release.keystore"
   $env:KEYSTORE_PASSWORD = "your-keystore-password"
   $env:KEY_ALIAS = "runmate"
   $env:KEY_PASSWORD = "your-key-password"

   # Build signed universal Release APK
   .\gradlew assembleRelease

   # Or build Google Play Android App Bundle (AAB)
   .\gradlew bundleRelease
   ```
   The signed release output will be located at:  
   `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`

### iOS Compilation
```bash
pnpm build:mobile
pnpm --filter mobile exec cap sync ios
pnpm --filter mobile exec cap open ios
```
Open the generated Xcode workspace, select your Team Signing Certificate, and click **Product > Archive**.

---

## 🌐 Backend Production Deployment

### Option A: Docker & Docker Compose (Recommended)

Run PostgreSQL 17 and NestJS API in production containers:
```bash
# Start all services with automated healthchecks
docker compose up -d --build

# View container logs
docker compose logs -f api
```

### Option B: PM2 Cluster on VPS / Linux Server

1. Build the production backend:
   ```bash
   pnpm build:api
   ```
2. Launch using PM2 cluster mode:
   ```bash
   cd apps/api
   pm2 start ecosystem.config.cjs --env production
   pm2 save
   ```

### Option C: Nginx Reverse Proxy with SSL

Deploy the production Nginx virtual host configuration provided at [`deploy/nginx/runmate.conf`](file:///c:/personal/run-tacker/deploy/nginx/runmate.conf):
```bash
sudo cp deploy/nginx/runmate.conf /etc/nginx/sites-available/runmate.conf
sudo ln -s /etc/nginx/sites-available/runmate.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Obtain free Let's Encrypt SSL certificate
sudo certbot --nginx -d api.runmate.app -d app.runmate.app
```

---

## 🔒 Security Summary

- **Transport Security:** Strict CORS, Helmet security headers, rate limiting with `@nestjs/throttler` (150 req/min).
- **Password Hashing:** Argon2id with unique salts, resisting GPU brute-force attacks.
- **Authentication:** Short-lived JWT access tokens ($15\text{ mins}$) with secure refresh-token rotation ($7\text{ days}$) stored in `@capacitor/preferences`.
- **Coordinate Integrity:** Latitude, longitude, accuracy, speed, and heading bounds strictly enforced by DTO validation pipes.
- **Data Isolation:** User ID is extracted exclusively from validated JWT signatures; cross-user data tampering is architecturally prohibited.
