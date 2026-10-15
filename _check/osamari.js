/* ★2026-10-08i カメラ「納まり資料作成」（本人のPDF「現場3D納まり」10枚どおり・§614）を端から端まで通す
   ①押したらすぐカメラ（説明の画面は出さない） ②（§697）工法は選ばない：撮ったらすぐエッジの画面・材料の一覧・写真を選べる
   ③対象エッジ（青）を引く ④増貼り材＝角に自動で形 → 実行で「実行済」・既存写真の小窓
   ⑤ルーフィング＝範囲をタップして閉じる → 実行 ⑦回転（エッジ・材料も一緒に回る） ⑥画像に書き出せる
   使い方: node _check/osamari.js [camera.html の代わり]   ※写真は検査の中で作る（PDFの消火器の台に似せた台） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'camera.html', SHOT=process.env.SHOT||'';
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,200):'')); if(!c)NG++;};
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 try{ for(const [nm,opt] of [['スマホよこ',{viewport:{width:852,height:393},deviceScaleFactor:2,isMobile:true,hasTouch:true}],['PC',{viewport:{width:1440,height:900}}]]){
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
  await p.waitForFunction(()=>document.getElementById('osv').classList.contains('on')&&document.querySelectorAll('#osPn .mt').length>0,null,{timeout:8000}).catch(()=>{});
  /* ② ★§697 工法（仕様）は選ばない：撮ったらすぐエッジを引く画面・材料の一覧（本人「工法は不要」）・写真を選べる */
  const g2=await p.evaluate(()=>({spl:!!document.querySelector('#osPn .spl'), bd:getComputedStyle(document.getElementById('osBd')).display, pen:nnOsState().edgeOn, tiles:[...document.querySelectorAll('#osPn .mt span')].map(x=>x.textContent),
    pick:!!document.querySelector('#osPn [data-a=pick]'), pin:(()=>{ const i=document.getElementById('osPick'); return !!i&&!i.hasAttribute('capture')&&/image/.test(i.accept); })(), rot:!!document.getElementById('osRot')}));
  ok(nm+' ②仕様の一覧は出ず、すぐエッジを引く画面（ペンが入っている）', !g2.spl&&g2.bd==='none'&&g2.pen, g2);
  ok(nm+' ②材料：ルーフィング・増し貼り・塗布（塗膜）・コーキング・パッチ', ['ルーフィング','増し貼り','塗布（塗膜）','コーキング','パッチ'].every(t=>g2.tiles.includes(t)), g2.tiles);
  ok(nm+' ②「写真を選ぶ」（スマホの中の写真・カメラ固定でない）と回転のボタンがある', g2.pick&&g2.pin&&g2.rot, g2);
  /* 写真の画素 → 画面（検査側で別に計算：枠に収める） */
  const scr=async(x,y)=>p.evaluate(([x,y])=>{ const r=document.getElementById('osCv').getBoundingClientRect(), s=Math.min(r.width/640,r.height/480); return {x:r.left+(r.width-640*s)/2+x*s, y:r.top+(r.height-480*s)/2+y*s}; },[x,y]);
  const tap=async(x,y)=>{ const q=await scr(x,y); await p.mouse.click(q.x,q.y); await p.waitForTimeout(60); };
  /* ③ 対象エッジ */
  await tap(157,262); await tap(297,323); await tap(408,222);
  const eg=await p.evaluate(()=>nnOsState().edge.map(q=>[Math.round(q.x),Math.round(q.y)]));
  ok(nm+' ③タップした所に対象エッジの点が乗る（3点・ずれ3px以内）', eg.length===3&&Math.abs(eg[1][0]-297)<=3&&Math.abs(eg[1][1]-323)<=3, eg);
  /* ④ 増貼り材 */
  const ti=async t=>p.evaluate(t=>[...document.querySelectorAll('#osPn .mt')].findIndex(x=>x.querySelector('span').textContent===t),t);
  await p.click(`#osPn .mt >> nth=${await ti('増し貼り')}`);
  const pre=await p.evaluate(()=>{ const c=nnOsState().cur; return {sh:c&&c.sh, n:c&&c.polys&&c.polys.length, sel:!!document.querySelector('#osPn .mt.sel'), lg:document.getElementById('osLg').textContent}; });
  ok(nm+' ④増し貼りを選ぶと角に形が出る（立上り2枚＋床2枚）・「選択中」・増貼りエッジの札', pre.sh==='patch'&&pre.n===4&&pre.sel&&/増貼りエッジ/.test(pre.lg), pre);
  const corner=await p.evaluate(()=>{ const ps=nnOsState().cur.polys; return ps.every(q=>q.p.some(v=>Math.abs(v.x-297)<1&&Math.abs(v.y-323)<1)); });
  ok(nm+' ④増貼りの4枚とも角（297,323）から出ている', corner);
  await p.click('#osPn .go');
  const r1=await p.evaluate(()=>({n:nnOsState().objs.length, done:[...document.querySelectorAll('#osPn .mt.done span')].map(x=>x.textContent), ins:getComputedStyle(document.getElementById('osIns')).display}));
  ok(nm+' ④実行で当たる・「実行済」・既存写真の小窓が出る', r1.n===1&&r1.done.includes('増し貼り')&&r1.ins==='block', r1);
  /* ⑤ ルーフィング（範囲を貼る） */
  await p.click(`#osPn .mt >> nth=${await ti('ルーフィング')}`);
  await tap(300,330); await tap(420,236); await tap(560,300); await tap(430,420); await tap(300,330);
  const cl=await p.evaluate(()=>({c:nnOsState().cur&&nnOsState().cur.closed, sh:nnOsState().cur&&nnOsState().cur.sh}));
  ok(nm+' ⑤ルーフィング：最初の点に戻ると範囲が閉じる', cl.c&&cl.sh==='area', cl);
  if(SHOT) await p.screenshot({path:SHOT+'-'+(nm==='PC'?'pc':'ph')+'-pre.png'});
  await p.click('#osPn .go');
  const r2=await p.evaluate(()=>({n:nnOsState().objs.length, k:nnOsState().objs.map(o=>o.sh)}));
  ok(nm+' ⑤実行でルーフィングが当たる', r2.n===2&&r2.k[1]==='area', r2);
  if(SHOT) await p.screenshot({path:SHOT+'-'+(nm==='PC'?'pc':'ph')+'.png'});
  /* ⑦ ★§697 回転：右へ90度。写真の大きさが入れ替わり、エッジの角（297,323）と増し貼りの角が (480−323, 297)=(157,297) へ（検査側で計算） */
  await p.click('#osRot'); await p.waitForFunction(()=>nnOsState().W===480);
  const g7=await p.evaluate(()=>{ const S=nnOsState(); const e=S.edge[1]; return {W:S.W,H:S.H,e:[Math.round(e.x),Math.round(e.y)], patch:S.objs[0].polys.every(q=>q.p.some(v=>Math.abs(v.x-157)<1&&Math.abs(v.y-297)<1))}; });
  ok(nm+' ⑦回転：写真が縦横入れ替わり、エッジと材料も一緒に回る', g7.W===480&&g7.H===640&&g7.e[0]===157&&g7.e[1]===297&&g7.patch, g7);
  /* ⑥ 書き出し・はみ出し */
  const [nnW,nnH]=await p.evaluate(()=>[nnOsState().W,nnOsState().H]);
  const ex=await p.evaluate(()=>new Promise(r=>{ const u=nnOsExport(), im=new Image(); im.onload=()=>r({len:u.length,jpg:/^data:image\/jpeg/.test(u),w:im.naturalWidth,h:im.naturalHeight}); im.onerror=()=>r({len:u.length,bad:1}); im.src=u; }));
  ok(nm+' ⑥画像に書き出せる（送信・LINE用・写真と同じ大きさの JPEG）', ex.jpg&&ex.len>10000&&ex.w===nnW&&ex.h===nnH, ex);   /* ★§697 前は「2万文字以上」で見ていたが、工法の札を描かなくなって 19,547 に。大きさと形式で確かめる */
  ok(nm+' 画面からはみ出さない', await p.evaluate(()=>{ const v=document.getElementById('osv'), r=v.getBoundingClientRect(), q=[...v.querySelectorAll('.pn button')].filter(x=>x.offsetParent).every(x=>{const a=x.getBoundingClientRect(); return a.right<=r.right+1&&a.bottom<=r.bottom+1;}); return q; }));
  /* 戻る */
  await p.click('#osPn [data-a=back]');
  ok(nm+' 戻るで入口に戻る', await p.evaluate(()=>!document.getElementById('osv').classList.contains('on')&&!!document.querySelector('.nnEnCard').offsetParent));
  ok(nm+' JSエラーなし', !errs.length, errs.slice(0,2));
  await p.close();
 }
 }catch(e){ ok('検査が途中で止まった', false, String(e).slice(0,200)); }
 await b.close(); console.log(NG?'★NG '+NG+'件':'全部○');
})();
