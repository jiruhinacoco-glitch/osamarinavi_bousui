/* ★2026-08-22a 図面・積算の入口メニュー（§151）
   node _check/zmenu.js        … パソコン
   node _check/zmenu.js ph     … スマホ たて
   node _check/zmenu.js land   … スマホ よこ
   前提： python3 -m http.server 8899 --directory <このフォルダ> */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const M=process.argv[2]||'pc';
const VP={pc:{width:1600,height:900}, ph:{width:393,height:852}, land:{width:852,height:393}}[M];
const MOB=M!=='pc';
const URL='http://localhost:8899/zumen_sekisan.html';
let ng=0; const ok=(c,m,d)=>{ console.log((c?'  ○ ':'  ★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):'')); if(!c)ng++; };

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await b.newContext(MOB?{viewport:VP,deviceScaleFactor:2,isMobile:true,hasTouch:true}:{viewport:VP});
if(MOB) await ctx.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});
                                     Object.defineProperty(screen,'height',{get:()=>852});});
const p=await ctx.newPage(); p.on('dialog',d=>d.accept());
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
console.log('== '+({pc:'パソコン',ph:'スマホ たて',land:'スマホ よこ'}[M])+' ==');
await p.goto(URL,{waitUntil:'load'}); await p.waitForTimeout(1500);

/* ① 開いたらメニューが出る */
ok(await p.evaluate(()=>nnZMenuOn()),'開くとメニューが出る（いきなり作図画面にならない）');
const n=await p.evaluate(()=>({
  cards:document.querySelectorAll('#nnZMenu .zmCard').length,
  minis:document.querySelectorAll('#nnZMenu .zmMini').length,
  foot :document.querySelectorAll('#nnZMenu .zmFoot button').length,
  tabs :getComputedStyle(document.getElementById('hdTabs')).display }));
ok(n.cards===2,'かくカードが2枚（平面図・矩計図）',n.cards);
ok(n.minis===3,'自動でできるカードが3枚（3D・積算・提出書類）',n.minis);
ok(n.foot===2,'下の行が2つ（保存した図面を開く・写真から起こす）',n.foot);
ok(n.tabs==='none','メニュー中はタブ（①図面…）を出さない',n.tabs);
/* 画面に収まる・ナビと重ならない */
const fit=await p.evaluate(()=>{
  const m=document.getElementById('nnZMenu'), w=document.querySelector('.zmWrap').getBoundingClientRect();
  const nav=document.getElementById('nav').getBoundingClientRect();
  /* ★パソコンはナビが画面の左のたて帯（§59）なので、重なりを見るのは下の帯のときだけ */
  const bottomBar = nav.width > innerWidth*0.5;
  return {over:Math.max(0,Math.round(w.right-m.getBoundingClientRect().right)),
          navHit:bottomBar?Math.round(Math.max(0,w.bottom-nav.top)):0,
          /* ★よこ向きの 361px は元からの仕様（#side＝画面外に隠してある引き出し・§104）。
             ページ全体ではなく、メニュー自身がはみ出していないかを見る。 */
          scrollX:m.scrollWidth-m.clientWidth};});
ok(fit.over<=1,'横にはみ出さない',fit.over);
ok(fit.navHit<=0,'下部ナビと重ならない',fit.navHit);
ok(fit.scrollX<=1,'メニューが横に伸びない',fit.scrollX);

/* ② 何も無いときは「自動でできる」は使えない見た目・押すと①へ案内 */
const g=await p.evaluate(()=>[...document.querySelectorAll('#nnZMenu .zmMini')].map(e=>e.classList.contains('ready')));
ok(g.every(v=>!v),'図面が無いときは3枚とも「まだ」の見た目',g);
await p.click('#nnZMenu .zmMini');           /* 3Dで見る */
await p.waitForTimeout(400);
ok(await p.evaluate(()=>tab==='zu'),'図面が無いのに3Dを押したら、①図面へ案内する',await p.evaluate(()=>tab));
ok(await p.evaluate(()=>tool==='draw'),'そのまま描けるように「描画」になる');

/* ③ ↩戻るでメニューに戻る（ホームには行かない） */
await p.evaluate(()=>nnBack()); await p.waitForTimeout(400);
ok(await p.evaluate(()=>nnZMenuOn()),'↩戻るでメニューに戻る');
ok(p.url().indexOf('zumen_sekisan')>=0,'ホームには飛ばない');

/* ④ 図面をかくと、状態が変わる */
await p.evaluate(()=>{ nnZMenuClose(); const x=document.getElementById('tl_sample'); if(x)x.click(); });
await p.waitForTimeout(800);
await p.evaluate(()=>nnBack()); await p.waitForTimeout(400);
const st=await p.evaluate(()=>({
  s1:document.getElementById('zmS1').textContent,
  ok1:document.getElementById('zmS1').classList.contains('ok'),
  ready:[...document.querySelectorAll('#nnZMenu .zmMini')].map(e=>e.classList.contains('ready')),
  s4:document.getElementById('zmS4').textContent }));
ok(st.ok1 && /屋根\s*3面/.test(st.s1),'①に「✓ 屋根3面／◯㎡」が出る',st.s1);
ok(st.ready.every(v=>v),'3枚とも使える見た目になる',st.ready);
ok(/¥[\d,]+/.test(st.s4),'積算に概算金額が出る',st.s4);

/* ⑤ ①を押すと図面タブ・②を押すと断面タブ */
/* ★2026-08-30b カードの真ん中には設定（区分・躯体・防水）のプルダウンが並んだので、
   進むのは「▶ はじめる」を押す（カードの余白でも進むが、真ん中は設定の場所） */
await p.click('#nnZMenu .zmCard:nth-of-type(1) .zmGoB'); await p.waitForTimeout(400);
ok(!await p.evaluate(()=>nnZMenuOn()) && await p.evaluate(()=>tab==='zu'),'①で図面タブへ');
await p.evaluate(()=>nnBack()); await p.waitForTimeout(300);
await p.click('#nnZMenu .zmCard:nth-of-type(2) .zmGoB'); await p.waitForTimeout(500);
ok(await p.evaluate(()=>tab==='sec'),'②で断面タブへ',await p.evaluate(()=>tab));

/* ⑥ 積算・提出書類は右パネルを開く */
await p.evaluate(()=>nnBack()); await p.waitForTimeout(300);
await p.click('#nnZMenu .zmMini:nth-of-type(2)'); await p.waitForTimeout(500);
ok(await p.evaluate(()=>document.getElementById('side').classList.contains('open')||
    document.documentElement.getAttribute('data-nnphone')!=='1'),'積算を押すと右パネル（引き出し）が開く');

/* ⑦ アイソメ図のボタンは外してある（本人の指示） */
ok(await p.evaluate(()=>!document.getElementById('nnIsoBtn')),'施工層構成図（アイソメ）のボタンは無い');
ok(await p.evaluate(()=>!!document.getElementById('nnPlanBtn')&&!!document.getElementById('nnSectBtn')
   &&!!document.getElementById('nnWariBtn')),'平面図・断面詳細図・割付図のボタンは残っている');

/* ⑧ 用事つきのリンク（写真から起こす）はメニューを出さない */
const p2=await ctx.newPage(); p2.on('dialog',d=>d.accept());
await p2.goto(URL+'?photo=1',{waitUntil:'load'}); await p2.waitForTimeout(1500);
ok(!await p2.evaluate(()=>nnZMenuOn()),'?photo=1 のときはメニューを出さない');
await p2.close();

ok(errs.length===0,'JSエラーなし  '+errs.slice(0,2).join(' / '));
await p.screenshot({path:'/tmp/zmenu_'+M+'.png'});
await b.close();
console.log(ng?('★NG '+ng+'件'):'全部○');
process.exit(ng?1:0);
})();
