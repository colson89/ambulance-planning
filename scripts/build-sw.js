import { generateSW } from 'workbox-build';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, '../dist/public');

async function buildServiceWorker() {
  try {
    const { count, size, warnings } = await generateSW({
      swDest: path.join(distDir, 'sw.js'),
      globDirectory: distDir,
      globPatterns: [
        '**/*.{html,js,css,png,jpg,jpeg,svg,woff,woff2}'
      ],
      // Don't cache these
      globIgnores: [
        '**/service-worker.js', // Don't cache old SW
        '**/sw.js', // Don't cache ourselves
        '**/stats.html' // Don't cache build stats
      ],
      // Runtime caching for API calls
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/.*\/api\/.*/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-cache',
            networkTimeoutSeconds: 10,
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 60 * 60 // 1 hour
            },
            cacheableResponse: {
              statuses: [0, 200]
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
