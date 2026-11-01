// 오프라인 캐시: 처음 한 번 열면 이후엔 인터넷 없이도 플레이 가능
const CACHE = 'tajagyeom-v11';
const FILES = ['./', 'index.html', 'manifest.webmanifest',
  'js/roster.js', 'js/core.js', 'js/gfx.js', 'js/scenes.js', 'js/match.js', 'js/mg_bat.js', 'js/mg_field.js', 'js/main.js',
  'fonts/Galmuri11-Bold.woff2', 'fonts/Galmuri11.woff2', 'fonts/Galmuri9.woff2',
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
// 네트워크 우선(업데이트 바로 반영), 끊기면 캐시
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
