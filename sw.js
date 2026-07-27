/* ============================================================
   納まりナビ サービスワーカー
   ------------------------------------------------------------
   ★2026-07-28 方針変更（重要）
     以前は「端末に保存してある分を最優先で返す」作りだった。
     そのため、こちらでページを直して公開しても、スマホは
     自分の中に保存した古いページを出し続け、
     何度読み込んでも新しくならない状態になっていた。

     → ページ本体（HTML）は「まず取りに行く」方式に変更。
       ・電波があるとき ＝ 必ず最新のページが出る
       ・電波がないとき ＝ 保存してある分を出す（オフラインでも動く）
     → 画像・CSS・音などは今までどおり保存分を即返す（速い）。
       中身を変えたときは下の CACHE の番号を上げれば取り直す。
   ============================================================ */
const CACHE = 'nn-cache-v5';

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
  './icons/nav_move.wav',
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

/* ページ本体（HTML）かどうかの判定 */
function isPage(req, url) {
  return req.mode === 'navigate'
      || (req.headers.get('accept') || '').includes('text/html')
      || /\.html$/.test(url.pathname)
      || url.pathname.endsWith('/');
}

/* 導入時：全部まとめて保存する（1つ失敗しても他は保存する） */
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    /* 導入のときだけは必ず通信から取り直す（古い保存分を持ち越さない） */
    await Promise.all(ASSETS.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})));
    await self.skipWaiting();
  })());
});

/* 有効化時：古い版の保存分を全部捨てて、すぐこのページを担当する */
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return;   /* 外部（Webフォント等）は素通し */

  /* --- ページ本体：まず通信、だめなら保存分（＝電波があれば必ず最新が出る） --- */
  if (isPage(req, url)) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      try {
        const res = await fetch(req, { cache: 'no-store' });
        if (res && res.status === 200) c.put(req, res.clone()).catch(() => {});
        return res;
      } catch (_) {
        return (await c.match(req, { ignoreSearch: true }))
            || (await c.match('./index.html'))
            || new Response('', { status: 504 });
      }
    })());
    return;
  }

  /* --- 画像・CSS・音など：保存分を即返す＋裏で最新版を取り直す（速い） --- */
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(req, { ignoreSearch: true });
    const net = fetch(req).then(res => {
      if (res && res.status === 200 && res.type === 'basic') c.put(req, res.clone()).catch(() => {});
      return res;
    }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
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
