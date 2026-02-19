// Service Worker for Temaruco PWA - Auto-Update Strategy
// Version is updated on each deploy via build process
const CACHE_VERSION = Date.now();
const CACHE_NAME = `temaruco-cache-${CACHE_VERSION}`;

// Only cache essential static assets (not JS/CSS which have hashed names)
const STATIC_ASSETS = [
  '/logo192.png',
  '/logo512.png',
  '/logo.svg'
];

// Install - Skip waiting to activate immediately
self.addEventListener('install', (event) => {
  console.log('[SW] Installing new version:', CACHE_NAME);
  // Skip waiting - activate immediately
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// Activate - Clean up old caches immediately
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating new version:', CACHE_NAME);
  
  event.waitUntil(
    Promise.all([
      // Take control of all clients immediately
      self.clients.claim(),
      // Delete all old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName.startsWith('temaruco-')) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

// Fetch - Network-first strategy for HTML/API, Cache-first for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip API requests - always fetch fresh
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/ws/')) {
    return;
  }
  
  // For HTML pages - always network first, no caching
  if (event.request.mode === 'navigate' || 
      event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Only return cached index.html if offline
        return caches.match('/');
      })
    );
    return;
  }
  
  // For static assets (images, fonts) - cache first with network fallback
  if (url.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).then((response) => {
          // Clone and cache the response
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        });
      })
    );
    return;
  }
  
  // For JS/CSS with hashed names - use network (they have unique URLs per build)
  // The hashed filenames act as natural cache busters
  event.respondWith(fetch(event.request));
});

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  if (event.data === 'clearCache') {
    caches.keys().then((cacheNames) => {
      cacheNames.forEach((cacheName) => {
        caches.delete(cacheName);
      });
    });
  }
});
