/* ============================================================
   納まりナビ サービスワーカー
   ------------------------------------------------------------
   目的：ページ移動を「通信なし」で一瞬にする。
   ・初回アクセス時に全ページと画像を端末の中に丸ごと保存する（プリキャッシュ）
   ・2回目以降は端末の中から即座に返すので、電波状況に関係なく瞬時に開く
   ・返した直後に裏で最新版を取りに行き、次回はそれが表示される
     （＝更新は「再読み込み2回」で反映される）
   ------------------------------------------------------------
   ★ページを大きく変えたときは CACHE の番号を1つ上げると、
     古い保存分を捨てて全部取り直します。
   ============================================================ */
const CACHE = 'nn-cache-v1';

const ASSETS = [
  './',
  './index.html',
  './kirokucho_demo.html',
  './genba_map_v36.html',
  './hacchu.html',
  './kokkosho.html',
  './camera.html',
  './library.html',
  './shiyo_toroku.html',
  './zairyo_toroku.html',
  './yougo.html',
  './common.css',
  './manifest.json',
  './images/bg_home.png',
  './icons/logo.png',
  './icons/title.png',
  './icons/nav_home.png',      './icons/nav_home_on.png',
  './icons/nav_kiroku.png',    './icons/nav_kiroku_on.png',
  './icons/nav_map.png',       './icons/nav_map_on.png',
  './icons/nav_hacchu.png',    './icons/nav_hacchu_on.png',
  './icons/nav_kokkou.png',    './icons/nav_kokkou_on.png',
  './icons/nav_camera.png',    './icons/nav_camera_on.png',
  './icons/nav_library.png',   './icons/nav_library_on.png',
  './icons/nav_zumen.png',     './icons/nav_zumen_on.png',
  './icons/nav_shiyou.png',    './icons/nav_shiyou_on.png',
  './icons/nav_yougo.png',     './icons/nav_yougo_on.png',
  './icons/nav_settei.png',    './icons/nav_settei_on.png',
];

/* 導入時：全部まとめて保存する（1つ失敗しても他は保存する） */
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(ASSETS.map(u => c.add(u).catch(() => {})));
    await self.skipWaiting();
  })());
});

/* 有効化時：古い版の保存分を捨てる */
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

/* 取得時：保存分があれば即返す＋裏で最新版を取り直す */
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return;   /* 外部（Webフォント等）は素通し */

  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(req, { ignoreSearch: true });
    const net = fetch(req).then(res => {
      if (res && res.status === 200 && res.type === 'basic') c.put(req, res.clone()).catch(() => {});
      return res;
    }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }        /* 保存分があれば通信を待たずに返す */
    return (await net) || new Response('', { status: 504 });
  })());
});

/* ページ側から「今すぐ全部保存して」と頼まれたときの処理 */
self.addEventListener('message', e => {
  if (e.data === 'nn-precache') {
    e.waitUntil((async () => {
      const c = await caches.open(CACHE);
      await Promise.all(ASSETS.map(u => c.add(u).catch(() => {})));
    })());
  }
});
