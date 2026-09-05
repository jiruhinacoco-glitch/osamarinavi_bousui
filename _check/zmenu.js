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
  /* ★2026-08-31a 「自動でできる」の3枚は廃止。カードの中の「できること」の絵に置き換えた */
  feats:document.querySelectorAll('#nnZMenu .zmCard .zmFeat .ft').length,
  head :document.querySelectorAll('#nnZMenu .zmHead,#nnZMenu .zmSec,#nnZMenu .zmArrow,#nnZMenu .zmMini,#nnZMenu .st').length,
  agoIc:document.querySelectorAll('#nnZMenu .agoIc').length,
  foot :document.querySelectorAll('#nnZMenu .zmFoot button').length,
  tabs :getComputedStyle(document.getElementById('hdTabs')).display }));
ok(n.cards===2,'かくカードが2枚（平面図・矩計図）',n.cards);
ok(n.feats===5,'「できること」の絵がカードの中にある（①3つ＋②2つ・提出書類は削除）',n.feats);
ok(n.head===0,'説明の文（何をしますか／まず自分でかく／自動でできます）と状態の札は無い',n.head);
/* ★2026-08-31b 本人の指示：番号（①②）は付けない／機能の名前／「〇〇で対応可能な機能」の見出し／
   上の帯の一言（図面をかく → 数量・見積を自動算出）は削除 */
{
  const t=await p.evaluate(()=>{
    const tx=b=>[...b.childNodes].filter(x=>x.nodeType===3).map(x=>x.textContent).join('').trim();
    const bs=[...document.querySelectorAll('#nnZMenu .zmCard b.httl')];
    return {names:bs.map(tx),
      ftt:[...document.querySelectorAll('#nnZMenu .zmFeatBox .ftt')].map(x=>x.textContent),
      /* 絵文字は <i> の中なので、文字（テキストノード）だけを取り出す
         ★replace(/^\W+/,'') はダメ。日本語も \W に当たって全部消える */
      fts:[...document.querySelectorAll('#nnZMenu .zmFeat .ft')].map(tx),
      hco:(document.querySelector('header .hco')||{}).textContent||''};
  });
  ok(t.names.join('/')==='平面図作成/矩計図作成','カードの名前に番号（①②）が付いていない',t.names);
  ok(t.ftt.join('/')==='平面図作成で対応可能な機能/矩計図作成で対応可能な機能',
     '「〇〇作成で対応可能な機能」の見出しが出る',t.ftt);
  ok(t.fts.slice(0,3).join('/')==='3D投影/積算＆見積/割付図',
     '機能の名前（3D投影／積算＆見積／割付図）',t.fts.slice(0,3));
  ok(!/図面をかく/.test(t.hco),'上の緑帯の一言は削除されている',t.hco);
}
ok(n.foot===3,'下の行が3つ（保存データ一覧・初期詳細設定・写真から起こす）',n.foot);
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
/* ★2026-08-30g メニューはスクロールする作り（#nnZMenu が overflow:auto）。
   たてスマホは中身が1画面に入らないので「重ならないこと」では見られない。
   **いちばん下までスクロールしたとき、最後の行がナビの上に出るか**で見る
   （＝ナビの裏に永久に隠れる部分が無いか）。よこ・パソコンは1画面に収まる。 */
{
  const sc=await p.evaluate(()=>{
    const m=document.getElementById('nnZMenu');
    m.scrollTop=m.scrollHeight;
    return new Promise(r=>setTimeout(()=>{
      const f=document.querySelector('#nnZMenu .zmFoot')||document.querySelector('#nnZMenu .zmGrid3');
      const nav=document.getElementById('nav').getBoundingClientRect();
      /* ★パソコンはナビが画面の左のたて帯（§59）なので、隠れるかを見るのは下の帯のときだけ */
      const bottomBar = nav.width > innerWidth*0.5;
      const b=f.getBoundingClientRect();
      r({hidden:bottomBar?Math.round(Math.max(0,b.bottom-nav.top)):0, scrolled:m.scrollTop>0, bottomBar});
    },260));
  });
  ok(sc.hidden<=1,'いちばん下までスクロールすれば、最後の行まで見える（ナビに隠れない）',sc);
}
/* ★2026-08-30h よこ向きだけ ①② を約1.3倍に（本人の指示）。
   直す前は カード140px・タイトル12.5px だったので、そこから1.25倍以上あることで見る。 */
if(M==='land'){
  const big=await p.evaluate(()=>{
    const c=document.querySelector('#nnZMenu .zmCard');
    const t=document.querySelector('#nnZMenu .zmCard b.httl');
    return {card:Math.round(c.getBoundingClientRect().height), ttl:parseFloat(getComputedStyle(t).fontSize)};
  });
  /* ★2026-09-02i 「文字がデカすぎ・条件を足すので小さく」（本人の指示）で、よこ向きの1.3倍は撤回。
     いまはタイトル13px・カードは中身なり。ここでは「小さくなりすぎて読めない」の歯止めだけ見る。 */
  ok(big.card>=150 && big.card<=340,'よこ向き：①②のカードの背が妥当（150〜500px・2026-09-05b 表形式は1列なので縮めない。メニューはスクロールする）',big.card+'px');
  ok(big.ttl>=12 && big.ttl<=15,'よこ向き：タイトルは12〜15px（縮小後の決まり）',big.ttl+'px');
}
ok(fit.scrollX<=1,'メニューが横に伸びない',fit.scrollX);

/* ② 何も無いときは「できること」は使えない見た目・押すと①へ案内 */
const g=await p.evaluate(()=>[...document.querySelectorAll('#nnZMenu .zmFeat .ft')].map(e=>e.classList.contains('ready')));
ok(g.every(v=>!v),'図面が無いときは「できること」が全部「まだ」の見た目',g);
/* ★2026-09-01c 「対応可能な機能」は開示だけ＝押しても画面は動かない（本人の指示） */
await p.click('#nnZMenu .zmFeat .ft');           /* 3D投影 */
await p.waitForTimeout(300);
ok(await p.evaluate(()=>nnZMenuOn()&&tab==='zu'),'「できること」を押しても画面は動かない（開示だけ）');
ok(await p.evaluate(()=>document.querySelectorAll('#nnZMenu .zmFeat .ft[data-go]').length===0),
   '機能チップはリンクを持たない（data-goなし）');

/* ③ ↩戻るでメニューに戻る（ホームには行かない）。作図画面からの戻りを確かめる */
await p.evaluate(()=>{ nnZMenuClose(); setTab('zu'); }); await p.waitForTimeout(200);
await p.evaluate(()=>nnBack()); await p.waitForTimeout(400);
ok(await p.evaluate(()=>nnZMenuOn()),'↩戻るでメニューに戻る');
ok(p.url().indexOf('zumen_sekisan')>=0,'ホームには飛ばない');

/* ④ 図面をかくと、状態が変わる */
await p.evaluate(()=>{ nnZMenuClose(); const x=document.getElementById('tl_sample'); if(x)x.click(); });
await p.waitForTimeout(800);
await p.evaluate(()=>nnBack()); await p.waitForTimeout(400);
const st=await p.evaluate(()=>({
  ready:[...document.querySelectorAll('#nnZMenu .zmFeat .ft')].map(e=>e.classList.contains('ready')) }));
ok(st.ready.every(v=>v),'かいたら「できること」が全部使える見た目になる',st.ready);

/* ⑤ ①を押すと図面タブ・②を押すと断面タブ */
/* ★2026-08-30b カードの真ん中には設定（区分・躯体・防水）のプルダウンが並んだので、
   進むのは「▶ はじめる」を押す（カードの余白でも進むが、真ん中は設定の場所） */
await p.click('#nnZMenu .zmCard:nth-of-type(1) .zmGoB'); await p.waitForTimeout(400);
ok(!await p.evaluate(()=>nnZMenuOn()) && await p.evaluate(()=>tab==='zu'),'①で図面タブへ');
await p.evaluate(()=>nnBack()); await p.waitForTimeout(300);
await p.click('#nnZMenu .zmCard:nth-of-type(2) .zmGoB'); await p.waitForTimeout(500);
ok(await p.evaluate(()=>tab==='sec'),'②で断面タブへ',await p.evaluate(()=>tab));

/* ⑥ ★2026-09-01c 機能チップは開示だけ＝図面があっても押して画面は動かない */
await p.evaluate(()=>nnBack()); await p.waitForTimeout(300);
await p.click('#nnZMenu .zmCard:nth-of-type(1) .zmFeat .ft[data-feat="sekisan"]'); await p.waitForTimeout(400);
ok(await p.evaluate(()=>nnZMenuOn()),'図面があっても、機能チップを押して画面は動かない（開示だけ）');

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
