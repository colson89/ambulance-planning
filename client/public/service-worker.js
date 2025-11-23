const CACHE_NAME = 'apk-planning-v1';
const RUNTIME_CACHE = 'apk-runtime-v1';

// Install event - skip waiting immediately and let runtime caching handle assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install event');
  event.waitUntil(
    // Pre-cache only critical assets that don't change
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Pre-caching critical assets');
        // Only cache what's absolutely necessary and won't fail
        return cache.addAll([
          '/manifest.json',
          '/icons/icon-192x192.png',
          '/icons/icon-512x512.png'
        ].filter(url => url)); // Filter out any undefined
      })
      .catch(err => {
        console.warn('[ServiceWorker] Pre-cache failed, continuing anyway:', err);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate event');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
          })
          .map((cacheName) => {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // API requests - network first, cache fallback (GET only)
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Only cache successful GET requests
          if (event.request.method === 'GET' && response.status === 200) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Only serve from cache for GET requests
          if (event.request.method === 'GET') {
            return caches.match(event.request).then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Return a custom offline response for API failures
              return new Response(JSON.stringify({ 
                error: 'Offline', 
                message: 'Deze data is offline niet beschikbaar' 
              }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              });
            });
          }
          // For POST/PUT/DELETE, return error
          return new Response(JSON.stringify({ 
            error: 'Offline', 
            message: 'Deze actie vereist een internetverbinding' 
          }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // Static assets - network first for HTML, cache first for others
  // This ensures app shell (HTML/JS/CSS) is always fresh when online
  const isNavigationRequest = event.request.mode === 'navigate' || 
                               event.request.destination === 'document';
  
  if (isNavigationRequest) {
    // Network first for HTML to get latest app shell
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request)
            .then(cachedResponse => {
              return cachedResponse || caches.match('/');
            });
        })
    );
  } else {
    // Cache first for JS/CSS/images
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            // Return cached version and update in background
            fetch(event.request)
              .then((response) => {
                if (response && response.status === 200) {
                  caches.open(RUNTIME_CACHE).then((cache) => {
                    cache.put(event.request, response.clone());
                  });
                }
              })
              .catch(() => {/* Ignore background update failures */});
            return cachedResponse;
          }

          // Not in cache, fetch from network
          return fetch(event.request).then((response) => {
            // Cache successful responses
            if (response && response.status === 200) {
              const responseClone = response.clone();
              caches.open(RUNTIME_CACHE).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return response;
          });
        })
    );
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync:', event.tag);
  
  if (event.tag === 'sync-preferences') {
    event.waitUntil(
      // Sync user preferences when back online
      fetch('/api/preferences/sync', { method: 'POST' })
        .then(response => console.log('[ServiceWorker] Preferences synced'))
        .catch(err => console.error('[ServiceWorker] Sync failed:', err))
    );
  }
});

// Push notifications (for future use)
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push notification received');
  
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Nieuwe Planning';
  const options = {
    body: data.body || 'Er is een nieuwe planning beschikbaar',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: data.url || '/',
    actions: [
      { action: 'view', title: 'Bekijken' },
      { action: 'close', title: 'Sluiten' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification clicked');
  event.notification.close();

  if (event.action === 'view' || !event.action) {
    const urlToOpen = event.notification.data || '/';
    event.waitUntil(
      clients.openWindow(urlToOpen)
    );
  }
});
