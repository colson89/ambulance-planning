import type { Plugin } from 'vite';

/**
 * Custom Vite plugin that adds timestamps to module imports in development mode
 * This prevents aggressive browser caching in Replit's preview iframe
 */
export function cacheBustPlugin(): Plugin {
  return {
    name: 'cache-bust-dev',
    apply: 'serve', // Only apply in dev mode
    configureServer(server) {
      // Add timestamp to all module requests
      server.middlewares.use((req, res, next) => {
        if (req.url && (req.url.includes('.js') || req.url.includes('.tsx') || req.url.includes('.ts'))) {
          const url = new URL(req.url, 'http://localhost');
          if (!url.searchParams.has('t')) {
            url.searchParams.set('t', Date.now().toString());
            req.url = url.pathname + url.search;
          }
        }
        next();
      });
    },
    transformIndexHtml(html) {
      // Add meta tag to prevent caching
      return html.replace(
        '</head>',
        `<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
        <meta http-equiv="Pragma" content="no-cache">
        <meta http-equiv="Expires" content="0">
        </head>`
      );
    },
  };
}
