const CACHE_NAME = 'project-200-v5-sheets-v1';
const APP_SHELL = [
  './',
  './index.html',
  './styles-v5.css',
  './app-v5.js',
  './sync-v1.js',
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

async function injectSyncScript(response) {
  const html = await response.text();
  if (html.includes('sync-v1.js')) {
    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  }
  const injected = html.includes('</body>')
    ? html.replace('</body>', '  <script src="./sync-v1.js"></script>\n</body>')
    : `${html}\n<script src="./sync-v1.js"></script>`;
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
        return injectSyncScript(response);
      } catch (_) {
        const cached = await caches.match('./index.html');
        return cached ? injectSyncScript(cached) : Response.error();
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
