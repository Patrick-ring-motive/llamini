// Minimal COI service worker
// Injects Cross-Origin-Opener-Policy + Cross-Origin-Embedder-Policy headers
// so SharedArrayBuffer (required for WASM threading) works on hosts
// that can't set headers server-side (GitHub Pages, etc.)

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', e => {
  // Skip non-GET and opaque requests that would fail CORS
  if (e.request.method !== 'GET') return;
  if (e.request.cache === 'only-if-cached' && e.request.mode !== 'same-origin') return;

  e.respondWith(
    fetch(e.request).then(res => {
      // Don't touch opaque responses
      if (!res || res.status === 0 || res.type === 'opaque') return res;

      const headers = new Headers(res.headers);
      headers.set('Cross-Origin-Opener-Policy', 'same-origin');
      headers.set('Cross-Origin-Embedder-Policy', 'require-corp');

      return new Response(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers,
      });
    }).catch(() => fetch(e.request))
  );
});
