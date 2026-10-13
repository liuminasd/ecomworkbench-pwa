// ============================================
// sw.js — Service Worker（PWA 离线支持，cache-first）
// ============================================

const CACHE_NAME = 'ecomworkbench-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './privacy.html',
  './robots.txt',
  './assets/icon-192x192.png',
  './assets/icon-512x512.png',
  './css/base.css',
  './css/layout.css',
  './css/components.css',
  './js/config.js',
  './js/utils/security.js',
  './js/db/store.js',
  './js/domain/pricing.js',
  './js/domain/queries.js',
  './js/domain/seed.js',
  './js/ui/ui.js',
  './js/ui/dashboard.js',
  './js/ui/forms.js',
  './js/ui/modules.js',
  './js/ui/sop.js',
  './js/ui/app.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('SW: 预缓存部分失败', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return new Response('离线模式，请连接网络后重试', { status: 503 });
      });
    })
  );
});
