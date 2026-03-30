/**
 * Minimal Service Worker for PWA installability.
 *
 * Caches the app shell (index.html, JS/CSS bundles) for faster startup.
 * All API calls go network-first — the app requires a live server connection.
 */

const CACHE_NAME = 'zmng-v1';
const APP_SHELL = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Network-first for API calls and non-GET requests
  if (request.method !== 'GET' || request.url.includes('/api/')) {
    return;
  }

  // Cache-first for app shell assets (JS, CSS, images)
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
