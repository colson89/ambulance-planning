import { generateSW } from 'workbox-build';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, '../dist/public');

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
  } catch (error) {
    console.error('Service worker generation failed:', error);
    throw error;
  }
}

buildServiceWorker();
