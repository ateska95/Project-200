const CACHE_NAME = 'project-200-v7-two-way-sync-no-key';
const APP_SHELL = [
  './',
  './index.html',
  './styles-v5.css',
  './app-v5.js',
  './sync-auto.js',
  './sync-v2.js',
  './edit-v1.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

async function injectAddOnScripts(response) {
  const html = await response.text();
  let injected = html.replace(/\s*<script\s+src=["']\.\/sync-v1\.js["'][^>]*><\/script>\s*/gi, '\n');

  if (!injected.includes('sync-auto.js')) {
    injected = injected.includes('</body>')
      ? injected.replace('</body>', '  <script src="./sync-auto.js"></script>\n</body>')
      : `${injected}\n<script src="./sync-auto.js"></script>`;
  }
  if (!injected.includes('sync-v2.js')) {
    injected = injected.includes('</body>')
      ? injected.replace('</body>', '  <script src="./sync-v2.js"></script>\n</body>')
      : `${injected}\n<script src="./sync-v2.js"></script>`;
  }
  if (!injected.includes('edit-v1.js')) {
    injected = injected.includes('</body>')
      ? injected.replace('</body>', '  <script src="./edit-v1.js"></script>\n</body>')
      : `${injected}\n<script src="./edit-v1.js"></script>`;
  }

  const headers = new Headers(response.headers);
  headers.set('Content-Type', 'text/html; charset=utf-8');
  return new Response(injected, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(event.request, { cache: 'no-store' });
        if (response && response.status === 200) {
          const rawCopy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('./index.html', rawCopy));
        }
        return injectAddOnScripts(response);
      } catch (_) {
        const cached = await caches.match('./index.html');
        return cached ? injectAddOnScripts(cached) : Response.error();
      }
    })());
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
