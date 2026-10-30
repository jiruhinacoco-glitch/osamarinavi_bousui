/* 図面・積算の入口（2026-10-31n）：看板4つ（平面図・矩計図・Googleマップから・既存図面から）と、右上の「保存データ一覧」「初期詳細設定」。
   押したときの行き先まで確かめる。 node _check/zmentry.js [file] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const path=require('path'), fs=require('fs');
const file=process.argv[2]||'zumen_sekisan.html', root=path.resolve(__dirname,'..');
let ng=0; const ok=(t,c,d)=>{ console.log((c?'○ ':'★NG ')+t+(c?'':' '+JSON.stringify(d||''))); if(!c)ng++; };
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 for(const ph of [false,true]){
  const nm=ph?'スマホ':'PC';
  const ctx=await b.newContext(ph?{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}:{viewport:{width:1600,height:900}});
  const p=await ctx.newPage();
  await p.route('https://zmentry.test/**',async r=>{let f=decodeURIComponent(new URL(r.request().url()).pathname.slice(1)); if(f==='zumen_sekisan.html')f=file;
    const q=path.resolve(root,f); if(fs.existsSync(q)) r.fulfill({path:q}); else r.fulfill({status:404,body:''});});
  await p.goto('https://zmentry.test/zumen_sekisan.html'); await p.waitForFunction(()=>window.nnZMenuOn&&nnZMenuOn());
  const q=await p.evaluate(()=>{
    const r=e=>{const x=e.getBoundingClientRect();return {x:x.x,y:x.y,r:x.right,b:x.bottom,w:x.width,h:x.height};};
    const pk=[...document.querySelectorAll('#nnZMenu .zmPk')].filter(e=>e.offsetParent);
    const top=[...document.querySelectorAll('#nnZMenu .zmTop button')].filter(e=>e.offsetParent);
    const card=pk.map(r), vw=document.documentElement.clientWidth;
    return {n:pk.length, names:pk.map(e=>[...e.querySelectorAll('.pkT')].map(t=>t.dataset.t).join('')),
      top:top.map(e=>e.textContent.trim()), topR:top.map(r), card, vw,
      shadow:top.map(e=>getComputedStyle(e).boxShadow), oldFoot:document.querySelectorAll('#nnZMenu .zmFoot button').length,
      feat:pk.map(e=>e.querySelectorAll('.zmFeat .ft').length)};
  });
  ok(nm+'：看板は4つ・この順',q.n===4&&q.names.join('|')==='平面図作成|矩計図作成|Googleマップから平面図作成|既存図面から平面図作成',q.names);
  ok(nm+'：3つ目・4つ目にもできること（3D投影・積算＆見積・割付図）',q.feat[2]===3&&q.feat[3]===3,q.feat);
  ok(nm+'：右上に「保存データ一覧」「初期詳細設定」',q.top.join('|').replace(/[📂⚙]/gu,'')==='保存データ一覧|初期詳細設定'&&q.topR.every(t=>t.r>q.vw*0.6&&t.b<=q.card[0].y+40),q);
  ok(nm+'：右上のボタンに厚み（べた塗りの影）',q.shadow.every(s=>/0px [23]px 0px/.test(s)),q.shadow);
  ok(nm+'：下の小さいボタンの行は無い',q.oldFoot===0,q.oldFoot);
  ok(nm+'：看板どうしが重ならない',q.card.every((a,i)=>q.card.every((c,j)=>i>=j||a.b<=c.y+1||c.b<=a.y+1||a.r<=c.x+1||c.r<=a.x+1)),q.card);
  ok(nm+'：右上のボタンと看板の題名が重ならない',await p.evaluate(()=>{const T=[...document.querySelectorAll('#nnZMenu .zmTop button')].map(e=>e.getBoundingClientRect());
    return [...document.querySelectorAll('#nnZMenu .zmPk .pkT')].every(t=>{const a=t.getBoundingClientRect();return T.every(c=>a.bottom<=c.top||c.bottom<=a.top||a.right<=c.left||c.right<=a.left);});}));
  /* 4つ目：平面図の作図へ＋下絵の窓 */
  await p.locator('#nnZMenu .zmPk[data-go="kizon"]').click();
  await p.waitForFunction(()=>!nnZMenuOn()).catch(()=>{});
  const k=await p.evaluate(()=>{const u=document.getElementById('upanel');return {menu:nnZMenuOn(), up:!!(u&&u.classList.contains('nnFloat')&&u.offsetParent), tab:(typeof tab!=='undefined')?tab:null};});
  ok(nm+'：既存図面から→平面図の作図へ入り、下絵の窓が開く',!k.menu&&k.up&&k.tab==='zu',k);
  /* 右上：初期詳細設定 */
  await p.evaluate(()=>{ nnZMenuOpen(); });
  await p.locator('#nnZMenu .zmTop button[data-go="defs"]').click(); await p.waitForTimeout(300);
  ok(nm+'：初期詳細設定の窓が開く',await p.evaluate(()=>[...document.querySelectorAll('h5')].some(h=>h.textContent.includes('初期詳細設定')&&h.offsetParent)));
  /* 3つ目：地図へ */
  await p.goto('https://zmentry.test/zumen_sekisan.html'); await p.waitForFunction(()=>window.nnZMenuOn&&nnZMenuOn());
  await p.locator('#nnZMenu .zmPk[data-go="photo"]').click();
  let u=''; try{ await p.waitForURL(/genba_map_v36\.html\?zumenplan=1/,{timeout:5000}); u=p.url(); }catch(_){ u=p.url(); }
  ok(nm+'：Googleマップから→地図の平面図作成へ',/genba_map_v36\.html\?zumenplan=1/.test(u),u);
  await ctx.close();
 }
 await b.close(); console.log(ng?'★NG '+ng:'全部○');
})();
