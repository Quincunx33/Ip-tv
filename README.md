# 📺 StreamTube

**StreamTube** is a premium, high-fidelity bilingual IPTV multimedia streaming application built with **React**, **TypeScript**, and **Firebase**. Architected under strict Progressive Web App (PWA) protocols, StreamTube ensures a robust, offline-capable experience for discovering, streaming, and managing global live television and radio broadcasts.

---

## ✨ Features

- **🌐 Multi-Source IPTV Streams**: Directly aggregates and navigates hundreds of verified streaming channels from international sources, pre-cached and cataloged by countries and categories.
- **⚡ Progressive Web App (PWA)**: Completely installable on Desktop, iOS, and Android platforms, featuring standalone displays and direct install prompt triggers.
- **💾 Advanced Hybrid Offline Core**: Custom service-worker lifecycle utilizing a Cache-First strategy for application shell assets, coupled with a Network-First (Cache-fallback) approach for playlists and dynamic static APIs.
- **🔄 Firebase Cloud Synchronization**: Bookmarks, dynamic playlists, custom streaming channels, and personalized histories are securely persisted and synchronized across devices using Firebase Firestore.
- **🗣️ Bilingual Localization Support**: Instant toggle option between English and Bengali UI strings.
- **🎨 Luxury Cinematic UI Theme**: Designed with a high-contrast charcoal black base palette, ambient accent colors, smooth animated state transitions, and an integrated status bar indicating online or offline browsing modes.

---

## 🛠️ Architecture & Tech Stack

- **Client Framework**: React 18, Vite (high-performance bundler)
- **Styling**: Tailwind CSS for mobile-first responsive grid and cinematic dark interface layout.
- **Database & Auth**: Firebase Firestore (durable cloud storage) with secure Auth integrations.
- **Offline Engines**: Service Worker (Workbox / VitePWA manual configurations)
- **Media Playback**: `Hls.js` supporting adaptive live streams (HLSn / M3U8 protocol).

---

## 📡 Service Worker & Caching Strategy

The Progressive Web App behavior is powered by a custom Service Worker implementation (`src/service-worker.ts`):

1. **Static Shell Caching (Cache-First)**: Standard layout elements (such as `index.html`, graphics, CSS components, icons, and build chunks) are loaded once and updated automatically in the background.
2. **API Playlist Caching (Network-First with Fallback)**: Channel catalogs and regional stream configurations are loaded directly from the hosting network when online, and gracefully fetched from the offline Service Worker cache if connectivity drops.
3. **Reactive Offline Experience**: When user connection state changes, a warning banner dynamically appears on top of the IPTV dashboard, allowing uninterrupted playback of previously cached channels.

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- Firebase Firestore database setup

### Installation

1. Clone or import this repository.
2. Install project dependencies:
   ```bash
   npm install
   ```
3. Set up your client-side environment secrets in a `.env` file (copied from `.env.example` template):
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_FIRESTORE_DATABASE_ID=your_custom_db_id
   ```

### Running the App

```bash
# Starts the development server with hot reload
npm run dev

# Generates the localized static IPTV API caches
npm run build:static-api

# Compiles application chunks and packages the distribution bundle
npm run build

# Starts the production web hosting server
npm run start
```
