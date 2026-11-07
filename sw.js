// Offline support. Bump VERSION whenever app files change so devices pick up the update.
const VERSION = 'notes-v47';
const SHELL = [
  './', 'index.html', 'styles.css', 'glyphs.js', 'music.js', 'listen.js', 'beast.js', 'challenge.js', 'content.js', 'app.js', 'config.js', 'manifest.webmanifest',
  ...['A1', 'C2', 'Ds2', 'Fs2', 'A2', 'C3', 'Ds3', 'Fs3', 'A3', 'C4', 'Ds4', 'Fs4', 'A4', 'C5', 'Ds5', 'Fs5', 'A5', 'C6', 'Ds6', 'Fs6', 'A6'].map(n => `piano/${n}.mp3`),
  ...['bellow-sad', 'bellow-happy-1', 'bellow-happy-2', 'bellow-happy-3', 'bellow-happy-4', 'bellow-happy-5'].map(n => `sounds/${n}.m4a`),
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.hostname.endsWith('supabase.co')) return;

  // Fonts: serve from cache, fill the cache on first use.
  if (url.hostname.includes('fonts.g')) {
    e.respondWith(caches.open(VERSION).then(async c => {
      const hit = await c.match(e.request);
      if (hit) return hit;
      const res = await fetch(e.request);
      if (res.ok || res.type === 'opaque') c.put(e.request, res.clone());
      return res;
    }));
    return;
  }

  // App files: try the network so updates arrive, fall back to the cache when offline.
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok) caches.open(VERSION).then(c => c.put(e.request, res.clone()));
        return res;
      }).catch(() => caches.match(e.request).then(hit => hit || caches.match('index.html')))
    );
  }
});
