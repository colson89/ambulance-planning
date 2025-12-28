import { generateSW } from 'workbox-build';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, '../dist/public');
const clientPublicDir = path.join(__dirname, '../client/public');

// Copy PWA files (manifest.json, service-worker.js, icons) to dist/public
function copyPWAFiles() {
  // Copy manifest.json
  const manifestSrc = path.join(clientPublicDir, 'manifest.json');
  const manifestDest = path.join(distDir, 'manifest.json');
  if (existsSync(manifestSrc)) {
    copyFileSync(manifestSrc, manifestDest);
    console.log('✓ Copied manifest.json');
  }

  // Copy service-worker.js (development fallback)
  const swSrc = path.join(clientPublicDir, 'service-worker.js');
  const swDest = path.join(distDir, 'service-worker.js');
  if (existsSync(swSrc)) {
    copyFileSync(swSrc, swDest);
    console.log('✓ Copied service-worker.js');
  }

  // Copy icons folder
  const iconsSrc = path.join(clientPublicDir, 'icons');
  const iconsDest = path.join(distDir, 'icons');
  if (existsSync(iconsSrc)) {
    if (!existsSync(iconsDest)) {
      mkdirSync(iconsDest, { recursive: true });
    }
    const files = readdirSync(iconsSrc);
    for (const file of files) {
      const srcFile = path.join(iconsSrc, file);
      const destFile = path.join(iconsDest, file);
      if (statSync(srcFile).isFile()) {
        copyFileSync(srcFile, destFile);
      }
    }
    console.log(`✓ Copied ${files.length} icon files`);
  }
}

// Run PWA file copy first
copyPWAFiles();

// Generate unique BUILD_ID using timestamp
const BUILD_ID = Date.now().toString();
const buildInfo = {
  buildId: BUILD_ID,
  buildTime: new Date().toISOString(),
  version: JSON.parse(readFileSync(path.join(__dirname, '../package.json'), 'utf-8')).version
};

// Save BUILD_ID to file so server can expose it via API
writeFileSync(
  path.join(__dirname, '../dist/build-info.json'),
  JSON.stringify(buildInfo, null, 2)
);

console.log(`✓ Build ID generated: ${BUILD_ID}`);

// Push notification handlers to append to the generated service worker
const pushHandlers = `
// ==========================================
// PUSH NOTIFICATION HANDLERS
// ==========================================

// Handle incoming push notifications
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
    ],
    tag: 'ambulance-planning-notification',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification clicked');
  event.notification.close();

  if (event.action === 'view' || !event.action) {
    const urlToOpen = event.notification.data || '/';
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // If a window tab is already open, focus it
          for (const client of clientList) {
            if (client.url.includes(self.registration.scope) && 'focus' in client) {
              return client.focus();
            }
          }
          // Otherwise open a new window
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  }
});

// Handle push subscription change (when browser regenerates keys)
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[ServiceWorker] Push subscription changed');
  event.waitUntil(
    self.registration.pushManager.subscribe(event.oldSubscription.options)
      .then((subscription) => {
        // Re-send subscription to server
        return fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription)
        });
      })
  );
});
`;

async function buildServiceWorker() {
  try {
    const { count, size, warnings } = await generateSW({
      swDest: path.join(distDir, 'sw.js'),
      globDirectory: distDir,
      globPatterns: [
        '**/*.{html,css,png,jpg,jpeg,svg,woff,woff2,js}'
      ],
      // Don't cache these
      globIgnores: [
        '**/service-worker.js',
        '**/sw.js',
        '**/stats.html'
      ],
      // Runtime caching strategies with BUILD_ID in cache names
      runtimeCaching: [
        {
          // API calls - network first
          urlPattern: /^https?:\/\/.*\/api\/.*/,
          handler: 'NetworkFirst',
          options: {
            cacheName: `api-cache-${BUILD_ID}`,
            networkTimeoutSeconds: 10,
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 60 * 60 // 1 hour
            },
            cacheableResponse: {
              statuses: [0, 200]
            }
          }
        },
        {
          // JavaScript modules - ALWAYS network first, short cache
          urlPattern: /\.m?js$/,
          handler: 'NetworkFirst',
          options: {
            cacheName: `js-modules-${BUILD_ID}`,
            networkTimeoutSeconds: 3,
            expiration: {
              maxEntries: 30,
              maxAgeSeconds: 60 * 5 // 5 minutes only
            },
            cacheableResponse: {
              statuses: [200]
            }
          }
        },
        {
          // CSS and fonts - stale while revalidate
          urlPattern: /\.(css|woff2?)$/,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: `static-resources-${BUILD_ID}`,
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 60 * 60 * 24 * 7 // 1 week
            }
          }
        }
      ],
      // Skip waiting and claim clients immediately
      skipWaiting: true,
      clientsClaim: true,
      // Navigation fallback
      navigateFallback: '/index.html',
      navigateFallbackDenylist: [/^\/api\//]
    });

    console.log(`✓ Service worker generated`);
    console.log(`  Precached ${count} files, totaling ${size} bytes`);
    
    if (warnings.length > 0) {
      console.warn('Warnings:', warnings);
    }

    // Append push notification handlers to the generated service worker
    const swPath = path.join(distDir, 'sw.js');
    const swContent = readFileSync(swPath, 'utf-8');
    writeFileSync(swPath, swContent + pushHandlers);
    console.log('✓ Push notification handlers added to service worker');

  } catch (error) {
    console.error('Service worker generation failed:', error);
    throw error;
  }
}

buildServiceWorker();
