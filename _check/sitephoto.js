/* 現場写真ピン＝1台のスマホで写真と図面を完結（§315）
   ・図面の「撮った場所」をタップ→カメラの入力欄が開く→写真がピンとして貼り付く
   ・下絵／写真から起こす に「📷 撮る」（capture）が付いた
   ・現場記録帳の「写真」タブに、物件に紐づいた図面の写真が出る
   使い方: node _check/sitephoto.js（PC） / node _check/sitephoto.js ph（スマホたて） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const PH=process.argv[2]==='ph';
let ng=0; const ok=(c,m,x)=>{ if(!c)ng++; console.log((c?'  ○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); };
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await b.newContext(PH?{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}:{viewport:{width:1400,height:900}});
if(PH) await ctx.addInitScript(()=>{ try{Object.defineProperty(screen,'width',{get:()=>393}); Object.defineProperty(screen,'height',{get:()=>852});}catch(_){} });
/* 入力欄の click を見張る（本物のカメラは開けないので、どの欄が開こうとしたかだけ記録） */
await ctx.addInitScript(()=>{ window.__clicks=[]; const o=HTMLInputElement.prototype.click;
  HTMLInputElement.prototype.click=function(){ if(this.type==='file'){ window.__clicks.push(this.id||'(noid)'); return; } return o.apply(this,arguments); }; });
const p=await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
p.on('dialog',d=>d.accept());
await p.goto('http://127.0.0.1:8899/zumen_sekisan.html');
await p.evaluate(()=>{ try{ localStorage.removeItem('nn_zumen_photos_v1'); localStorage.removeItem('nn_zumen_cur'); }catch(_){} });
await p.reload(); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}}); await p.waitForTimeout(900);
/* ★スマホは下部ナビが5秒で自動的に隠れ、そのときキャンバスの高さが変わる（§274）。
   隠れきってキャンバスの中の画素数が実寸に合うまで待ってから測る。 */
if(PH){ await p.waitForFunction(()=>{ const cv=document.getElementById('cv'), r=cv.getBoundingClientRect(); const nav=document.querySelector('nav'); const nr=nav?nav.getBoundingClientRect():null;
  return (!nr||nr.top>=innerHeight-1) && Math.abs(cv.height-Math.round(r.height*devicePixelRatio))<=2; },{timeout:15000}); await p.waitForTimeout(400); }
const tap=async(x,y)=>{ if(PH){ await p.touchscreen.tap(x,y); } else { await p.mouse.click(x,y); } await p.waitForTimeout(250); };
const cvBox=async()=>await p.evaluate(()=>{ const r=document.getElementById('cv').getBoundingClientRect(); return {x:r.left,y:r.top,w:r.width,h:r.height}; });
const gridToClient=async(gx,gy)=>await p.evaluate(([gx,gy])=>{ const cv=document.getElementById('cv'), r=cv.getBoundingClientRect();
  const kx=(cv.width/devicePixelRatio)/r.width, ky=(cv.height/devicePixelRatio)/r.height; return {x:r.left+gx2px(gx)/kx, y:r.top+gy2px(gy)/ky}; },[gx,gy]);

/* ── ① 入口：条件ボタン・撮るボタン ── */
const s1=await p.evaluate(()=>{ const bar=document.getElementById('nnCondBar'); const bt=bar&&bar.querySelector('button[data-cond="sitephoto"]');
  const uc=document.getElementById('ufileCam'), pc=document.getElementById('nnPhFileCam');
  return {cond:!!bt, label:bt?bt.textContent.trim():'', ucap:uc&&uc.getAttribute('capture'), pcap:pc&&pc.getAttribute('capture'), phBtn:!!document.getElementById('nnPhCam'), fn:'function'}; });
ok(s1.cond && /現場写真/.test(s1.label), '① 平面図に「📷 現場写真」の条件ボタンが出る', s1.label);
ok(s1.ucap==='environment' && s1.pcap==='environment', '① 下絵／写真から起こす に カメラ直起動の入力欄（capture）がある', [s1.ucap,s1.pcap]);
ok(s1.phBtn, '① 写真から起こす に「📷 撮る」ボタン', s1.phBtn);
const d3hide=await p.evaluate(()=>{ setTab('d3'); nnCond.render(); const bar=document.getElementById('nnCondBar'); const r=!(bar&&bar.querySelector('button[data-cond="sitephoto"]')); setTab('zu'); nnCond.render(); return r; });
ok(d3hide, '① 3Dタブでは現場写真のボタンを出さない（平面図のときだけ）');
/* 下絵の「撮る」＝保存してからカメラの欄を開く */
const uc=await p.evaluate(()=>{ window.__clicks=[]; let saved=0; const _s=window.saveState; window.saveState=function(){ saved++; return _s.apply(this,arguments); };
  nnCamShoot('ufileCam'); window.saveState=_s; return {clicks:window.__clicks.slice(), saved}; });
ok(uc.clicks[0]==='ufileCam' && uc.saved>=1, '① 下絵「📷 撮る」＝図面を保存してからカメラの欄を開く', uc);
const pc=await p.evaluate(()=>{ window.__clicks=[]; nnPhotoOpen(); document.getElementById('nnPhCam').click(); const r=window.__clicks.slice(); document.getElementById('nnPhClose').click(); return r; });
ok(pc[0]==='nnPhFileCam', '① 写真から起こす「📷 撮る」＝カメラの欄を開く', pc);
const noimg=await p.evaluate(()=>{ nnUimgPanel(); const b=document.querySelector('#upanel .ucam'); const cs=getComputedStyle(b); const r=cs.display!=='none'; nnUimgPanel(); return r; });
ok(noimg, '① 下絵をまだ読んでいなくても「📷 撮る」が見える');

/* ── ② 置くモード → タップでピン → カメラが開く ── */
const m1=await p.evaluate(()=>{ nnCond.open('sitephoto'); const bt=document.getElementById('nnSpModeBtn'); if(!bt) return {nobtn:1};
  bt.click(); return {mode:nnSitePhotoModeOn(), tool:tool, hint:document.getElementById('nnSpHint').classList.contains('on'), boxOpen:document.getElementById('nnCondBox').classList.contains('on')}; });
ok(m1.mode && m1.tool==='none' && m1.hint && !m1.boxOpen, '② 「📍 置いて撮る」＝置くモード・道具なし・黄色い案内・小窓は閉じる', m1);
await p.evaluate(()=>{ window.__clicks=[]; });
const c1=await gridToClient(6,5);
await tap(c1.x,c1.y);
const pl=await p.evaluate(()=>{ const d=nnSitePhotoDbg(); return {n:d.pins.length, pin:d.pins[0], clicks:window.__clicks.slice(), pend:!!d.pend, mode:d.mode}; });
ok(pl.n===1 && pl.clicks[0]==='nnSpCam' && pl.pend && pl.mode, '② 図面をタップ＝ピンが置かれ、その場でカメラの欄が開く（モードは続く）', pl);
ok(pl.pin && Math.abs(pl.pin.x-6)<0.3 && Math.abs(pl.pin.y-5)<0.3, '② ピンはタップした場所（マス 6,5）', pl.pin);
/* 写真を渡す（本物のカメラの代わりに、ページの中で1600×1200の絵を作る） */
const mk=`(async()=>{ const c=document.createElement('canvas'); c.width=1600; c.height=1200; const g=c.getContext('2d');
  g.fillStyle='#7a8a6a'; g.fillRect(0,0,1600,1200); g.fillStyle='#c0392b'; g.fillRect(200,200,600,500);
  const bl=await new Promise(r=>c.toBlob(r,'image/jpeg',0.9)); return new File([bl],'IMG_0001.jpg',{type:'image/jpeg'}); })()`;
await p.evaluate(`${mk}.then(f=>nnSitePhotoGot(f))`);
await p.waitForTimeout(900);
const g1=await p.evaluate(()=>{ const d=nnSitePhotoDbg(); const id=d.pins[0].id, b=d.store[id]; let ls=null; try{ ls=JSON.parse(localStorage.getItem('nn_zumen_photos_v1')); }catch(_){}
  return {has:!!b, w:b&&b.w, h:b&&b.h, jpeg:!!(b&&/^data:image\/jpeg/.test(b.d)), kb:b?Math.round(b.d.length*0.75/1024):0, inLS:!!(ls&&ls[id]), pend:!!d.pend}; });
ok(g1.has && g1.w===800 && g1.h===600 && g1.jpeg, '② 写真は長辺800pxのJPEGに縮めて置き場に入る', g1);
ok(g1.kb>0 && g1.kb<160 && g1.inLS && !g1.pend, '② 端末（localStorage）に保存されている・1枚160KB以下', g1);
/* 図面に描かれている（ピンの緑と、番号の黄色） */
const px=await p.evaluate(()=>{ const d=nnSitePhotoDbg(), pin=d.pins[0]; const cv=document.getElementById('cv'), ctx=cv.getContext('2d');
  const k=devicePixelRatio, x=gx2px(pin.x), y=gy2px(pin.y);
  const at=(dx,dy)=>{ const q=ctx.getImageData(Math.round((x+dx)*k),Math.round((y+dy)*k),1,1).data; return [q[0],q[1],q[2]]; };
  return {body:at(-4,-1), badge:at(12,-10)}; });
ok(px.body[1]>80 && px.body[0]<90 && px.body[2]<110, '② ピン（緑のカメラ）が図面に描かれている', px.body);
ok(px.badge[0]>200 && px.badge[1]>180 && px.badge[2]<120, '② 番号の黄色い札が描かれている', px.badge);
/* 続けて2枚目 */
await p.evaluate(()=>{ window.__clicks=[]; });
const c2=await gridToClient(12,9); await tap(c2.x,c2.y);
await p.evaluate(`${mk}.then(f=>nnSitePhotoGot(f))`); await p.waitForTimeout(900);
const two=await p.evaluate(()=>{ const d=nnSitePhotoDbg(); return {n:d.pins.length, blobs:Object.keys(d.store).length, label:document.querySelector('#nnCondBar button[data-cond="sitephoto"]').textContent.trim()}; });
ok(two.n===2 && two.blobs===2 && /（2）/.test(two.label), '② 続けて2枚目が置ける・ボタンに枚数が出る', two);
/* やめる → 前の道具に戻る */
const ex=await p.evaluate(()=>{ document.getElementById('nnSpHintX').click(); return {mode:nnSitePhotoModeOn(), tool:tool, hint:document.getElementById('nnSpHint').classList.contains('on')}; });
ok(!ex.mode && ex.tool==='draw' && !ex.hint, '② 「やめる」＝モード終了・元の道具（描画）に戻る・案内が消える', ex);
/* モード中でも道具を変えたら終わる */
const ex2=await p.evaluate(()=>{ nnSitePhotoMode(true); setTool('sel',1); return {mode:nnSitePhotoModeOn(), tool:tool}; });
ok(!ex2.mode, '② モード中に道具のボタンを押したらモードは終わる', ex2);

/* ── ③ ピンをタップ＝大きく見る・メモ・削除 ── */
await p.evaluate(()=>{ setTool('sel'); draw(); });
const pc1=await gridToClient(6,5); await tap(pc1.x,pc1.y); await p.waitForTimeout(200);
const vw=await p.evaluate(()=>{ const v=document.getElementById('nnSpView'); const d=nnSitePhotoDbg(); const img=v&&v.querySelector('img');
  const bts=[...(v?v.querySelectorAll('.spb button'):[])].map(b=>{ const r=b.getBoundingClientRect(); return Math.round(Math.min(r.width,r.height)/(window.nnPZ||1)); });
  return {on:!!(v&&v.classList.contains('on')), img:!!(img&&img.src===d.store[d.pins[0].id].d), minBtn:Math.min.apply(null,bts.length?bts:[0]), nbt:bts.length, pins:d.pins.length}; });
ok(vw.on && vw.img && vw.pins===2, '③ ピンをタップ＝その写真が大きく開く（ピンは増えない）', vw);
ok(vw.nbt===5 && vw.minBtn>=38, '③ 撮り直す／アルバム／位置／削除／閉じる の5ボタン・指で押せる大きさ（38px以上）', vw);
const memo=await p.evaluate(()=>{ const ta=document.getElementById('nnSpMemo'); ta.value='ドレン廻り ひび割れ'; ta.dispatchEvent(new Event('change'));
  const d=nnSitePhotoDbg(); const id=d.pins[0].id; let ls=null; try{ ls=JSON.parse(localStorage.getItem('nn_zumen_photos_v1'))[id]; }catch(_){}
  let st=null; try{ st=JSON.parse(localStorage.getItem('nn_zumen_v1')).photos[0]; }catch(_){}
  return {pin:d.pins[0].memo, blob:d.store[id].memo, ls:ls&&ls.memo, st:st&&st.memo}; });
ok(memo.pin==='ドレン廻り ひび割れ' && memo.blob===memo.pin && memo.ls===memo.pin && memo.st===memo.pin, '③ メモが図面と写真の両方に残る', memo);
/* 撮り直す＝その写真のためにカメラが開く */
const rt=await p.evaluate(()=>{ window.__clicks=[]; document.querySelector('#nnSpView button[data-a="cam"]').click(); const d=nnSitePhotoDbg(); return {clicks:window.__clicks.slice(), pend:d.pend===d.pins[0].id, closed:!document.getElementById('nnSpView').classList.contains('on')}; });
ok(rt.clicks[0]==='nnSpCam' && rt.pend && rt.closed, '③ 「撮り直す」＝その写真のためにカメラが開く', rt);
await p.evaluate(()=>{ nnSitePhotoGot(null); });   /* 撮らずに戻った */
/* 位置を直す */
await tap(pc1.x,pc1.y); await p.waitForTimeout(200);
const mv0=await p.evaluate(()=>{ document.querySelector('#nnSpView button[data-a="move"]').click(); return {tool:tool, hint:document.getElementById('nnSpHint').textContent}; });
ok(/新しい場所/.test(mv0.hint) && mv0.tool==='none', '③ 「位置を直す」＝案内が出て、道具なしになる', mv0);
const c3=await gridToClient(3,9); await tap(c3.x,c3.y);
const mv1=await p.evaluate(()=>{ const d=nnSitePhotoDbg(); return {x:d.pins[0].x, y:d.pins[0].y, tool:tool, move:d.move}; });
ok(Math.abs(mv1.x-3)<0.3 && Math.abs(mv1.y-9)<0.3 && mv1.tool==='sel' && mv1.move==null, '③ タップした場所へ動き、道具が戻る', mv1);
/* ↩戻る＝位置が戻る */
const un=await p.evaluate(()=>{ undoStep(); const d=nnSitePhotoDbg(); return {x:d.pins[0].x, y:d.pins[0].y, n:d.pins.length}; });
ok(Math.abs(un.x-6)<0.3 && Math.abs(un.y-5)<0.3 && un.n===2, '③ ↩戻る でピンの位置が戻る', un);
/* 何も無い所を選択ツールでタップしてもピンは増えない・幽霊の指が残らない */
const c4=await gridToClient(16,3); await tap(c4.x,c4.y); await tap(c4.x+10,c4.y+10);
const gh=await p.evaluate(()=>({n:nnSitePhotoDbg().pins.length}));
ok(gh.n===2, '③ 選択ツールで空タップしてもピンは増えない', gh);

/* ── ④ 開き直しても残る・物件に紐づく・現場記録帳に出る ── */
await p.reload(); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}}); await p.waitForTimeout(900);
const rl=await p.evaluate(()=>{ const d=nnSitePhotoDbg(); return {n:d.pins.length, blobs:Object.keys(d.store).length, memo:d.pins[0]&&d.pins[0].memo}; });
ok(rl.n===2 && rl.blobs===2 && rl.memo==='ドレン廻り ひび割れ', '④ 開き直してもピン・写真・メモが残る', rl);
const sync=await p.evaluate(()=>{ localStorage.setItem('nn_zumen_cur', JSON.stringify({id:'t1',name:'検査',code:'J051',bukken:'サン太平レジデンス'})); saveState();
  const d=nnSitePhotoDbg(); return Object.keys(d.store).map(k=>d.store[k].code); });
ok(sync.length===2 && sync.every(c=>c==='J051'), '④ 物件に紐づけて保存すると、写真の側にも物件番号が書かれる', sync);
const k=await ctx.newPage(); const kerr=[]; k.on('pageerror',e=>kerr.push(e.message));
await k.goto('http://127.0.0.1:8899/kirokucho_demo.html'); await k.waitForTimeout(1200);
const kr=await k.evaluate(()=>{ const pr=props.find(x=>x.code==='J051'); if(!pr) return {nop:1}; selectedId=pr.id; curTab='写真'; try{ openDetailFull(); }catch(_){} renderDetail();
  const b=document.body.textContent; const th=[...document.querySelectorAll('#detail .thumb, .thumb')].filter(t=>t.querySelector('img')&&/^data:image/.test(t.querySelector('img').src));
  return {head:/図面で撮った写真（2枚）/.test(b), thumbs:th.length, memo:/ドレン廻り ひび割れ/.test(b)}; });
ok(kr.head && kr.thumbs===2 && kr.memo, '④ 現場記録帳の「写真」タブに図面で撮った写真が出る（メモつき）', kr);
const kz=await k.evaluate(()=>{ const t=[...document.querySelectorAll('.thumb')].find(t=>t.querySelector('img')&&/^data:image/.test(t.querySelector('img').src)); t.click(); const bx=document.getElementById('nnZuPhBox'); const r=!!bx; if(bx) bx.click(); return {open:r, closed:!document.getElementById('nnZuPhBox')}; });
ok(kz.open && kz.closed, '④ 写真をタップ＝大きく見る／もう一度で閉じる', kz);
const kother=await k.evaluate(()=>{ const pr=props.find(x=>x.code!=='J051'); selectedId=pr.id; curTab='写真'; renderDetail(); return !/図面で撮った写真/.test(document.body.innerText); });
ok(kother, '④ 別の物件の写真タブには出ない');
ok(kerr.length===0, '④ 現場記録帳にJSエラーなし', kerr);
await k.close();

/* ── ⑤ 削除・全削除・壊れた保存 ── */
const dl=await p.evaluate(()=>{ nnSitePhotoDel(0); const d=nnSitePhotoDbg(); let ls={}; try{ ls=JSON.parse(localStorage.getItem('nn_zumen_photos_v1')); }catch(_){}
  return {n:d.pins.length, blobs:Object.keys(d.store).length, ls:Object.keys(ls).length}; });
ok(dl.n===1 && dl.blobs===1 && dl.ls===1, '⑤ 削除＝ピンも写真の実体も消える（他の図面が使っていなければ）', dl);
const ca=await p.evaluate(()=>{ state.polys=[{pts:[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}],edges:[0,1,2,3].map(()=>({k:'para',h:300,w:250})),lv:0,name:'屋根①'}]; saveState();
  window.confirm=()=>true; clearAll(); const d=nnSitePhotoDbg(); return {polys:state.polys.length, n:d.pins.length, blobs:Object.keys(d.store).length}; });
ok(ca.polys===0 && ca.n===0 && ca.blobs===0, '⑤ 全削除で写真のピンも一緒に消える', ca);
await p.evaluate(()=>{ localStorage.setItem('nn_zumen_photos_v1','{"bad":1,"x":{"d":"nope"},"ok1":{"d":"data:image/jpeg;base64,/9j/","code":"J1"}}');
  const st=JSON.parse(localStorage.getItem('nn_zumen_v1')); st.photos=[null, 'x', {id:'ok1',x:1,y:2}, {id:'../evil',x:1,y:1}, {id:'nn',x:'a',y:2}]; localStorage.setItem('nn_zumen_v1',JSON.stringify(st)); });
await p.reload(); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}}); await p.waitForTimeout(900);
const jk=await p.evaluate(()=>{ const d=nnSitePhotoDbg(); return {n:d.pins.length, id:d.pins[0]&&d.pins[0].id, blobs:Object.keys(d.store)}; });
ok(jk.n===1 && jk.id==='ok1' && jk.blobs.length===1 && jk.blobs[0]==='ok1', '⑤ 壊れた保存は使える分だけ拾う（落ちない）', jk);
const e2=errs.filter(m=>!/404/.test(m));
ok(e2.length===0, 'JSエラーなし', e2);
await b.close();
console.log((ng?'★NG':'○')+' '+ng+'件  ('+(PH?'スマホ':'PC')+')');
process.exit(ng?1:0);
})().catch(e=>{ console.error(e); process.exit(2); });
