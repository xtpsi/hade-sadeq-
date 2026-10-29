/* Service Worker — يخزّن التطبيق ومكتباته ليعمل بدون إنترنت.
   عند تعديل أي ملف: غيّر رقم VERSION ليظهر للمستخدم "تحديث متاح". */
const VERSION = 'pos-v1.4.1';
const CORE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-180.png', './icon-maskable-512.png'];
const J = 'https://cdn.jsdelivr.net/npm/';
/* [مسار محلي في vendor/، رابط الإنترنت البديل] — يُستخدم المحلي إن وُجد */
const LIBS = [
  ['./vendor/fonts.css', 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Noto+Kufi+Arabic:wght@600;700;800&display=swap'],
  ['./vendor/bootstrap.rtl.min.css', J + 'bootstrap@5.3.3/dist/css/bootstrap.rtl.min.css'],
  ['./vendor/bootstrap-icons/bootstrap-icons.min.css', J + 'bootstrap-icons@1.11.3/font/bootstrap-icons.min.css'],
  ['./vendor/dexie.min.js', J + 'dexie@3.2.7/dist/dexie.min.js'],
  ['./vendor/JsBarcode.all.min.js', J + 'jsbarcode@3.11.6/dist/JsBarcode.all.min.js'],
  ['./vendor/xlsx.full.min.js', J + 'xlsx@0.18.5/dist/xlsx.full.min.js'],
  ['./vendor/html5-qrcode.min.js', J + 'html5-qrcode@2.3.8/html5-qrcode.min.js']
];

async function putCDN(cache, url) {
  const res = await fetch(url, { mode: 'cors', credentials: 'omit' }).catch(() => fetch(new Request(url, { mode: 'no-cors' }))).catch(() => null);
  if (res && (res.ok || res.type === 'opaque')) await cache.put(url, res.clone());
  return res;
}
/* يقرأ ملفات CSS ويخزّن الخطوط/الأيقونات المشار إليها داخلها */
async function cacheCssAssets(cache, cssUrl, res) {
  try {
    const text = await res.clone().text();
    const urls = [...text.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map(m => m[1]).filter(u => !u.startsWith('data:'));
    await Promise.allSettled(urls.map(u => putCDN(cache, new URL(u, new URL(cssUrl, self.location.href).href).href)));
  } catch { }
}

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await Promise.allSettled(CORE.map(u => cache.add(u)));
    await Promise.allSettled(LIBS.map(async ([local, cdn]) => {
      let url = local, res = await fetch(local).then(r => (r.ok && !/html/i.test(r.headers.get('content-type') || '')) ? r : null).catch(() => null);
      if (res) await cache.put(local, res.clone()); else { url = cdn; res = await putCDN(cache, cdn); }
      if (res && res.ok && (/\.css$/.test(url) || url.includes('fonts.googleapis.com'))) await cacheCssAssets(cache, url, res);
    }));
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('pos-') && k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (!/^https?:$/.test(url.protocol)) return;

  // صفحة التطبيق: من الكاش فوراً (offline-first) مع التحديث بالخلفية
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const cached = (await cache.match('./index.html')) || (await cache.match('./'));
      const fresh = fetch(req).then(r => { if (r && r.ok) cache.put('./index.html', r.clone()); return r; }).catch(() => null);
      if (cached) { e.waitUntil(fresh); return cached; }
      return (await fresh) || new Response('<h1 dir="rtl">لا يوجد اتصال ولم يتم حفظ التطبيق بعد</h1>', { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 503 });
    })());
    return;
  }

  // باقي الملفات: الكاش أولاً ثم الشبكة مع حفظ النتيجة (stale-while-revalidate)
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const cached = await cache.match(req, { ignoreSearch: url.origin === location.origin ? false : true });
    const net = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) cache.put(req, r.clone()); return r; }).catch(() => null);
    if (cached) { e.waitUntil(net); return cached; }
    const r = await net;
    return r || new Response('', { status: 504, statusText: 'offline' });
  })());
});
