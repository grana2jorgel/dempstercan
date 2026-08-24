/**
 * sw.js — Service worker: la app queda utilizable sin conexión.
 * Estrategia: precarga del núcleo + "primero la caché" para todo lo propio.
 */
const CACHE = 'dempstercan-v2';

const NUCLEO = [
  './', './index.html', './manifest.webmanifest',
  './css/app.css',
  './js/app.js', './js/params.js', './js/landmarks.js', './js/biomech.js',
  './js/render.js', './js/template.js', './js/autodetect.js', './js/store.js',
  './js/report.js', './js/camara.js',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // addAll falla entero si un recurso falta; añadimos uno a uno para tolerarlo.
    await Promise.all(NUCLEO.map(u => c.add(u).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const claves = await caches.keys();
    await Promise.all(claves.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(req, { ignoreSearch: true });
    if (hit) {
      // Revalidación en segundo plano, sin bloquear.
      fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); }).catch(() => {});
      return hit;
    }
    try {
      const r = await fetch(req);
      if (r.ok) c.put(req, r.clone());
      return r;
    } catch (err) {
      const idx = await c.match('./index.html');
      if (req.mode === 'navigate' && idx) return idx;
      throw err;
    }
  })());
});
