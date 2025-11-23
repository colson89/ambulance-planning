import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, '../dist/public');
const swPath = path.join(distDir, 'service-worker.js');

async function injectPrecacheAssets() {
  console.log('Injecting precache assets into service worker...');

  // Find all built JS and CSS files
  const jsFiles = await glob('assets/*.js', { cwd: distDir });
  const cssFiles = await glob('assets/*.css', { cwd: distDir });
  const indexHtml = ['index.html'];
  
  // Combine all assets to precache
  const precacheAssets = [
    '/',
    ...indexHtml,
    ...jsFiles.map(f => `/${f}`),
    ...cssFiles.map(f => `/${f}`),
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
  ];

  console.log(`Found ${precacheAssets.length} assets to precache`);

  // Read service worker
  let swContent = fs.readFileSync(swPath, 'utf-8');

  // Replace the PRECACHE_ASSETS array
  const precacheArrayString = JSON.stringify(precacheAssets, null, 2);
  swContent = swContent.replace(
    /const PRECACHE_ASSETS = \[[\s\S]*?\];/,
    `const PRECACHE_ASSETS = ${precacheArrayString};`
  );

  // Write updated service worker
  fs.writeFileSync(swPath, swContent);

  console.log('✓ Service worker updated with precache assets');
  console.log('Assets to be cached:', precacheAssets);
}

injectPrecacheAssets().catch(console.error);
