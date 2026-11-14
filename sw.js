/* =========================================================================
   sw.js – Service Worker: macht BROTHERS offline spielbar

   - Beim ersten Öffnen werden alle Dateien unten in den Cache gelegt.
   - Online wird immer zuerst die neueste Version geladen (und im Cache
     aktualisiert). Ohne Internet oder bei sehr langsamer Verbindung kommt
     die Datei aus dem Cache.
   - Neue Dateien im Projekt: hier in FILES eintragen (alles andere wird
     beim ersten Laden ohnehin mitgespeichert). Bei großen Änderungen
     CACHE hochzählen, dann wird der alte Cache gelöscht.
   ========================================================================= */

const CACHE = 'brothers-v1';
const FILES = [
  './',
  './index.html',
  './style.css',
  './manifest.webmanifest',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './icons/favicon-64.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './js/config.js',
  './js/render.js',
  './js/data/characters.js',
  './js/data/items.js',
  './js/data/events.js',
  './js/data/modifiers.js',
  './js/data/powerups.js',
  './js/data/cosmetics.js',
  './js/data/goals.js',
  './js/data/achievements.js',
  './js/data/codes.js',
  './js/art.js',
  './js/data/venues.js',
  './js/data/levels.js',
  './js/save.js',
  './js/mechanics.js',
  './js/game.js',
  './js/endless.js',
  './js/ui.js',
  './js/input.js',
  './js/main.js',
];

self.addEventListener('install', e => {
  // jede Datei einzeln: scheitert eine (z. B. kurz kein Netz), klappt der Rest trotzdem.
  // Klappt der Speicher gar nicht, wird der Worker trotzdem aktiv (dann eben nur online).
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.allSettled(FILES.map(f => c.add(new Request(f, { cache: 'reload' })))))
    .catch(() => {})
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .catch(() => {})
      .then(() => self.clients.claim())
  );
});

// Erst Netz (nach 4 s ohne Antwort lieber aus dem Cache), sonst Cache. Fehler im
// Speicher dürfen das Laden nie blockieren.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const net = fetch(req);
    let cache = null;
    try { cache = await caches.open(CACHE); } catch (_) { /* kein Speicher */ }
    try {
      const res = await Promise.race([net, new Promise((_, no) => setTimeout(() => no(new Error('timeout')), 4000))]);
      if (cache && res && res.ok) cache.put(req, res.clone()).catch(() => {});
      return res;
    } catch (err) {
      if (cache) {
        let hit = null;
        try { hit = (await cache.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' ? await cache.match('./index.html') : null); } catch (_) { /* egal */ }
        if (hit) return hit;
      }
      return net;   // nichts im Cache: auf das Netz warten (offline gibt es dann den normalen Fehler)
    }
  })());
});
