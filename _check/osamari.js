/* ★2026-10-08i カメラ「納まり資料作成」（本人のPDF「現場3D納まり」10枚どおり・§614）を端から端まで通す
   ①押したらすぐカメラ（説明の画面は出さない） ②写真の右に仕様の一覧 → 選んで「選択した仕様で納まりを作成する」
   ③対象エッジ（青）を引く ④増貼り材＝角に自動で形 → 実行で「実行済」・既存写真の小窓
   ⑤断熱材＝範囲をタップして閉じる → 高さ設定 → 確定 → 実行（工程表の「断熱材張付け」の行が光る） ⑥画像に書き出せる
   使い方: node _check/osamari.js [camera.html の代わり]   ※写真は検査の中で作る（PDFの消火器の台に似せた台） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'camera.html', SHOT=process.env.SHOT||'';
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,200):'')); if(!c)NG++;};
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 for(const [nm,opt] of [['スマホよこ',{viewport:{width:852,height:393},deviceScaleFactor:2,isMobile:true,hasTouch:true}],['PC',{viewport:{width:1440,height:900}}]]){
  const p=await b.newPage(opt); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/'+FILE); await p.waitForTimeout(1200);
  /* ① 押したらすぐカメラ */
  await p.evaluate(()=>{ window.__cam=0; const o=HTMLInputElement.prototype.click; HTMLInputElement.prototype.click=function(){ if(this.id==='osCam'&&this.getAttribute('capture')==='environment')window.__cam++; else return o.call(this); }; });
  await p.click('.nnEnCard >> nth=0');
  ok(nm+' ①納まり資料作成を押すとカメラが起動する', await p.evaluate(()=>window.__cam===1));
  ok(nm+' ①前の説明の画面（①撮影②エッジ③防水材・この機能でできること）は出ない', await p.evaluate(()=>{ const sb=document.getElementById('stepbar'), m=document.querySelector('body>main'); return (!sb||!sb.offsetParent)&&(!m||!m.offsetParent); }));
  /* 写真（台の角がある絵）を作って渡す */
  const src=await p.evaluate(()=>{ const c=document.createElement('canvas'); c.width=640; c.height=480; const g=c.getContext('2d');
    g.fillStyle='#8d8f8c'; g.fillRect(0,0,640,480); g.fillStyle='#b8b9b4'; g.beginPath(); g.moveTo(157,262); g.lineTo(297,323); g.lineTo(408,222); g.lineTo(408,190); g.lineTo(297,290); g.lineTo(157,230); g.closePath(); g.fill();
    g.fillStyle='#b8231f'; g.fillRect(195,70,95,190); return c.toDataURL('image/jpeg',0.9); });
  await p.evaluate(s=>nnOsOpen(s),src);
  await p.waitForFunction(()=>document.getElementById('osv').classList.contains('on')&&document.querySelectorAll('#osPn .spl tbody tr').length>0);
  /* ② 仕様の一覧 */
  const sp=await p.evaluate(()=>{ const rs=[...document.querySelectorAll('#osPn .spl tbody tr')]; return {n:rs.length, asi:rs.findIndex(r=>r.cells[2].textContent==='ASI-T1'), kind:(rs.find(r=>r.cells[2].textContent==='ASI-T1')||{cells:[0,{}]}).cells[1].textContent, img:!!document.querySelector('#osPn .spl tbody tr img'), dis:document.querySelector('#osPn .go').disabled}; });
  ok(nm+' ②写真の右に仕様の一覧（絵・防水種別・仕様番号）', sp.n>=50&&sp.asi>=0&&sp.img&&sp.kind==='トーチ', sp);
  ok(nm+' ②仕様を選ぶまで「作成する」は押せない', sp.dis);
  /* 防水種別の札で絞り込める（89件をスクロールしなくてよい） */
  await p.click('#osPn .chips button:has-text("トーチ")');
  const fl=await p.evaluate(()=>[...document.querySelectorAll('#osPn .spl tbody tr')].map(r=>r.cells[1].textContent));
  ok(nm+' ②防水種別の札で絞り込める（トーチだけ）', fl.length>=5&&fl.length<20&&fl.every(k=>k==='トーチ'), fl.length);
  const ai=await p.evaluate(()=>[...document.querySelectorAll('#osPn .spl tbody tr')].findIndex(r=>r.cells[2].textContent==='ASI-T1'));
  await p.click(`#osPn .spl tbody tr >> nth=${ai}`);
  await p.click('#osPn .go');
  const bd=await p.evaluate(()=>({cd:document.getElementById('osCd').textContent, nm:document.getElementById('osNm').textContent, rows:document.querySelectorAll('#osSt tr').length, vis:getComputedStyle(document.getElementById('osBd')).display!=='none', tiles:[...document.querySelectorAll('#osPn .mt span')].map(x=>x.textContent)}));
  ok(nm+' ②「ASI-T1 選定中」と工程表（5工程）が写真の右上に出る', bd.vis&&bd.cd==='ASI-T1'&&/絶縁断熱/.test(bd.nm)&&bd.rows===6, bd);
  ok(nm+' ②右に ASI-T1 の該当材料（プライマー・断熱材・防水シート・仕上塗料・増貼り材・ドレン）', ['プライマー','断熱材','防水シート','仕上塗料','増貼り材','ドレン'].every(t=>bd.tiles.includes(t)), bd.tiles);
  /* 写真の画素 → 画面（検査側で別に計算：枠に収める） */
  const scr=async(x,y)=>p.evaluate(([x,y])=>{ const r=document.getElementById('osCv').getBoundingClientRect(), s=Math.min(r.width/640,r.height/480); return {x:r.left+(r.width-640*s)/2+x*s, y:r.top+(r.height-480*s)/2+y*s}; },[x,y]);
  const tap=async(x,y)=>{ const q=await scr(x,y); await p.mouse.click(q.x,q.y); await p.waitForTimeout(60); };
  /* ③ 対象エッジ */
  await tap(157,262); await tap(297,323); await tap(408,222);
  const eg=await p.evaluate(()=>nnOsState().edge.map(q=>[Math.round(q.x),Math.round(q.y)]));
  ok(nm+' ③タップした所に対象エッジの点が乗る（3点・ずれ3px以内）', eg.length===3&&Math.abs(eg[1][0]-297)<=3&&Math.abs(eg[1][1]-323)<=3, eg);
  /* ④ 増貼り材 */
  const ti=async t=>p.evaluate(t=>[...document.querySelectorAll('#osPn .mt')].findIndex(x=>x.querySelector('span').textContent===t),t);
  await p.click(`#osPn .mt >> nth=${await ti('増貼り材')}`);
  const pre=await p.evaluate(()=>{ const c=nnOsState().cur; return {sh:c&&c.sh, n:c&&c.polys&&c.polys.length, sel:!!document.querySelector('#osPn .mt.sel'), lg:document.getElementById('osLg').textContent}; });
  ok(nm+' ④増貼り材を選ぶと角に形が出る（立上り2枚＋床2枚）・「選択中」・増貼りエッジの札', pre.sh==='patch'&&pre.n===4&&pre.sel&&/増貼りエッジ/.test(pre.lg), pre);
  const corner=await p.evaluate(()=>{ const ps=nnOsState().cur.polys; return ps.every(q=>q.p.some(v=>Math.abs(v.x-297)<1&&Math.abs(v.y-323)<1)); });
  ok(nm+' ④増貼りの4枚とも角（297,323）から出ている', corner);
  await p.click('#osPn .go');
  const r1=await p.evaluate(()=>({n:nnOsState().objs.length, done:[...document.querySelectorAll('#osPn .mt.done span')].map(x=>x.textContent), ins:getComputedStyle(document.getElementById('osIns')).display}));
  ok(nm+' ④実行で当たる・「実行済」・既存写真の小窓が出る', r1.n===1&&r1.done.includes('増貼り材')&&r1.ins==='block', r1);
  /* ⑤ 断熱材 */
  await p.click(`#osPn .mt >> nth=${await ti('断熱材')}`);
  const hl=await p.evaluate(()=>{ const r=document.querySelector('#osSt tr.hl'); return r?r.textContent:''; });
  ok(nm+' ⑤断熱材を選ぶと工程表の「断熱材張付け」の行が光る', /断熱材張付け/.test(hl), hl);
  await tap(300,330); await tap(420,236); await tap(560,300); await tap(430,420); await tap(300,330);
  const cl=await p.evaluate(()=>({c:nnOsState().cur.closed, hs:getComputedStyle(document.getElementById('osHs')).display}));
  ok(nm+' ⑤最初の点に戻ると範囲が閉じ、高さ設定が出る', cl.c&&cl.hs==='flex', cl);
  await p.selectOption('#osH','50'); await p.click('#osHok');
  ok(nm+' ⑤確定で高さ50mmの立体になる', await p.evaluate(()=>nnOsState().cur.h===50));
  if(SHOT) await p.screenshot({path:SHOT+'-'+(nm==='PC'?'pc':'ph')+'-pre.png'});
  await p.click('#osPn .go');
  const r2=await p.evaluate(()=>({n:nnOsState().objs.length, k:nnOsState().objs.map(o=>o.sh)}));
  ok(nm+' ⑤実行で断熱材が当たる', r2.n===2&&r2.k[1]==='volume', r2);
  if(SHOT) await p.screenshot({path:SHOT+'-'+(nm==='PC'?'pc':'ph')+'.png'});
  /* ⑥ 書き出し・はみ出し */
  const ex=await p.evaluate(()=>nnOsExport().length);
  ok(nm+' ⑥画像に書き出せる（送信・LINE用）', ex>20000, ex);
  ok(nm+' 画面からはみ出さない', await p.evaluate(()=>{ const v=document.getElementById('osv'), r=v.getBoundingClientRect(), q=[...v.querySelectorAll('.pn button')].filter(x=>x.offsetParent).every(x=>{const a=x.getBoundingClientRect(); return a.right<=r.right+1&&a.bottom<=r.bottom+1;}); return q; }));
  /* 戻る */
  await p.click('#osPn [data-a=back]');
  ok(nm+' 戻るで入口に戻る', await p.evaluate(()=>!document.getElementById('osv').classList.contains('on')&&!!document.querySelector('.nnEnCard').offsetParent));
  ok(nm+' JSエラーなし', !errs.length, errs.slice(0,2));
  await p.close();
 }
 await b.close(); console.log(NG?'★NG '+NG+'件':'全部○');
})();
