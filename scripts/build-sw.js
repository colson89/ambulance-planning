import { generateSW } from 'workbox-build';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, '../dist/public');

// Read version from package.json
const packageJson = JSON.parse(
  readFileSync(path.join(__dirname, '../package.json'), 'utf-8')
);
const version = packageJson.version || '1.0.0';

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
      // Runtime caching strategies
      runtimeCaching: [
        {
          // API calls - network first
          urlPattern: /^https?:\/\/.*\/api\/.*/,
          handler: 'NetworkFirst',
          options: {
            cacheName: `api-cache-v${version}`,
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
            cacheName: `js-modules-v${version}`,
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
            cacheName: `static-resources-v${version}`,
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
