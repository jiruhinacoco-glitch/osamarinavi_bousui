/* スマホの現場詳細に、パソコンの進化が届いているか（2026-11-14h）。直す前の版では★NG。
   ・「概要」の先頭に 全体の絵（番号つき）・屋根の一覧・まとめ が出て、横にはみ出さない／ほかのタブでは出ない
   ・1段目に「＋ 作る」→ 一覧が画面の中に開く
   ・「拡大」の画面で、絵と表の両方が画面の中にある
   ・進行状況：済んだ段階に ✓ は出さない（11-14zp で廃止。前は ✓ を付けていた）
   ・パソコンは今までどおり（.lay2 の組み替え・スマホ用の入れ物は作らない）
   使い方: node _check/splay.js [kirokucho_demo.html]   （http://localhost:8899 が要る） */
const {chromium,devices}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html'; let NG=0;
const ok=(c,n,d)=>{console.log((c?'○':'★NG')+' '+n+(d!==undefined?'  '+JSON.stringify(d):'')); if(!c)NG++;};
/* 見本データには全体の絵・屋根ごとの入力が無いので、検査の中で屋根4つ（番号の位置つき）を入れる */
const SEED=()=>{const x=props[0]; const ko=nnKoList(x)[0].ko; x.status='契約済';
  x.areas=[['A棟：屋上',120,''],['A棟：塔屋',37,''],['B棟：屋上',80,'三浦防水'],['渡り廊下',20,'']].map((a,i)=>({n:a[0],ko:ko,gz:a[2],items:[{k:'平場',q:a[1],u:'㎡'}],px:0.2+0.18*i,py:0.3+0.13*(i%3)}));
  window.nnPhoto2Of=()=> 'icons/nav_map.png'; goProperty(x.id); return x.id;};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
{const ctx=await b.newContext({...devices['iPhone 13']});
 await ctx.addInitScript(()=>{try{localStorage.setItem('nn_view_mode','mobile')}catch(e){}});
 const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
 await p.goto('http://localhost:8899/'+FILE); await p.waitForFunction(()=>typeof goProperty==='function'&&typeof props!=='undefined'); await p.waitForTimeout(1500);
 await p.evaluate(SEED); await p.waitForFunction(()=>document.querySelectorAll('#detail .dmenu button').length>=6); await p.waitForTimeout(600);
 const M=()=>p.evaluate(()=>{const D=document.getElementById('detail'),g=D.querySelector(':scope > .dgai.sp'),vw=document.documentElement.clientWidth;
   const R=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height)};};
   const tb=document.getElementById('tabbody');
   return {vw,g:R(g),img:g&&R(g.querySelector('.dtimg')),pins:g?[...g.querySelectorAll('.pinx > b')].filter(e=>e.getBoundingClientRect().width>0).length:0,
     rows:g?[...g.querySelectorAll('.dtr')].map(R):[],sum:g&&R(g.querySelector('.dtsum')),tb:R(tb),sw:D.scrollWidth,cw:D.clientWidth,
     cut:g?[...g.querySelectorAll('.dtr > *, .dtsum b')].filter(e=>e.scrollWidth>e.clientWidth+1).length:-1,
     mk:R(D.querySelector('.drh .mkb')),chk:(()=>{const e=D.querySelector('.drailp .rail > span.past');return e?getComputedStyle(e,'::before').content:'';})()};});
 /* 番号は絵が読み込まれてから並ぶ → 時間ではなく条件で待つ */
 await p.waitForFunction(()=>[...document.querySelectorAll('#detail > .dgai.sp .pinx > b')].filter(e=>e.getBoundingClientRect().width>0).length>=4,null,{timeout:5000}).catch(()=>{});
 let m=await M();
 ok(m.g&&m.g.h>200,'「概要」に、全体の絵と屋根の一覧の入れ物が出ている',m.g);
 ok(m.img&&m.img.w>=300&&m.img.h>=150,'全体の絵が画面の幅いっぱいに出ている',m.img);
 ok(m.pins===4,'絵の上に屋根の番号が4つ出ている',m.pins);
 ok(m.rows.length===4&&m.rows.every(r=>r.h>=40&&r.x>=0&&r.x+r.w<=m.vw),'屋根の一覧が4行・指で押せる高さ（40px以上）・画面の中',m.rows.map(r=>[r.w,r.h]));
 ok(m.cut===0,'一覧・まとめの字が欄からはみ出して切れていない',m.cut);
 ok(m.sum&&m.sum.x>=0&&m.sum.x+m.sum.w<=m.vw,'まとめ（屋根数・仕様…）が画面の中',m.sum);
 ok(m.g&&m.tb&&m.g.y<m.tb.y,'全体の絵は、発注状況などの中身より上にある',[m.g&&m.g.y,m.tb&&m.tb.y]);
 ok(m.sw<=m.cw+1,'横にはみ出していない（横に送れない）',[m.sw,m.cw]);
 /* ★2026-11-14zp 本人「小さな ✔ いらない。削除して」→ スマホ表示では ✓ を出さない（済んだ段階は緑の札・これからは灰色の札で見分ける） */
 ok(!/✓/.test(m.chk),'進行状況：済んだ段階に ✓ は出さない（スマホ表示・11-14zp で廃止）',m.chk);
 /* ＋ 作る */
 ok(!!m.mk&&m.mk.w>0,'1段目に「＋ 作る」がある',m.mk);
 if(m.mk&&m.mk.w>0){ await p.evaluate(()=>{document.getElementById('detail').scrollTop=0;}); await p.waitForTimeout(200); m=await M();
   await p.touchscreen.tap(m.mk.x+m.mk.w/2,m.mk.y+m.mk.h/2); await p.waitForFunction(()=>!!document.getElementById('nnMk'),null,{timeout:3000}).catch(()=>{});
   const k=await p.evaluate(()=>{const e=document.getElementById('nnMk'); if(!e)return null; const r=e.getBoundingClientRect(); return {x:Math.round(r.left),r:Math.round(r.right),n:e.querySelectorAll('button').length,vw:document.documentElement.clientWidth};});
   ok(k&&k.n===6&&k.x>=0&&k.r<=k.vw,'「＋ 作る」を押すと、6つの入口が画面の中に開く',k);
   await p.evaluate(()=>{const e=document.getElementById('nnMk'); if(e) e.remove();}); }
 /* 屋根の行を押す → その屋根の写真へ（写真タブ） */
 /* ほかのタブでは出ない */
 await p.evaluate(()=>setTab('写真')); await p.waitForTimeout(400); m=await M();
 ok(!m.g||m.g.h===0,'「写真」タブでは、全体の絵の入れ物は出ない',m.g);
 await p.evaluate(()=>setTab('概要')); await p.waitForTimeout(400);
 /* 拡大の画面 */
 await p.evaluate(()=>nnRoofBig(props[0].id,'view')); await p.waitForFunction(()=>{const w=document.querySelector('#nnCap .capw');return w&&w.getBoundingClientRect().width>50;},null,{timeout:4000}).catch(()=>{});
 const c=await p.evaluate(()=>{const o=document.getElementById('nnCap'); if(!o) return null; const vw=document.documentElement.clientWidth,vh=document.documentElement.clientHeight;
   const R=s=>{const e=o.querySelector(s); if(!e) return null; const r=e.getBoundingClientRect();return {x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height)};};
   return {vw,vh,img:R('.capw'),side:R('.capside'),bt:[...o.querySelectorAll('.capbt > button')].filter(e=>!e.hidden).map(e=>{const r=e.getBoundingClientRect();return [Math.round(r.left),Math.round(r.right)];})};});
 const inside=q=>q&&q.w>100&&q.h>80&&q.x>=0&&q.x+q.w<=c.vw&&q.y>=0&&q.y+q.h<=c.vh;
 ok(c&&inside(c.img),'拡大の画面：絵が画面の中に見えている',c&&c.img);
 ok(c&&inside(c.side),'拡大の画面：屋根の内訳の表が画面の中に見えている',c&&c.side);
 ok(c&&c.bt.length>=2&&c.bt.every(q=>q[0]>=0&&q[1]<=c.vw),'拡大の画面：ボタンが全部 画面の中',c&&c.bt);
 ok(errs.length===0,'エラーが出ていない（スマホ）',errs.slice(0,3));
 await ctx.close();}
/* ---- パソコンは今までどおり ---- */
{const ctx=await b.newContext({viewport:{width:1583,height:790}}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
 await p.goto('http://localhost:8899/'+FILE); await p.waitForFunction(()=>typeof goProperty==='function'&&typeof props!=='undefined'); await p.waitForTimeout(1500);
 await p.evaluate(SEED); await p.waitForTimeout(800);
 const r=await p.evaluate(()=>{const D=document.getElementById('detail');return {lay2:D.classList.contains('lay2'),sp:!!D.querySelector('.dgai.sp'),gai:!!D.querySelector(':scope > .dgai'),copied:!!document.getElementById('nn-splay-copied'),mkb:D.querySelectorAll('.mkb').length,vis:[...D.querySelectorAll('.mkb')].filter(e=>e.getBoundingClientRect().width>0).length};});
 ok(r.lay2&&r.gai&&!r.sp&&!r.copied,'パソコン：組み替えは今までどおり・スマホ用の入れ物や写した決まりは作らない',r);
 ok(r.vis===1,'パソコン：「＋ 作る」は見えているものが1つだけ',r);
 ok(errs.length===0,'エラーが出ていない（パソコン）',errs.slice(0,3));
 await ctx.close();}
await b.close(); console.log(NG?'★NG '+NG+'件':'すべて○'); process.exit(NG?1:0);
})();
