/* ============================================================
   納まりナビ サービスワーカー
   ------------------------------------------------------------
   ★2026-07-28
     すべて「端末に保存してある分を即返す」＝通信を待たないので一瞬で開く。
     新しい版への切り替えは、この CACHE の番号を上げることで行う。
     番号が変わると、
       ①新しい保存一式を作り直し（通信から取り直す）
       ②古い保存分を全部捨て
       ③ページ側が自動で1回読み込み直す（各HTMLの controllerchange）
     ので、こちらの修正が確実に端末へ届く。
     ★ページを直したら、必ずこの番号を1つ上げること。
   ============================================================ */
const CACHE = 'nn-cache-v221';

const ASSETS = [
  './icons/btn_d3_zin.png', './icons/btn_d3_zout.png', './icons/btn_d3_rl.png', './icons/btn_d3_rr.png',
  './icons/btn_d3_tup.png', './icons/btn_d3_tdn.png',
  './icons/btn_d3_plan.png', './icons/btn_d3_iso.png',
  './hacchu_sites.js',
  './icons/lib_th_L1.png',
  './icons/lib_th_L2.png',
  './icons/lib_th_L3.png',
  './icons/lib_th_L4.png',
  './icons/lib_th_L5.png',
  './icons/lib_th_L6.png',
  './icons/lib_th_L7.png',
  './icons/lib_th_L8.png',

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
  './zumen_sekisan.html',
  './common.css',
  './faces_sample.js',
  './manifest.json',
  /* ver.txt は毎回通信で確認するので、あえて保存しない */
  './images/bg_home.webp',
  './vendor/three.min.js',
  './icons/frame_c_tl.png', './icons/frame_c_tr.png', './icons/frame_c_bl.png', './icons/frame_c_br.png',
  './icons/def_fukure.png', './icons/def_kuchiaki.png', './icons/def_shokubutsu.png',
  './icons/hpic_hou.png', './icons/hpic_bugakari.png',
  './icons/hpic_sekou.png', './icons/hpic_status.png', './icons/hpic_nyukin.png',
  './icons/hpic_yojitsu.png', './icons/hpic_taio.png', './icons/hpic_juchu.png',
  './icons/hpic_tsukibetsu.png',
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
  /* 各ページの見出し画像とアイコン（2026-07-30 追加） */
  './icons/title_hacchu.png',  './icons/icon_hacchu.png',
  './icons/title_camera.png',  './icons/icon_camera.png',
  './icons/title_kokkou.png',  './icons/icon_kokkou.png',
  './icons/title_library.png', './icons/icon_library.png',
  './icons/title_shiyou.png',  './icons/icon_shiyou.png',
  './icons/title_map.png',     './icons/icon_map.png',
  './icons/title_zumen.png',
  /* 左上の戻るボタン（2026-07-30 追加） */
  './icons/btn_back.png',      './icons/btn_menu.png',
  './icons/btn_ang.png','./icons/btn_draw.png','./icons/btn_rect.png','./icons/btn_pan.png',
  './icons/btn_clear.png','./icons/btn_del.png','./icons/btn_dims.png','./icons/btn_sel.png','./icons/btn_grid.png',
  './icons/btn_split.png','./icons/btn_2pane.png',
  './icons/btn_wari_h.png','./icons/btn_wari_v.png','./icons/btn_hole.png',
  './icons/btn_p_hikomi.png','./icons/btn_p_oshidashi.png','./icons/btn_p_kasagi.png',
  './icons/btn_p_dakki.png','./icons/btn_p_tatedrain.png','./icons/btn_p_yokodrain.png',
  './icons/btn_night.png','./icons/btn_day.png','./icons/btn_photo.png',
  './icons/btn_sample.png','./icons/btn_save.png',
  './icons/btn_undo.png','./icons/btn_redo.png',
  './icons/roofph_1.jpg','./icons/roofph_2.jpg','./icons/roofph_3.jpg',
  './icons/roofph_4.jpg','./icons/roofph_5.jpg','./icons/roofph_6.jpg',
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
  if (url.pathname.endsWith('/ver.txt')) return;      /* 版の確認は必ず通信で（素通し） */

  /* --- ページ本体：保存分があれば通信を待たずに即返す（＝一瞬で開く） ---
     ★2026-07-28 再修正：一度「まず通信で取りに行く」方式にしたが、
       1ページ約300KBを毎回スマホの回線で取り直すことになり、
       開くのがかえって遅くなった。保存分を即返す方式に戻す。
       新しい版への切り替えは、下の「版が変わったら自動で入れ替える」
       仕組み（CACHE番号の更新＋ページ側の自動再読み込み）で行う。 */
  if (isPage(req, url)) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      const hit = await c.match(req, { ignoreSearch: true });
      /* ★保存分があれば、裏で取り直すこともしない（2026-07-28）。
         1ページ約300KBを毎回こっそり通信で落としており、
         その通信と処理が、画面を組み立てる作業と取り合って遅くしていた。
         新しい版への入れ替えは ver.txt の確認だけで行う（数バイト）。 */
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res && res.status === 200) c.put(req, res.clone()).catch(() => {});
        return res;
      } catch (_) {
        return (await c.match('./index.html')) || new Response('', { status: 504 });
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
