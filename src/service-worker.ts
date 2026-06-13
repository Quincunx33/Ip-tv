/* eslint-disable no-restricted-globals */
// src/service-worker.ts
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';

cleanupOutdatedCaches();
// @ts-ignore
const manifestToPrecache = self.__WB_MANIFEST || [];
precacheAndRoute(manifestToPrecache);

interface ServiceWorkerManifestEntry {
  url: string;
  revision: string | null;
}

interface ExtendableEvent extends Event {
  waitUntil(fn: Promise<unknown>): void;
}

interface FetchEvent extends Event {
  readonly request: Request;
  respondWith(response: Promise<Response> | Response): void;
}

interface Clients {
  claim(): Promise<void>;
}

interface WebWorkerGlobalScope {
  __WB_MANIFEST: ServiceWorkerManifestEntry[];
  caches: CacheStorage;
  clients: Clients;
  registration: ServiceWorkerRegistration;
  skipWaiting(): Promise<void>;
  addEventListener(type: "install", listener: (event: ExtendableEvent) => void): void;
  addEventListener(type: "activate", listener: (event: ExtendableEvent) => void): void;
  addEventListener(type: "fetch", listener: (event: FetchEvent) => void): void;
}

const sw = self as unknown as WebWorkerGlobalScope;

const CACHE_NAME_STATIC = "streamtube-static-v1";
const CACHE_NAME_API = "streamtube-api-v1";

// Cache a base level of static assets
const STATIC_ASSETS: string[] = [
  "./",
  "./index.html",
  "./icon.svg",
  "./apple-touch-icon.png",
  "./pwa-192x192.png",
  "./pwa-512x512.png"
];

// Install listener - Cache static shell and pre-built assets
sw.addEventListener("install", (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME_STATIC).then((cache: Cache) => {
      const urlsToCache: string[] = [...STATIC_ASSETS];
      
      // Integrate built assets from VitePWA's injected manifest
      if (manifestToPrecache && Array.isArray(manifestToPrecache)) {
        manifestToPrecache.forEach((entry: ServiceWorkerManifestEntry) => {
          if (entry && entry.url) {
            urlsToCache.push(entry.url);
          }
        });
      }
      
      const uniqueUrls = Array.from(new Set(urlsToCache.map(url => {
        try {
          return new URL(url, location.href).href;
        } catch {
          return url;
        }
      })));
      return cache.addAll(uniqueUrls);
    }).then(() => {
      return sw.skipWaiting();
    })
  );
});

// Activate listener - Cleanup old assets
sw.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((cacheNames: string[]) => {
      return Promise.all(
        cacheNames
          .filter((name: string) => name !== CACHE_NAME_STATIC && name !== CACHE_NAME_API)
          .map((name: string) => caches.delete(name))
      );
    }).then(() => {
      return sw.clients.claim();
    })
  );
});

const isStaticAsset = (url: string): boolean => {
  const fileExtensions: string[] = [".js", ".css", ".png", ".jpg", ".jpeg", ".svg", ".ico", ".woff", ".woff2"];
  return fileExtensions.some((ext: string) => url.includes(ext));
};

const isApiRequest = (url: string): boolean => {
  return url.includes("/api/") || url.includes("/static-api/");
};

// Intercept fetch requests and apply caching strategies
sw.addEventListener("fetch", (event: FetchEvent) => {
  const request: Request = event.request;
  const url: string = request.url;

  if (request.method !== "GET") {
    return;
  }

  // Strategy 1: Network-First with Cache Fallback for dynamic playlists and country APIs
  if (isApiRequest(url)) {
    event.respondWith(
      fetch(request)
        .then((response: Response) => {
          if (response.status === 200) {
            const responseClone: Response = response.clone();
            caches.open(CACHE_NAME_API).then((cache: Cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse: Response | undefined) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            return new Response(
              JSON.stringify({ 
                error: "Offline", 
                message: "You are currently offline. Local cache used for playlists." 
              }),
              {
                status: 200,
                headers: { "Content-Type": "application/json" }
              }
            );
          });
        })
    );
    return;
  }

  // Strategy 2: Cache-First with Network Dynamic Fallback for static assets
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cachedResponse: Response | undefined) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse: Response) => {
          if (networkResponse.status === 200) {
            const responseClone: Response = networkResponse.clone();
            caches.open(CACHE_NAME_STATIC).then((cache: Cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Strategy 3: HTML documents - Network-First, caching shell
  event.respondWith(
    fetch(request)
      .then((networkResponse: Response) => {
        if (networkResponse.status === 200 && url.includes("index.html")) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME_STATIC).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match("./index.html").then((fallback: Response | undefined) => {
          if (fallback) {
            return fallback;
          }
          return caches.match(request).then((cached: Response | undefined) => {
            return cached || new Response("You are offline. StreamTube shell failed to load.", { status: 503 });
          });
        });
      })
  );
});
