// Офлайн-режим: берём свежую версию из сети, но ждём не дольше 2 секунд —
// при плохой связи сразу открываем сохранённую копию (а свежая подтянется в фоне).
const CACHE = 'nedelya-v4';
const ASSETS = ['./', './index.html', './manifest.json', './icon-180.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const network = fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  });
  e.waitUntil(network.catch(() => {}));
  e.respondWith((async () => {
    const cached = await caches.match(req, { ignoreSearch: true });
    if (!cached) return network.catch(() => caches.match('./index.html'));
    const timeout = new Promise(r => setTimeout(() => r(cached), 2000));
    return Promise.race([network.catch(() => cached), timeout]);
  })());
});
