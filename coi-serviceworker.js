

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
const corsHeader = {'access-control-allow-origin':"*"};
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.cache === 'only-if-cached' && e.request.mode !== 'same-origin') return;

 
    const pro = (async()=>{
      const url = new URL(e.request.url);
      url.searchParams.set('headers',JSON.stringify(corsHeader));
      return new Request(String(url),e.request);
    })().then(req)=>fetch(req)).then(res => {
      if (!res || res.status === 0 || res.type === 'opaque') return res;

      const headers = new Headers(res.headers);
      headers.set('Cross-Origin-Opener-Policy', 'same-origin');
      headers.set('Cross-Origin-Embedder-Policy', 'require-corp');

      return new Response(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers,
      });
    }).catch(() => fetch(e.request)).catch((e)=>new Response(String(e));
  e.waitUntil(pro);
  e.respondWith(pro);
});
