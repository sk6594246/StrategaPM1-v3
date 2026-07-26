const CACHE = 'stratega-v1';
const ASSETS = ['./', './index.html', './styles.css', './kanban.js', './manifest.json'];

self.addEventListener('install', e =>
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())));

self.addEventListener('activate', e =>
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))));

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || e.request.url.includes('script.google.com')) return;
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
});