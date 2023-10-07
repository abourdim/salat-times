// Service Worker — Salat Times PWA
const CACHE_NAME = 'salat-times-v3-' + Date.now(); // auto-bump on new SW
const ASSETS = [
  './', 'index.html', 'manifest.json',
  'apple-touch-icon.png', 'favicon.ico', 'icon-512.png', 'icon-512-bg.png', 'plug-icon.svg',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
  'https://cdn.jsdelivr.net/npm/adhan@4.4.3/Adhan.js',
  'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Outfit:wght@300;400;500;600;700&family=Noto+Naskh+Arabic:wght@400;600;700&family=JetBrains+Mono:wght@400;500&display=swap'
];

// Install: cache all assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for assets, network-first for API calls
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Network-first for API calls (Nominatim, Overpass)
  if (url.hostname.includes('nominatim') || url.hostname.includes('overpass')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for everything else
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return response;
      });
    })
  );
});

// Message: clear cache on demand
self.addEventListener('message', event => {
  if (event.data === 'CLEAR_CACHE') {
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    ).then(() => {
      self.clients.matchAll().then(clients =>
        clients.forEach(c => c.postMessage('CACHE_CLEARED'))
      );
    });
  }
});
