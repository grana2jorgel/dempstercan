/**
 * sw.js — Service worker: la app queda utilizable sin conexión.
 *
 * IMPORTANTE AL PUBLICAR UNA VERSIÓN NUEVA: hay que subir el número de VERSION.
 * Es lo único que hace que los teléfonos y ordenadores que ya tienen la app
 * instalada se enteren de que hay algo nuevo. Si no se sube, el navegador
 * sigue sirviendo desde su caché los archivos viejos y el usuario ve la app
 * de siempre por mucho que el repositorio esté actualizado.
 *
 * Estrategia: "primero la caché" para que arranque instantánea y funcione en
 * modo avión, pero con precarga forzada al instalar (`cache: 'reload'`, que
 * salta la caché HTTP del navegador) y recarga automática de las pestañas
 * abiertas en cuanto la versión nueva toma el control.
 */
const VERSION = '1.2.0';
const CACHE = 'dempstercan-' + VERSION;

const NUCLEO = [
  './', './index.html', './manifest.webmanifest',
  './css/app.css',
  './js/app.js', './js/params.js', './js/landmarks.js', './js/biomech.js',
  './js/render.js', './js/template.js', './js/autodetect.js', './js/store.js',
  './js/report.js', './js/camara.js', './js/exportar.js',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // `cache: 'reload'` obliga a pedir cada archivo al servidor en vez de
    // aceptar la copia que el navegador tuviera guardada. Sin esto, una
    // versión nueva podía instalarse con archivos viejos dentro.
    // add() falla entero si un recurso falta; se añaden uno a uno para tolerarlo.
    await Promise.all(NUCLEO.map(u =>
      c.add(new Request(u, { cache: 'reload' })).catch(() => c.add(u).catch(() => {}))
    ));
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

self.addEventListener('message', (e) => {
  if (e.data === 'version') e.source?.postMessage({ version: VERSION });
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
